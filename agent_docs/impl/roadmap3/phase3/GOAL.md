# Roadmap 3 Phase 3 — Polar Guides

## 진행 상태

- [x] STEP 1 — Phase 계약, action inventory와 target chart 확정
- [x] STEP 2 — Deterministic Polar guide reference geometry
- [x] STEP 3 — Primitive Polar guide visual baseline
- [x] STEP 4 — Gate D visual evidence와 사용자 승인
- [x] STEP 5 — Pure Polar guide grammar와 tick policy
- [x] STEP 6 — Polar guide semantic/config ownership
- [x] STEP 7 — Theta/radial grid actions
- [x] STEP 8 — Theta/radius axis actions
- [x] STEP 9 — Aggregate dispatch, focused edits와 rematerialization
- [ ] STEP 10 — Public vertical slice, docs와 Phase closeout

## 목표

Phase 3는 Phase 2의 Polar point chart에 backend-neutral axes와 grids를 추가한다. Semantic guide는 설명하는
coordinate와 scale을 저장하고, concrete path/line/text만 `graphicSpec`에 저장한다. Renderer는 Polar scale,
tick 또는 coordinate를 추론하지 않는다.

Canonical Gate D chart는 [Cars Polar Guides](../chart/cars-polar-guides.md)다. `Acceleration` theta ticks와
`Horsepower` radius ticks를 같은 resolved values에서 axes와 grids에 정렬한다.

## Action hierarchy

```text
createGuides
├─ createAxes
│  ├─ createThetaAxis
│  │  ├─ createThetaAxisLine
│  │  ├─ createThetaAxisTicks
│  │  ├─ createThetaAxisLabels
│  │  └─ createThetaAxisTitle
│  └─ createRadialAxis
│     ├─ createRadialAxisLine
│     ├─ createRadialAxisTicks
│     ├─ createRadialAxisLabels
│     └─ createRadialAxisTitle
└─ createGrid
   ├─ createThetaGrid
   └─ createRadialGrid
```

Aggregate actions must call the wrapped child actions shown above. Grid graphics are explicitly placed before marks;
axis lines, ticks, labels and titles are placed after marks. Call order must not decide the final drawing order.

## Stored result

- `guides.axis.theta`: theta scale, Polar coordinate and inferred title
- `guides.axis.radius`: radius scale, Polar coordinate and inferred title
- `guides.grid.theta`: theta scale and Polar coordinate; concrete spokes
- `guides.grid.radial`: radius scale and Polar coordinate; concrete concentric paths
- Materialization configs own tick selection, radial-axis angle and appearance.
- `graphicSpec` owns only final path commands, line endpoints and text properties.

## Gate D

STEP 4 presents the exact target `createGuides()` call chain, independent reference values, primitive source and PNG.
Before explicit approval, do not add the Polar guide public actions, semantic paths or runtime rematerializers.

Gate D는 2026-07-17 승인되었다. 승인 baseline은 radial baseline 아래 8px에 radial title을 중앙 정렬하고,
outer circular baseline 아래 42px에 theta title을 중앙 정렬한다.
