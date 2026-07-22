# STEP 1 — Encoding Removal Policy and Vertical Slice

## 진행 상태

- [ ] Current encoding writers and materializers 전수 mapping
- [ ] Channel dependency and owned-companion preflight owner 구현
- [ ] Domain removal actions 구현
- [ ] Appearance removal parameter implementation
- [ ] Contract/type/docs synchronization
- [ ] Focused and cumulative verification
- [ ] Gate evidence/commit/push

## 실행 순서

1. Current architecture, encoding/mark/current contract와 affected scoped instructions를 완전히 읽는다.
2. Supported channel별 semantic path, scale, mark config, guide, companion와 rematerializer를 table로 고정한다.
3. Pure preflight가 complete proposed state와 cleanup plan을 계산하게 한다.
4. One wrapped `removeEncoding` aggregate가 plan의 existing domain actions/primitives를 호출한다.
5. Radius/outline graphical config removal을 mark-family owners에 구현한다.
6. Current contract, declaration, inventory, docs와 generated references를 같은 conceptual change에서 동기화한다.
7. Focused tests부터 cumulative suites와 representative renderer evidence 순으로 검증한다.

## Gate evidence

구현 완료 뒤 exact source/state/trace/test/compatibility 결과와 remote commit을 [`GATE_A.md`](./GATE_A.md)에
기록한다.
