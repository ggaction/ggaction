# STEP 8 — Gate K-B Cross-feature Integration

## 진행 상태

- [x] Integration call chains and executable source
- [x] Nested Polar composition PNG
- [x] Facet scale/guide and rematerialization PNG
- [x] Supported/error boundary report
- [ ] Exact primitive/public pair 재확인

Gate K-B는 visual output뿐 아니라 integration matrix의 supported/error classification을 함께 승인한다. 승인 전에는
`cross-feature-integration`을 Current로 승격하지 않는다. 2026-07-19 initial visual 승인을 받은 뒤 exact-pair audit에서
primitive facet Canvas sizing과 public auto sizing의 drift를 발견했다. Public behavior에 맞춘 동일 PNG pair를 다시
확인한 뒤 STEP 9 closeout으로 진행한다.

승인된 Gate source는 `test/charts/cross-feature-integration/`으로 승격되었고 complete target flow는
[`../chart/cross-feature-integration-dashboard.md`](../chart/cross-feature-integration-dashboard.md)에 있다.
두 PNG는 nested Polar replacement와 existing outer-guide/shared-legend facet 계약을 각각 검증한다.
