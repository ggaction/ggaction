# Roadmap 3 Planned Polar contracts

Gate A에서 승인된 Phase 3~5 계약이다. Phase 2 Polar point actions는 구현되어
`current/ENCODINGS.md`가 소유한다. Public angle unit은 degree이며 renderer는 Polar semantics를 읽지 않는다.

## Polar guide actions

```text
createThetaAxis         createRadialAxis
createThetaGrid         createRadialGrid
editThetaAxisLine       editRadialAxisLine
editThetaAxisTicks      editRadialAxisTicks
editThetaAxisLabels     editRadialAxisLabels
editThetaAxisTitle      editRadialAxisTitle
editThetaGrid           editRadialGrid
```

- Theta axis owns outer baseline/ticks/labels; radial axis owns center-to-edge components.
- Theta grid materializes spokes and radial grid concentric circles.
- `createAxes`/`createGuides` dispatch by stored coordinate type.
- Concrete guides use existing path, line and text schemas only.
- Status: Implemented. Canonical contract moved to
  [`../current/AXES.md`](../current/AXES.md#polar-guide-actions) and
  [`../current/GRID.md`](../current/GRID.md#polar-grid-actions).

## Polar line radar

```text
createLineMark/editLineMark: closed?: boolean
```

- Polar line series sort deterministically by theta domain and map every theta/radius pair before path creation.
- `closed: true` emits the radar closing command. First Polar line slice accepts only linear curve.
- Full-circle seam, duplicate angle, short series and reverse have independent geometry fixtures.
- Status: Implemented. Canonical contracts moved to
  [`../current/MARKS.md`](../current/MARKS.md#createlinemark) and
  [`../current/ENCODINGS.md`](../current/ENCODINGS.md#polar-position-actions).

## Maybe Future arc endpoints

```typescript
encodeTheta2({ target?, field?, datum?, fieldType?, scale?, coordinate? }): ChartProgram;
encodeR2({ target?, field?, datum?, fieldType?, scale?, coordinate? }): ChartProgram;
```

- Current donut, rose and radial-bar contracts need one theta band/partition and one radial endpoint only. They are
  implemented by `createArcMark`/`editArcMark`, existing `encodeTheta`/`encodeR`, and the current arc selection policy.
- Secondary angular or radial endpoints need a concrete ranged-sector chart and an independently approved scale-sharing,
  endpoint-order and completeness contract before they enter Planned again.
- Status: Maybe Future, NOT IMPLEMENTED. These names are outside the active Planned inventory and public API.
