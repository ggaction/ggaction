# Named-dataset lookup

## 진행 상태

- [x] 두 원본 표를 보존해야 하는 실제 데이터 변환 요구 확인
- [x] 현재 공개 액션 누락 재현 및 구체적 API·DAG·저장·검증 설계
- [x] 진행 중인 범위의 직접 사용자 상시 승인 재사용
- [x] 구현·타입·현재 계약·문서·예제 동기화
- [ ] 데이터·revision·facet·persistence·package·기존 출력 검증
- [ ] 검증된 로컬 후보 설치와 원본 번역 재개
- [ ] 200개 단위 공개 릴리즈 검증 후 이슈 종료

## 문제

이름으로 연결되는 두 표에서 부가 필드를 가져오는 공개 변환이 없다.
예를 들어 첫 표는 `group, person`, 두 번째 표는 `name, age, height`를 가진다.
첫 표의 9개 행을 유지하며 `person == name`인 행의 `age, height`를 복사한 뒤,
그룹별 나이 평균 32, 86/3, 56을 기존 BarPlot으로 그려야 한다.
현재 `chart().createLookupData`는 `undefined`다.

원본 표를 미리 합쳐 교체하거나 코드의 조건문에 나이를 하드코딩하는 방식은 사용하지 않는다.
두 원본 표, 각 행의 키/타입/순서, 연결 정의와 양쪽 입력 의존성을 보존한다.

## 승인

Gate 상태: **approved**. 직접 사용자의 진행 중인 작업 지시를 재사용한다.

> 지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자

이 범위의 후속 공개 API와 저장/의존성 설계를 구체화한 뒤 구현하며 승인 질문을 반복하지 않는다.
이미지 수동 검토나 개별 수동 시각 승인이 있었다고 주장하지 않는다.
이 변경은 새로운 마크/renderer 기하를 만들지 않는다. 기존 BarPlot의 검증된 표현을 재사용하고,
연결 전 표와 독립적인 연결 완료 표가 같은 기존 concrete graphics/decoded pixels를 내는지 검증한다.
공개 npm/docs/dataset 배포는 현재 1213개에서 다음 1413개 완료 시점에 묶는다.
현재 성공 수는 1297개이며 이 기능이 필요한 원본은 미승인 입력이 아니라 **미구현 기능으로 번역 보류** 상태다.

## 공개 API

새 renderer primitive 없이 기존 derived-data 계층에 다음을 추가한다.

```js
chart()
  .createData({ id: "people", values: people })
  .createData({ id: "groups", values: groups })
  .createLookupData({
    id: "ages",
    field: "person",
    lookup: { data: "people", key: "name", fields: ["age", "height"] }
  });
```

`createLookupData({ id, source?, field, lookup })`:

- `id`: 필수 derived dataset ID. 기존 creator와 같은 ID/충돌 규칙을 사용한다.
- `source`: 생략 시 기존 current-data 추론 규칙. 명시한 lookup 표를 주 입력으로 잘못 추론하지 않는다.
- `field`: 주 입력에서 검색할 단일 비어 있지 않은 필드 이름.
- `lookup`: `{ data, key, fields, as? }`.
  - `data`: 반드시 명시하는 기존 materialized dataset 또는 현재 logical data owner의 ID.
  - `key`: 연결 표의 단일 비어 있지 않은 필드 이름.
  - `fields`: 연결 표에서 복사할 비어 있지 않은 필드 이름 배열.
  - `as`: 생략하면 같은 이름, 지정하면 `fields`와 같은 길이의 출력 이름 배열.
    기존 `createFlattenData`의 `fields/as` 어휘를 재사용한다.

가장 짧은 일반 호출은 `id/field/lookup` 3개 top-level 옵션이다.
출력 이름의 중복, 주 입력 필드와의 충돌, 누락된 입력 필드는 원자적으로 거부한다.
명시적 alias로 충돌을 해결할 수 있다. 새 overwrite 옵션은 추가하지 않는다.

`editLookupData({ target, field?, lookup?, dependents? })`는 기존 derived editor 계층을 재사용한다.
제공된 `lookup`은 완전한 새 객체이며 부분적인 `lookup.key` 수정은 받지 않는다.
`editDerivedData`의 definition 및 기존 `dependents: reject | recompute` 계약을 따른다.
주 원본의 교체는 기존 `reviseData`로 수행한다. definition에 `source`를 추가하는 새 편집 경로는 만들지 않는다.
Full은 생성/편집/저장, Basic은 생성과 materialization을 지원한다.

## 값과 행 계약

- 왼쪽 행 수/순서/기존 키·타입·값을 유지하고 새 출력 필드만 더한다.
- 키는 string/finite number/boolean의 타입을 포함해 정확히 비교한다. `1`과 `"1"`은 다르다.
- null/누락된 왼쪽 키는 일치하지 않으며, 대응하지 않는 행의 출력 필드는 모두 null이다.
- 오른쪽 null/누락 키는 색인에서 제외한다. 나머지 키가 중복되면 거부한다.
  최초/마지막 행을 암묵적으로 고르는 정책은 만들지 않는다.
- 선택한 오른쪽 값이 null/누락이면 null을 복사한다. 타입 강제 변환은 하지 않는다.
- 허용되는 기존 JSON cell 타입은 그대로 복사한다. 중첩 값도 독립적으로 clone/freeze한다.
- 원본의 빈 열 이름은 행에서 그대로 유지하되 연결 키/생성 필드 참조는 기존 non-empty 계약을 따른다.
- 출력 수는 왼쪽 입력 수와 같고, 기존 데이터 한도를 유지한다. 새 join 확장/곱집합 한도는 필요하지 않다.
  기존 공통 10,000,000 work 한도를 `오른쪽 행 수 + 왼쪽 행 수 × (복사 필드 수 + 1)`에 적용한다.
- 원본 행이나 이전 프로그램, 호출자 객체는 변경하지 않는다. prototype 관련 키도 own-property로 처리한다.

## 저장과 책임

기존 dataset의 `source`는 주 입력으로 유지한다. 한 개의 정규화된 transform에
`{ type: "lookup", field, lookup: { data, key, fields, as } }`를 저장한다.
양쪽 실제 dataset ID는 액션 경계에서 기존 selector를 통해 해결하며,
logical owner 이름을 canonical stored reference와 중복 저장하지 않는다.

순수 lookup grammar가 닫힌 옵션, 키/별칭/중복 정책과 행 계산을 소유한다.
wrapped creator/materializer가 두 입력 schema와 values를 확인하고,
기존 semantic primitive로 정의·typed lineage·materialized values를 저장한다.
renderer는 기존 `graphicSpec`만 읽으며 lookup을 해석하지 않는다.

추가 입력 참조의 단일 owner를 둔다. resource reference 수집, revision DAG,
데이터 해제, persistence 검증 및 facet/repeat ancestor 수집이 같은 참조 정책을 사용해야 한다.
각 파생 출력 필드의 lineage에는 주 입력 키와 오른쪽 키/값의 입력 ID/필드를 보존한다.
정확한 현재 계약은 CORE가 소유하고, macro architecture의 의도적 다중 입력 확장은
SECOND_ARCHITECTURE와 연결된 작업 경로에 기록한다.

## Revision, 편집과 합성

- 어느 입력을 `reviseData`로 바꿔도 연결 결과와 transitive consumers를 재계산한다.
- 관련 derived 입력이 바뀔 때도 동일하다. secondary data 참조는 cleanup/live-reference 검사에 포함한다.
- diamond 의존성은 한 번만 재계산하고, 모든 변경된 부모보다 뒤에 안정적으로 정렬한다.
- 기존 단일 입력 DAG의 순서와 출력은 보존한다. 다중 입력으로 생긴 cycle은 작업 전에 거부한다.
- revision 계획은 `source`와 `lookup.data`를 함께 새 canonical ID로 rebind한다.
- 주 입력의 행 보존 변환이므로 facet topology는 rowPreserving이다.
  패널은 주 입력만 올바르게 분할하고, 필요한 오른쪽 표의 전체 ancestor와 참조를 보존한다.
- 원본 필드 facet, 조회 결과 필드 facet, grid/repeat, source/lookup revision 뒤의 재생성을 검증한다.
- 누락된 표/키/값, alias 충돌, 중복 키, schema/scale/selection/layout 실패는 이전 프로그램을 그대로 남긴다.
- editable persistence는 정의와 양쪽 live 참조를 검증한다. render-only는 이미 계산된 concrete 출력만 가진다.

## 검증과 릴리즈

1. 독립 literal 9+9 입력의 전체 연결 행, 평균 32/86/3/56과 원본 값 보존.
2. typed keys/null/누락/중복/빈 표/alias/schema/중첩 값/안전한 own keys와 기존 한도.
3. shortest call, 명시 source/lookup owner 추론, ambiguity, create/edit/실패 원자성/trace.
4. primary/secondary 원본 및 derived revision, chain/diamond/cycle, live references와 cleanup.
5. 두 입력의 typed lineage, 편집 출력 alias와 consumer rebind, schema/selection 오류의 원자성.
6. Full/Basic 생성 동등성, persistence, facet/grid/repeat 및 이후 source/lookup 편집.
7. 독립 연결 완료 표와 기존 BarPlot의 concrete geometry/order/renderer/pixel 동등성.
8. normal suite, 타입/현재 계약/action inventory/LLM docs/공개 예제/설치 package 및 사이트 검증.
9. 현재 1297개/9454개 실제 프로그램의 순차 native SVG 호환 검증 후에만 로컬 후보 활성화.
10. 원본 두 표의 파이프라인 freezing/변환 lineage도 별도로 고친 뒤 실제 School 번역 재개.
    보류된 원본은 실제 번역·cold 검증 전 성공 수에 포함하지 않는다.

외부 형식명 전용 API, 임의 JavaScript callback, regex, 다대다 join, 숫자 키 강제 변환,
숨겨진 전처리 표, 자동 Canvas 확대 또는 일반 오차 완화는 이 설계에 포함하지 않는다.

집중73개·통합32개·설치 package66그룹 및 primitive/public decoded pixels가 통과했다.
전체 normal/clean source 문서·사이트·1297개9454program native cohort는 아직 최종 검증 전이다.
초기 normal11실패와 설치 consumer 기대값/size 진단을 EVIDENCE.json에 보존한다.

최종 source normal5123/5123, clean docs120, built150pages, responsive320/390/768·검색·접근성, public browser97개가 통과했다. 실제 설치66그룹/타입/FullBasic/PNG·PDF 및 독립 prejoined decoded pixels 통과 증거를 보존한다. 최종 후보 archive는 소비자 검증 archive와 README의 크기 표기 한 글자만 다르며609개 파일 중 모든 runtime/types/knowledge bytes는 동일하다. 현재1297/9454native cohort·로컬 설치·School 원본 번역은 별도 후속 검증이다.
