# Roadmap 2 — Phase 8 Step 2: Canonical Vertical Tukey Primitive

## 목표

Future box actions 없이 raw semantic/graphic primitives로 Cars Origin × MPG Tukey target를 만들고 Gate A에서
box, whisker, median, outlier와 guide layering을 승인받는다.

## 진행 상태

- [x] Independent q1/median/q3/fence/observed-whisker reference rows
- [x] Independent owned outlier rows and source-order evidence
- [x] Raw summary/outlier datasets and component semantic layers
- [x] Concrete whisker/cap, rect body, median and point geometry
- [x] Axes, horizontal grid and title composition
- [x] Variant manifest and exact future call chain
- [x] `cars-vertical-tukey/primitive.png` and browser/renderer checks
- [x] Gate A user confirmation
- [x] STEP status, conceptual commit and push

## Gate A

USA/Japan/Europe의 quartile와 whisker 관계, 10 black diamond outlier visibility, Origin별 opaque box color,
0.7 band width, black whisker/cap, component order와 half-width Canvas를 확인한다. 승인 전에는
`createBoxPlot` public flow를 구현하지 않는다.

## 완료 조건

Independent numeric rows와 concrete primitive geometry가 일치하고 canonical visual target가 승인된다.
