# Step 5 — Axes, facade, consumers와 P11-B

## 진행 상태

- [x] dimension-local axis materialization과 `createGuides` dispatch
- [x] `createParallelCoordinates` thin wrapped hierarchy
- [x] color/strokeDash/line appearance와 legend
- [x] selection/highlight/filter와 text applicability consumer matrix
- [x] primitive/public exact parity
- [x] P11-B 사용자 승인

Axes는 stored dimension order와 scales를 읽고 ordinary line/text graphics를 만든다. Facade는 child validators를
preflight하고 기존 wrapped actions를 호출하며 dimension logic을 복제하지 않는다.

Parallel path는 row 전체가 한 selectable item이므로 selection/highlight/filter를 지원한다. Existing text mark의
one-item/one-anchor attachment contract와는 맞지 않으므로 implicit text attachment는 이번 범위에서 명시적으로
해당 없음이다. 축 제목과 tick label은 guide-owned ordinary text graphics다.
