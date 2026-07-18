# STEP 5 — Shared Position Scale Resolution

## 진행 상태

- [x] Scale identity와 mark layout policy 분리
- [x] Temporal bar + line shared consumer preflight
- [x] Primitive/public semantic and graphic equivalence
- [x] Explicit, independent와 ambiguous scale coverage
- [x] Canvas/scale rematerialization과 immutable source-data ownership coverage

Gate K-A 승인 결과를 current scale pipeline에 연결한다. Bar bandwidth는 bar consumer layout이 소유하고 shared
scale은 모든 consumer가 사용하는 data-to-center mapping을 소유한다. Existing single-bar, single-line과 explicit
independent scale behavior는 그대로 유지한다.

Source dataset은 immutable이므로 in-place data edit/rematerialization API를 만들지 않는다. Caller-owned row
mutation이 저장된 semantics나 graphics를 바꾸지 않는지 검증하고, supported revisions는 기존 derived-data
resource lifecycle이 소유한다.
