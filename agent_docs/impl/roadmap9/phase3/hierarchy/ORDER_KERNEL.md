# Hierarchy ordering private checkpoint

## 진행 상태

- [x] Input/value/key/custom-field 순서를 공통 canonical model에 반영
- [x] 기존 typed identity와 data sort 정책 재사용
- [x] 순서 변경 후 tree/partition/slice-dice가 같은 key/value/lineage 소비
- [x] Immutable·동률·null/type/temporal·깊이10,000·work/source/package 경계 검증
- [ ] Rendered tree/treemap/partition primitive 검토
- [ ] Public hierarchy/layout resource lifecycle 및 모든 consumer 연결
- [ ] AT-22·STEP-020·STEP-077 전체 완료

기준은 treemap `b8fe0549cbd6ef2f9780a7e2dcb606bcd44def14`다. 기존
[AUTHORIZATION](../../AUTHORIZATION.json)과 parent의 private ordering 위임을 재사용한다.
아래 explicit-vector API는 private 계산 경계이며 공개 저장 schema 또는 최종 action 옵션을 결정하지 않는다.

## 소유권과 입력

`orderHierarchyModel(model,options,sortValues?)`는 공통 model 검증 후 childrenKeys와 node preorder만 바꾼다.
Key/parent/depth/weight/residual/sourceRows는 보존하며 결과를 복제·freeze한다.
Node 배열을 단순 전역 정렬하지 않고 각 sibling group을 정렬한 뒤 iterative DFS로 preorder를 다시 만든다.

| by | 입력과 재사용 정책 |
| --- | --- |
| input | 기존 canonical 순서를 유지한다. direction이나 외부 sortValues를 받지 않는다. |
| value | 저장된 totalValue를 기준으로 명시 ascending/descending 정렬한다. 동률은 기존 sibling 순서다. |
| key | 명시 canonical-node 순서의 sortValues를 받는다. 기존 encodeRowKey로 node identity와 일치함을 확인하고 compareRowKeys의 typed scalar 순서를 재사용한다. |
| field | Semantic caller가 해결한 field 값 vector를 받는다. 기존 normalizeSortTransform/deriveSortedRows의 scalar/null/type/temporal 정책을 재사용한다. |

Key/field의 vector는 model nodes와 정확히 같은 길이의 own dense array다. Key 모드는 typed scalar만
허용하고 synthetic root의 값은 비교하지 않는다. Node token을 별도 parser로 decode하지 않는다.
Field 모드는 원 dataset이나 field 이름을 추론하지 않으며 원 field provenance는 향후 semantic action이 저장해야 한다.
Null 기본 위치와 year/timestamp의 정확한 의미도 기존 sort owner가 소유한다. 예를 들어 명시 timestamp 모드는
숫자 epoch를 받으며 date 문자열을 임의로 허용하지 않는다.

한 model의 정렬은 tree/partition/slice-dice에 공통으로 적용한다. Squarify의 descending stable tile 순서는
해당 method의 고정 정책이며 기존 sibling 순서는 동률의 기준이다. 원 source row를 새 순서의 index로 다시 쓰지 않는다.
검증·key token/string 길이·group sort의 n log n 비용을 같은10M work에 합산한다.

## 독립 검증과 재현

Literal sourceRows 순서4개가 `test/oracles/hierarchy.js`에 있으며 production import가 없다.
Typed boolean/number/bigint/string/Date 비교, null first/last, 같은 값 stable order,
잘못된 vector/key identity/getter/type, 같은 ordered model의 세 layout 위치를 별도로 검사한다.
Source snapshots와 sourceRows를 비교하고10,000 depth에서도 stack overflow가 없음을 확인한다.

| 명령 | 결과 |
| --- | --- |
| Hierarchy7개 test 파일+numeric-sums Node coverage | 62 passed; order100/100/100 |
| Canonical critical95/90/100 | 일곱 hierarchy owner 통과, 기준 유지 |
| `node scripts/run-tests.js unit unit/actions/data/sorted-data.test.js unit/grammar/hierarchy-order.test.js` | 10 passed |
| `node scripts/check-hierarchy-fixtures.js` | 19개 독립 fixture와 call/input/expected/actual/diff SHA |
| Discovery/source/package boundary 및 artifact contracts | 38 passed |
| `npm run package:check` | 690entries/1,027,885packed/4,780,216unpacked bytes |
| `npm run package:bundle` | Full/Basic installed build; gzip510,644/287,809bytes 유지 |

증거는 `.artifacts/validation/hierarchy-order/`에 보존한다. 새 source1개로 entry cap690,
크기는 실측 최소1,000byte 경계인1,028,000/4,781,000이다. 이전689-entry cap 실패도 보존한다.
기존 sort/identity source를 변경하지 않았고 private ordering owner는 public import graph에 들어가지 않는다.
Main 누적 integration의 package/bundle/full/realistic 검증은 parent가 별도로 수행한다.

## 남은 의무

세 visual target의 실행 가능한 primitive와 rendered 검토 자료를 준비한다.
Public resource create/edit/revise/remove, 실제 source row identity/ref 연결, persistence/inspection/scene,
selection/hit/accessibility/composition, SVG/Canvas/PNG/PDF와 types/docs/package 소비자는 아직 미구현이다.
Primitive 승인 전 새 visual public action flow를 만들지 않는다. STEP-020이나 전체77개 카드 완료로 기록하지 않는다.
