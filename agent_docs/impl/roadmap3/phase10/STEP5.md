# STEP 5 — Shared Position Scale Resolution

## 진행 상태

- [ ] Scale identity와 mark layout policy 분리
- [ ] Temporal bar + line shared consumer preflight
- [ ] Primitive/public semantic and graphic equivalence
- [ ] Explicit, independent와 ambiguous scale coverage
- [ ] Canvas/scale/data rematerialization coverage

Gate K-A 승인 결과를 current scale pipeline에 연결한다. Bar bandwidth는 bar consumer layout이 소유하고 shared
scale은 모든 consumer가 사용하는 data-to-center mapping을 소유한다. Existing single-bar, single-line과 explicit
independent scale behavior는 그대로 유지한다.
