# STEP 8 — Gate K-B Cross-feature Integration

## 진행 상태

- [x] Integration call chains and executable source
- [x] Nested Polar composition PNG
- [x] Facet scale/guide and rematerialization PNG
- [x] Supported/error boundary report
- [ ] 사용자 approval

Gate K-B는 visual output뿐 아니라 integration matrix의 supported/error classification을 함께 승인한다. 승인 전에는
`cross-feature-integration`을 Current로 승격하지 않는다.

Gate source는 `test/gates/cross-feature-integration/`에 있고 complete target flow는
[`../chart/cross-feature-integration-dashboard.md`](../chart/cross-feature-integration-dashboard.md)에 있다.
두 PNG는 nested Polar replacement와 existing outer-guide/shared-legend facet 계약을 각각 검증한다.
