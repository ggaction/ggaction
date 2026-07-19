# STEP 2 — Core Program State

## 진행 상태

- [ ] Composition state validation을 pure owner로 분리
- [ ] Materialization config structural transition을 pure owner로 분리
- [ ] Context/resolved-scale transition과 class facade 책임 정리
- [ ] Subclass-preserving clone, ownership과 trace invariants 유지
- [ ] Focused core/immutability/action tests와 full normal suite 통과

`ChartProgram`은 observable state와 private method contract를 유지한다. 이 STEP은 schema를 바꾸지 않고
constructor validation과 state transition의 module ownership만 정리한다.
