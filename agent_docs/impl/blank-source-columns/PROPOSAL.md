# 이름이 빈 원본 열을 보존하는 스키마 제안

## 진행 상태

- [x] 현재 공개 호출로 세 실패와 불변성 재현
- [x] 저장 계약·호환성·검증 범위 구체화
- [ ] 사용자 승인
- [ ] 구현·회귀 검사·타입/현재 계약/문서 동기화

Gate: **ready-for-review**. 검토 기준 런타임은 `0951a880733b912cf7c190a5d6f134cc4ff7d4bd`다. 이 패키지는 제안과 현재 실패 증거만 포함하며 구현은 바꾸지 않는다. 검토 대상은 이 문서와 같은 커밋의 `repro.mjs`, `repro-result.json`이다.

## 문제와 실행 증거

```js
chart().createData({ values: [{x: 1, y: 2, "": "unreferenced CSV cell"}] })
```

사용하지 않는 빈 이름의 CSV 열도 원본 행에 있을 수 있다. 현재는 자동 추론에서 빈 이름을 거부한다. 명시 스키마에서 생략하면 undeclared field, 포함하면 빈 이름 오류가 난다. `node agent_docs/impl/blank-source-columns/repro.mjs`는 세 경로와 caller/이전 프로그램 불변성을 확인한다. 외형 변경은 없어 렌더 이미지가 필요한 시각 Gate가 아니다.

## 승인할 정확한 동작

1. 행의 own-property 이름인 정확한 빈 문자열 `""`를 **저장용 dataset schema field name**으로 허용한다. inferred/declared/derived 스키마와 serialize/replay에서 이름과 값을 그대로 보존한다. 현재 유효한 비어 있지 않은 이름은 유지하며 공백만 있는 문자열은 계속 거부한다.
2. 데이터셋·mark·scale 등 resource ID, 선택/encoding/filter/계산 등 액션의 field selector와 새 출력 alias는 계속 비어 있지 않은 문자열이어야 한다. 빈 열은 이번 범위에서 지정해 조작하는 대상이 아니라 보존하는 원본 metadata다. generic 문자열 검증기를 완화하지 않는다.
3. 기존 행을 보존하는 filter/sort/computed/window/stack 등 변환은 다른 미사용 열과 똑같이 빈 열을 보존한다. summary/bin 등 행 구조를 바꾸는 변환은 기존 열 보존 정책을 그대로 따른다. 빈 열을 이유로 별도 전파·삭제 정책을 만들지 않는다.
4. 저장된 lineage input의 `field`에도 정확한 `""`를 허용해 스키마 기록이 유효하게 왕복하도록 한다. lineage의 data ID/owner/role은 여전히 비어 있지 않아야 한다. 공개 변환에서 빈 selector를 새로 허용하지 않는다.
5. 명시 스키마에는 빈 열도 명시해야 한다. 선언하지 않은 열 거부, 타입·nullable·optional 검증과 중복 이름 거부는 유지한다. 빈 이름 두 개도 중복이다.
6. 새 action/옵션/스키마 모양/버전은 추가하지 않는다. `name: string` 타입은 유지하되 허용 값의 문서 계약을 동기화한다. 과거 프로그램은 그대로 유효하며, 새 빈 이름을 포함한 프로그램은 새 버전의 소비자가 필요하다.

## 구현·검증 계획

- datasetSchema 내부의 저장 필드 이름 검증만 분리하고 원본/파생/lineage 경로를 연결한다. renderer/semantic-to-graphic 경계는 바꾸지 않는다.
- 자동/명시 추론, null/optional/혼합 값, 빈 키 ownership 및 deep freeze, serialization/replay, filter/sort/computed의 열과 lineage 보존을 검사한다.
- 빈 ID/빈 selector/공백 이름/중복 빈 이름/미선언 빈 열은 계속 거부하고 실패 시 입력과 이전 프로그램이 바뀌지 않는지 검사한다.
- 기존 데이터 계약·타입 주석·공개 데이터 문서·생성 catalog를 동기화하고 unit/contracts/docs/packed consumer 검사를 실행한다.
- 새 런타임을 고정한 뒤 영향을 받는 번역을 재시도하고 기존 승인 프로그램을 재검증한다. 원본 열 삭제/이름 변경으로 회피하지 않는다.

## 승인 범위

위의 빈 열 보존 계약과 그 검증·문서 반영이다. 수학/배열 펼치기는 [별도 제안](../data-transform-extension/PROPOSAL.md)에 있으며 함께 승인하는 선택지를 명시적으로 고를 때만 구현한다. 패키지 배포·사이트 배포·PR 생성은 포함하지 않는다. 승인 대기 중에는 의존하는 가족만 대기하고 다른 번역은 계속한다.
