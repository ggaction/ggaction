# STEP 1 — Complete All-Edge Multi-Legend Layout

## 진행 상태

- [x] Existing top/bottom family bounds normalization
- [x] Stable horizontal-edge group ordering
- [x] Plot-outward top/bottom placement grammar
- [x] Family rematerializers와 sibling-wide lane replay 연결
- [x] Create/edit/remove/scale/Canvas convergence evidence
- [x] Actual-data visual and Canvas/SVG/PNG/PDF evidence
- [x] Gate checkpoint commit/push — `482fe739`

## Implementation boundary

- Public legend signatures와 stored semantic schema는 바꾸지 않는다.
- Existing single top/bottom legend output은 보존한다.
- Multi-block horizontal edge에서만 shared placement를 적용한다.
- Block 내부 grid, direction, align, titlePosition은 family materializer가 계속 소유한다.
- Lane grammar는 block 전체를 translation하며 renderer는 final `graphicSpec`만 읽는다.
