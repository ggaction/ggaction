# STEP 5 — Scale Consumers and Materialization Policies

## 진행 상태

- [ ] Mark completeness와 policy registry 책임 분리
- [ ] Scale consumer common reader와 mark-family resolver 분리
- [ ] Canvas/scale/data dependency plan의 hardcoded dispatch 정리
- [ ] Ordering, deduplication과 incomplete-mark behavior 유지
- [ ] Scale, rematerialization와 order-independence tests 통과

Materialization은 계속 wrapped action plan으로 실행되며 implicit semantic compiler를 추가하지 않는다.
