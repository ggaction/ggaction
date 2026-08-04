# STEP 1 — Complete All-Edge Multi-Legend Layout

## 진행 상태

- [x] Existing top/bottom family bounds normalization
- [x] Stable horizontal-edge group ordering
- [x] Plot-left sequential top/bottom placement grammar
- [x] Shared title baseline, element start와 12-pixel gap
- [x] Family rematerializers와 sibling-wide lane replay 연결
- [x] Create/edit/remove/scale/Canvas convergence evidence
- [x] Actual-data visual and Canvas/SVG/PNG/PDF evidence
- [x] Final replacement Gate checkpoint commit/push — `019e4e54`

## Implementation boundary

- Existing signatures 안에서 continuous opacity legend의 `titlePosition: "left"` public contract와 stored semantic state를 확장한다.
- Existing single top/bottom legend의 public contract는 보존하되 잘못된 top continuous label overlap은 수정한다.
- Multi-block horizontal edge에서는 plot left부터 stable order로 block을 40 pixels 간격으로 배치한다.
- Block이 남은 plot width에 맞지 않을 때만 다음 outward row로 넘긴다.
- Block 내부 grid와 direction은 family materializer가, row baseline과 vertical alignment는 lane이 소유한다.
- Default title-above grammar는 title baseline과 content start를 각각 맞추고, `titlePosition: "left"` grammar는 title, symbol, label의 center line을 맞춘다.
- Gradient와 side opacity legend는 `titlePosition: "left"`를 명시적으로 거부한다.
- Lane은 final `graphicSpec` 좌표를 만들며 renderer는 그 좌표만 읽는다.
