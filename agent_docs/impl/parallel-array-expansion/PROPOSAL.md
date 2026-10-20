# 병렬 배열을 행으로 펼치는 파생 데이터

## 진행 상태

- [x] 현재 공개 API의 재현 가능한 누락 확인
- [x] 사용자 상시 승인 범위 및 구체적인 계약 기록
- [x] 순수 grammar·공개 action·schema·revision/replay 구현
- [x] Full/Basic·저장/복원·의존 소비자 갱신·실제 package 검증
- [x] 선언·현재 계약·공개 문서·생성 참조 동기화
- [ ] 검증된 로컬 후보 채택, 다음 정기 공개 배치에 통합

## 필요한 동작

같은 행의 배열 필드들을 동일한 인덱스로 나란히 펼친다. Cartesian product가 아니다.
입력 행 순서 다음 배열 인덱스 순서로 출력하며, 각 입력 행의 가장 긴 배열 길이만큼
출력한다. 짧은 배열의 누락 원소는 `null`이다. 예를 들어 `amounts:[3,4,5]`,
`labels:["C","D"]`는 `(3,"C"),(4,"D"),(5,null)` 세 관측값이다.
원본 dataset의 모든 원시 값, 중첩 배열, 키와 순서는 유지한다.

기존 wide-field `fold`는 배열을 셀 값으로 받지 않고, scalar `getPath`는 plain record만
통과시키며, direct derived schema도 이 변환을 지원하지 않는다. 이들의 기존 계약을
넓히거나 transform을 host에서 미리 계산하지 않는다.

## 승인된 구체적 API

```js
chart()
  .createData({ values: records })
  .createFlattenData({ id: "expanded", fields: ["amounts", "labels"], as: ["amount", "label"] })
```

- `createFlattenData({id, source?, fields, as?})`: id는 명시적, source는 기존 derived action과
  동일한 current-data resolver, fields는 1~64개 고유 nonempty field 이름이다.
- `as` 생략 시 fields와 같은 이름을 사용한다. 지정 시 fields와 같은 길이의 고유
  nonempty field 이름 배열이어야 한다. 선택된 입력 필드 자신의 이름을 대체하는 것은
  명시적인 파생 변환이다. 선택되지 않은 기존 열을 덮는 alias는 거부한다.
- 선택 field는 기존 source schema에 존재해야 하며, 각 행의 값은 배열, `null`, 또는 누락일 수 있다. null/누락은 길이0의 배열과
  같다. 다른 비배열 값은 row/field를 포함한 오류다. 배열 원소는 기존 raw-data 계약이
  허용한 JSON 값을 변경하지 않고 보존한다. 원소가 없는 자리만 null로 채운다.
- 모든 선택 배열이 비어 있는 입력 행은 출력0행이다. output은 총10,000행까지 허용하고
  초과는 상태·trace 변경 전에 거부한다. 별도 field 수, raw-data 및 nested-value 한도는
  기존 정책을 유지한다.
- semantic 변환은 `{type:"flatten", fields, as}` 한 곳에 정규화해 저장한다. source와
  original raw dataset은 유지한다. renderer는 변하지 않는다.
- `editFlattenData({target, fields?, as?, dependents?})`와 기존
  `editDerivedData({target, definition, dependents?})`가 같은 typed definition과 revision
  preflight를 사용한다. 빈 edit, 잘못된 alias/array/한도, 부적합한 dependent를 atomic하게
  거부한다. `dependents`는 기존 reject/recompute 정책 그대로다.
- 명시적 facet/facetGrid.data는 모든 layer의 공통 materialized flatten snapshot을 fold와
  같은 경계로 선택할 수 있다. 자동 anchor 추론과 다른 statistical anchor 거부는 유지한다.
- 새 materializer는 기존 derived creator/materializer·schema·revision/replay dispatcher에
  연결한다. 임의 callback, raw graphic 입력, 추가 renderer나 자동 compiler는 없다.
- Full/Basic 양쪽에서 생성·materialization의 같은 최소 호출과 오류, immutable raw/derived
  snapshot, trace와 schema lineage를 검증한다. 기존 Basic의 작은 생성 전용 surface를 유지하며
  revision/edit API는 Full entry 전용이다. Full에서 persistence와 dependent 재계산을 검증한다.

## 승인 근거와 공개 경계

사용자는 현재 진행 중인 번역·pipeline·ggaction 수정 범위에 대해
“지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”라고
명시했다. 이 concrete plan은 그 승인 범위에서 기존 derived-data 계층을 확장한다.
다시 승인을 요청하지 않는다. 기존 API 의미, 수치 오차 허용, 데이터 보존 규칙을 바꾸지
않는다. 구현/검증 checkpoint는 현재 branch에 commit/push하고, package/docs의 정기
공개는 기존 200-family cadence를 따른다. 로컬 authoring runtime 채택은 별도의 정확한
source/package/docs 및 전체 기존 cohort 검증 후에만 한다.
