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

## Arc actions

```typescript
createArcMark({ id?, data?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? }): ChartProgram;
editArcMark({ target?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? }): ChartProgram;
encodeTheta2({ target?, field?, datum?, fieldType?, scale?, coordinate? }): ChartProgram;
encodeR2({ target?, field?, datum?, fieldType?, scale?, coordinate? }): ChartProgram;
```

- Arc is a distinct semantic mark. Existing bar semantics are not changed by coordinate type.
- Secondary endpoints share the primary channel scale and coordinate and use assignment/reassignment lifecycle.
- Pie/donut use normalized theta with inner radius; radial bar uses ordinal theta band and quantitative radial extent.
- Concrete sectors are backend-neutral command paths.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 5.

## Arc selection highlight

- Arc items expose one stable final semantic item per sector and support the current select/filter/highlight grammar.
- Bounds, attachment and bring-to-front behavior use the shared mark-selection policy boundary.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 5.
