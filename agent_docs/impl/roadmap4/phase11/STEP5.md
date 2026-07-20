# Step 5 — Axes, facade, consumers와 P11-B

## 진행 상태

- [ ] dimension-local axis materialization과 `createGuides` dispatch
- [ ] `createParallelCoordinates` thin wrapped hierarchy
- [ ] color/strokeDash/line appearance와 legend
- [ ] selection/highlight/text applicability와 consumer matrix
- [ ] primitive/public exact parity와 P11-B 승인

Axes는 stored dimension order와 scales를 읽고 ordinary line/text graphics를 만든다. Facade는 child validators를
preflight하고 기존 wrapped actions를 호출하며 dimension logic을 복제하지 않는다.
