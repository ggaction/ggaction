# STEP 1 — Complete All-Edge Multi-Legend Layout

## 진행 상태

- [x] Existing top/bottom family bounds normalization
- [x] Stable horizontal-edge group ordering
- [x] Plot-left sequential top/bottom placement grammar
- [x] Shared title baseline, element start와 12-pixel gap
- [x] Family rematerializers와 sibling-wide lane replay 연결
- [x] Create/edit/remove/scale/Canvas convergence evidence
- [x] Actual-data visual and Canvas/SVG/PNG/PDF evidence
- [x] Second replacement Gate checkpoint commit/push — `257fc895`

## Implementation boundary

- Public legend signatures와 stored semantic schema는 바꾸지 않는다.
- Existing single top/bottom legend의 public contract는 보존하되 잘못된 top continuous label overlap은 수정한다.
- Multi-block horizontal edge에서는 plot left부터 stable order로 block을 40 pixels 간격으로 배치한다.
- Block이 남은 plot width에 맞지 않을 때만 다음 outward row로 넘긴다.
- Block 내부 grid와 direction은 family materializer가, row baseline과 vertical alignment는 lane이 소유한다.
- Lane grammar는 title과 content를 각각 정렬한 final `graphicSpec`을 만들며 renderer는 그 좌표만 읽는다.
