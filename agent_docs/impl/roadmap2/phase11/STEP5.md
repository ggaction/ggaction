# Roadmap 2 — Phase 11 Step 5: Guide Ownership and Draw Order

## 목표

Grid, axis, legend와 title action이 graphical role에 맞는 owner와 deterministic sibling position을 명시하게 한다.

## 진행 상태

- [ ] Horizontal and vertical grid attachment below every plot mark
- [ ] X/Y axis component attachment above every plot mark
- [ ] Regression band placement below points and regression line placement above points
- [ ] Legend direct Canvas ownership and stable multi-block order
- [ ] Title direct Canvas ownership and stable edge placement
- [ ] Guide create/edit/rematerialize attachment preservation
- [ ] Order independence from guide action call timing
- [ ] Canvas resize and scale-edit draw-order regression
- [ ] STEP status, conceptual commit and push

## 완료 조건

The stored tree—not incidental action timing—determines grid, band, mark, highlight, axis, legend and title order.
