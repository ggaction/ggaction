# Planned categorical gradient plots

이 문서는 Roadmap 4 Phase 6에서 승인된 API 방향과 P6-A에서 확정할 parameter contract를 분리한다.
`createGradientPlot`/`editGradientPlot`의 이름, BoxPlot-compatible x/y family와 stable edit owner는 Planned다.
범용 `FillPaint` 경계와 첫 `LinearGradientPaint` variant는 public extension primitive/type로 구현되어 있다.
GradientPlot의 exact parameter/default contract는 P6-A parameter review 전까지 Current가 아니다.

## FillPaint

```typescript
type FillPaint = NonEmptyString | LinearGradientPaint;

type LinearGradientPaint = {
  type: "linear-gradient";
  from: { x: UnitInterval; y: UnitInterval };
  to: { x: UnitInterval; y: UnitInterval };
  stops: readonly [
    { offset: UnitInterval; color: NonEmptyString },
    { offset: UnitInterval; color: NonEmptyString },
    ...{ offset: UnitInterval; color: NonEmptyString }[]
  ];
};
```

- `FillPaint`는 concrete graphical `fill` property의 값 계약이지 user-facing action이 아니다. 별도
  `createLinearGradientFill`/`editLinearGradientFill` action은 만들지 않는다.
- Solid fill은 기존 string을 그대로 사용한다. 첫 structured variant만 `LinearGradientPaint`이며 radial, conic,
  pattern variant는 실제 요구가 생기기 전까지 public union에 추가하지 않는다.
- 여기서 `linear`는 density 함수가 선형이라는 뜻이 아니라 색이 item-local 직선 축을 따라 진행한다는 뜻이다.
  비선형 density profile은 ordered stop의 offset/color/opacity가 piecewise하게 표현한다.
- `from`/`to`는 item-local bounds에 대한 normalized 좌표이며 서로 달라야 한다.
- Stop은 offset ascending으로 저장한다. Equal adjacent offsets는 hard stop을 뜻하고 다른 역순은 거부한다.
- Stop은 `{ offset, color }`만 저장한다. GradientPlot의 high-level opacity mapping은 materializer가 alpha-bearing
  concrete color 문자열에 반영한다. Renderer-specific opacity sidecar나 command는 paint에 저장하지 않는다.
- Caller object를 보존하고 normalized paint와 stops를 immutable graphical state에 저장한다.
- Paint object와 그 안의 `stops` 배열은 하나의 scalar fill 값이다. `editGraphics` collection value distribution이
  paint 내부 배열을 item별 값으로 잘못 분배해서는 안 된다.
- Rect/bar/area/closed-path fill만 첫 범위다. Open path, stroke, radial/conic gradient와 user-space coordinates는 제외한다.
- Browser와 Node renderer는 같은 concrete schema를 읽으며 backend gradient object는 program state에 저장하지 않는다.
- Renderer는 final item bounds에서 normalized endpoints를 concrete 좌표로 바꾸고 backend gradient를 일시적으로 만든다.
  Graphic state에는 backend object나 renderer command를 저장하지 않는다.
- Existing resource-specific appearance action이 fill을 소유하면 string과 paint를 같은 property에서 교체한다. Advanced
  action author는 public extension primitive `editGraphics`로 같은 concrete value contract를 사용할 수 있다.
- Exact validation, endpoint orientation과 hard-stop duplicate policy는 구현되었으며 P6-A에서 primitive source와 image를
  함께 검토한다.

### Exact P6-A candidate validation

| Value | Candidate rule |
| --- | --- |
| solid fill | non-empty string; existing behavior unchanged |
| paint object | plain object with exactly `type`, `from`, `to`, `stops` |
| `type` | exactly `"linear-gradient"` |
| `from` / `to` | plain `{ x, y }`; both values finite in `[0, 1]`; points must differ |
| `stops` | array of at least two plain `{ offset, color }` entries |
| stop offset | finite in `[0, 1]`, nondecreasing; equal adjacent values form a hard stop |
| stop color | non-empty Canvas color string; renderer/backend validity remains a draw-time concern like current solid fill |
| rect bounds | fill box exactly; stroke extent excluded |
| closed-path bounds | exact command geometry bounds; stroke extent excluded |
| unsupported owners | circle/text/open path/stroke reject structured paint before partial state is stored |

Stops do not have to begin at `0` or end at `1`; Canvas extends the first/last color to the endpoint. GradientPlot-generated
profiles always include both endpoints.

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
  sequential `blues`, opacity `[0, 1]`, no body outline stroke, and an enabled median center rule.
- Compatible categorical `encodeColor`가 있으면 그 scale이 category hue를 정하고 density가 각 hue의
  lightness/opacity를 조절한다. 이 경우 `gradient.palette`는 사용하지 않으며 categorical color scale이 우선한다.
- Every category owns one semantic density profile and one concrete gradient strip. The profile stores sampled value/intensity
  and center meaning, not renderer colors or backend gradient objects.
- A shared value extent and one global resolved density range make intensity comparable across categories. Empty categories
  are not synthesized; category order follows first eligible source appearance.
- Profile samples are ordered by quantitative value. Materialization projects those samples through the resolved value scale,
  converts the resulting physical positions into item-local stop offsets, and flips the paint endpoints when the scale range is
  reversed. It does not assume that equal value steps have equal pixel steps.
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
- Selection/highlight treats each category strip as one final item. Opacity/offset overrides preserve the baseline paint;
  explicit fill replacement may use either a string or `FillPaint`, and unhighlight restores the exact baseline paint.
- Category/measure reassignment, subgroup offsets, multiple density overlays and independent per-category intensity domains
  are not in the first implementation.

## Categorical uncertainty family

GradientPlot, BoxPlot, future violin plots and related categorical distribution views share x/y role inference,
orientation, target/data/coordinate/scale resolution, deferred encoding and ambiguity errors. Each chart keeps only its
statistical and visual differences in named nested options and its stable resource-specific edit action.
