# Planned categorical gradient plots

이 문서는 Roadmap 4 Phase 6에서 승인된 API 방향과 P6-A에서 확정할 parameter contract를 분리한다.
`createGradientPlot`/`editGradientPlot`의 이름, BoxPlot-compatible x/y family와 stable edit owner는 Planned다.
Paint property names와 exact visual defaults는 아직 구현되지 않았으며 P6-A parameter review 전까지 Current가 아니다.

## LinearGradientPaint

```typescript
type FillPaint = NonEmptyString | LinearGradientPaint;

type LinearGradientPaint = {
  type: "linear-gradient";
  from: { x: UnitInterval; y: UnitInterval };
  to: { x: UnitInterval; y: UnitInterval };
  stops: readonly [
    { offset: UnitInterval; color: NonEmptyString; opacity?: UnitInterval },
    { offset: UnitInterval; color: NonEmptyString; opacity?: UnitInterval },
    ...{ offset: UnitInterval; color: NonEmptyString; opacity?: UnitInterval }[]
  ];
};
```

- `from`/`to`는 item-local bounds에 대한 normalized 좌표이며 서로 달라야 한다.
- Stop은 offset ascending으로 저장한다. Equal adjacent offsets는 hard stop을 뜻하고 다른 역순은 거부한다.
- Caller object를 보존하고 normalized paint와 stops를 immutable graphical state에 저장한다.
- Rect/bar/area/closed-path fill만 첫 범위다. Stroke, radial/conic gradient와 user-space coordinates는 제외한다.
- Browser와 Node renderer는 같은 concrete schema를 읽으며 backend gradient object는 program state에 저장하지 않는다.
- Exact property spelling과 hard-stop duplicate policy는 P6-A에서 primitive source와 image를 함께 승인한다.

## createGradientPlot

```typescript
createGradientPlot({
  id?: UserId;
  target?: UserId;
  data?: UserId;
  x?: GradientPlotPositionChannel;
  y?: GradientPlotPositionChannel;
  coordinate?: UserId;
  density?: {
    bandwidth?: "auto" | PositiveFinite;
    extent?: "auto" | OrderedFinitePair;
    steps?: IntegerAtLeast2;
    kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular";
    normalization?: "unit" | "count";
  };
  width?: { band?: UnitIntervalExclusive };
  gradient?: {
    palette?: Palette;
    opacity?: readonly [UnitInterval, UnitInterval];
  };
  center?: false | {
    type?: "mean" | "median";
    stroke?: NonEmptyString;
    strokeWidth?: NonNegativeFinite;
  };
  guides?: false | CreateGuidesOptions;
} = {}): ChartProgram;
```

- Exactly one x/y role is categorical and the other is quantitative. Categorical x creates vertical strips;
  categorical y creates horizontal strips. `category`/`value` aliases are not accepted.
- Omitted x/y follows the BoxPlot family: infer from explicit target, current eligible layer, then one unique eligible layer;
  otherwise retain an incomplete owner until compatible `encodeX`/`encodeY` calls complete it. Both authoring orders converge.
- First omitted ID resolves to `"gradientPlot"`; a second owner requires an explicit ID.
- Candidate defaults pending P6-A are Gaussian, auto bandwidth/extent, 64 steps, unit density, width band `0.7`,
  sequential `blues`, opacity `[0, 1]`, and an enabled median center rule.
- Every category owns one semantic density profile and one concrete gradient strip. The profile stores sampled value/intensity
  and center meaning, not renderer colors or backend gradient objects.
- A shared value extent and one global resolved density range make intensity comparable across categories. Empty categories
  are not synthesized; category order follows first eligible source appearance.
- When input rows are observations, the plot describes their distribution. It represents inferential uncertainty only when
  rows are uncertainty draws such as bootstrap or posterior samples; documentation must not conflate those meanings.

## editGradientPlot

```typescript
editGradientPlot({
  target?: UserId;
  density?: GradientPlotDensityOptions;
  width?: { band?: UnitIntervalExclusive };
  gradient?: GradientPlotPaintOptions;
  center?: false | GradientPlotCenterOptions;
}): ChartProgram;
```

- `target` resolves current, then unique stable GradientPlot owner and rejects ambiguity. Empty edits are errors.
- Density or center-statistic changes create a new immutable profile revision, explicitly rebind every consumer and release
  only orphaned old revisions. Width, palette, opacity and center appearance retain the current profile revision.
- `center: false` removes the complete optional center layer/graphic/config; a later center object recreates it deterministically.
- Canvas/scale edits rematerialize strips, gradient endpoints, center rules and guides from the stable owner.
- Category/measure reassignment, subgroup offsets, multiple density overlays and independent per-category intensity domains
  are not in the first implementation.

## Categorical uncertainty family

GradientPlot, BoxPlot, future violin plots and related categorical distribution views share x/y role inference,
orientation, target/data/coordinate/scale resolution, deferred encoding and ambiguity errors. Each chart keeps only its
statistical and visual differences in named nested options and its stable resource-specific edit action.
