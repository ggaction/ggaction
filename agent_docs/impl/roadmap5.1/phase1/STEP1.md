# STEP 1 — Materialize One Deterministic Side Legend Lane

## 진행 상태

- [x] Existing family layout inputs와 occupied bounds normalization
- [x] Stable block descriptor/order policy
- [x] Right/left lane column and vertical placement grammar
- [x] Family rematerializers를 lane placement에 연결
- [x] Sibling-wide rematerialization owner와 trace hierarchy
- [x] Focused unit/action/lifecycle/render evidence
- [x] Gate checkpoint commit/push — `450092da`

## Implementation boundary

- Public `createLegend`, `editLegend`, `removeLegend` signatures는 바꾸지 않는다.
- Lane grammar는 pure calculation이고 action/trace를 만들지 않는다.
- Wrapped legend owner가 semantic/config state를 읽고 family materializers를 deterministic order로 호출한다.
- Renderer는 final `graphicSpec`만 소비한다.
- Multi-block side lanes에만 correction을 적용하고 single-legend output은 가능한 한 보존한다.
