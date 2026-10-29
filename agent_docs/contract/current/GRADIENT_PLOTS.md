# Gradient plots

## Shared contract

Creation and statistical role edits apply the [single-Y frame preflight](AXES.md#single-y-per-cartesian-frame) before changing scales, marks, or derived data.
Evidence: `test/unit/single-y-aggregate-admission.test.js`.

Gradient plots belong to the same positional family as box plots. Exactly one of `x` and `y` is categorical and the other is
quantitative. The categorical role determines strip orientation. Explicit options win over uniquely inferable encoded state,
then documented defaults apply. Ambiguous state is rejected.

Each category produces one immutable semantic profile row and one concrete rect item. Profile rows contain sampled values,
sampled density intensities, extent, center, and count; they never contain colors, paint, Canvas coordinates, or backend
objects. Categories retain first source appearance order, use one shared observed or explicit value extent, and use one global
intensity domain.

The optional center Rule style accepts `lineCap`, `lineJoin`, and `miterLimit` and forwards them through create/edit
replay. It does not accept `cornerRadius`; the generated gradient body has no new public Rect-style branch. Exact
stroke values and defaults are owned by
[the shared mark-style contract](MARKS.md#shared-stroke-and-rounded-rectangle-style-details).

The body fill is a backend-neutral `LinearGradientPaint`. With no color encoding, `gradient.palette` supplies the density
palette. A later categorical `encodeColor` owns category hue and density modulates that hue's lightness and opacity. The
neutral density legend remains independent from the categorical hue scale.

고정 `encodeColor.value`와 `editRectMark.fill`도 strip의 기준 hue를 바꾸고 밀도에 따른
lightness/opacity를 유지한다. Field color는 실제 profile row의 해당 값을 소비하며 category만
잘못 대입하지 않는다. Hue는 공유 continuous-color grammar의 hex/basic named/RGB/HSL 값을
정규화한다. Opacity, stroke, strokeWidth의 상수/필드 값과 rect corner/stroke appearance는
기존 mark config와 semantic encoding에서 materialize하며 Canvas/scale/density/facet replay에 보존한다.
이 owner는 기존 rect materialization policy의 완성된 consumer다.

Density legend의 canonical owner는 기존 gradientPlot.guides.legend다. 독립 density scale과
namespaced graphics를 유지하며 `guide.legend.color`를 점유하지 않는다. 따라서 hue legend의
create/edit/remove가 밀도 범례를 덮어쓰지 않는다. Side legend lane이 확정된 뒤 밀도 범례를
오른쪽 바깥에 다시 배치한다. 이전 snapshot의 같은 density scale placeholder는 제거할 수 있다.
다른 gradient owner의 density legend 동시 생성은 기존처럼 명시적으로 거부한다.
Facet guide 정책은 local density graphics를 제거하며 shared density legend는 여전히 지원하지 않는다.

## `createGradientPlot`

```typescript
createGradientPlot({
  id?, target?, data?, x?, y?, coordinate?, color?: BasicColorChannel | { value: string },
  density?: {
    bandwidth?: "auto" | PositiveFinite,
    extent?: "auto" | OrderedFinitePair,
    steps?: IntegerAtLeast2,
    kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular",
    normalization?: "unit" | "count"
  },
  width?: { band?: UnitIntervalExclusive },
  gradient?: { palette?: Palette, opacity?: [UnitInterval, UnitInterval] },
  center?: false | {
    type?: "mean" | "median",
    stroke?: NonEmptyString,
    strokeWidth?: NonNegativeFinite,
    lineCap?: LineCap,
    lineJoin?: LineJoin,
    miterLimit?: PositiveFinite
  },
  guides?: false | CreateGuidesOptions
} = {})
```

- The first omitted ID is `"gradientPlot"`; another owner requires an explicit ID.
- `x` and `y` may be authored before creation, in the create call, or afterward with `encodeX`/`encodeY`. All complete forms
  converge on the same materialized owner.
- Defaults are Gaussian kernel, auto bandwidth and extent, 64 steps, unit normalization, width band `0.7`, palette `blues`,
  opacity `[0, 1]`, no strip outline, and an enabled median center rule with dark `1.5` pixel stroke.
- Omitted guides create applicable axes, the default Cartesian grid, and a right-side neutral density legend. `false` omits
  the complete guide branch; nested `false` values omit their component.
- Discovery 역할은 deferred owner다. 위치가 미완성이면 geometry와 guides를 만들지 않고 완료 시 기존 owner를
  호출한다. 축·격자는 [공통 확보 계약](BASIC_CHARTS.md#facade-guide-reuse)으로 보완하며 density legend는
  다른 owner/family의 color legend를 덮어쓰지 않는다. 별도 density scale ID는 equal-domain 재사용 근거가 아니다.
- The wrapped hierarchy owns `createGradientProfileData`, `createRectMark`, position encodings,
  `materializeGradientPlotFill`, optional `createGradientPlotCenter`, and guide components.
- A profile revision always reads the raw source dataset directly. Requested automatic parameters remain in provenance beside
  resolved bandwidth, extent, and intensity domain.
- `color` accepts the existing string field, field/scale, or constant value encoding vocabulary and calls
  `encodeColor` on the completed strip owner before guides. Deferred positions retain this intent.
  This has the same result as creation followed by `encodeColor`: hue follows that encoding while density
  controls the existing lightness/opacity profile. The neutral density legend keeps its existing separate ownership.
  The parameter does not add subgroup profile generation or unrelated fields to the profile dataset.

### Effects and errors

- Creates one stable rect owner, one namespaced profile dataset, one optional namespaced center rule, position scales, and
  selected guides.
- Rejects invalid or ambiguous data/target inference, non-categorical/quantitative role pairs, invalid density parameters,
  invalid width or opacity ranges, and unsupported center values before partial public state is returned.
- Incomplete compatible positions preserve an empty owner and deferred materialization intent rather than placeholder items.

### Coverage

- Complete explicit Cars call chain, encoded-source inference, deferred position order, categorical color after creation,
  wrapped trace, Browser Canvas, Node PNG, and primitive/public equivalence are stable chart evidence.
- Vertical/horizontal orientation, Canvas/profile edit order, reversed scales, source-first filtering, category-strip
  selection/highlighting, explicit text fallback, and cell-local Cartesian facet replay are executable consumer evidence.
- `filterMarks` rejects this composite owner before mutation; users create a filtered source revision before the plot.
- Default guide titles come from the original category and measure fields rather than generated profile field names.

### Formal values — `createGradientPlot`

- Implemented: `createGradientPlot({ id?: UserId; target?: UserId; data?: UserId; x?: GradientPlotPositionChannel; y?: GradientPlotPositionChannel; coordinate?: UserId; color?: BasicColorChannel | { value: string }; density?: GradientPlotDensityOptions; width?: { band?: UnitIntervalExclusive }; gradient?: { palette?: Palette; opacity?: readonly [UnitInterval, UnitInterval] }; center?: false | GradientPlotCenterOptions; guides?: false | CreateGuidesOptions } = {})`.
- Proposed (NOT IMPLEMENTED): subgroup offsets, multiple profile overlays, and independent per-category intensity domains.

### Value coverage — `createGradientPlot`

- ✅ Covered: explicit, inferred, deferred, ambiguous-source, categorical-color, guide, Canvas, PNG, immutable profile,
  selection/highlight, text, filtered-source, horizontal, and facet cases.
- No proposal is required for the approved first implementation. Evidence:
  `test/unit/actions/statistics/gradient-plot-consumers.test.js` and `test/charts/cars-gradient-plot/`.
- ✅ Covered: initial field/fixed color, deferred completion, exact direct-followup equality, guides and serialization.
- Evidence: `test/unit/actions/statistics/distribution-color-facades.test.js`.

## `editGradientPlot`

```typescript
editGradientPlot({
  target?, data?, x?, y?, density?, width?, gradient?,
  center?: false | GradientPlotCenterOptions
})
```

- Omission preserves current state. Empty edits are rejected.
- `data`, `x`, `y`는 create-time position vocabulary의 partial edit다. Supplied channel은 complete replacement이고
  resulting pair는 exactly one categorical plus one quantitative role이어야 한다. Omitted source/role은 current owner
  provenance를 보존한다.
- Density and center-statistic edits create a new namespaced immutable profile revision, rebind every direct consumer, and
  release only the unreferenced previous revision.
- Data/role edit은 raw source에서 new profile revision을 만들고 stable strip/center IDs에 explicit rebind한다.
  Orientation change는 category/measure scale IDs를 새 channel로 handoff하고 axis title/tick mode와 continuous grid
  direction을 갱신한 뒤 structured paint, optional center와 density legend를 rematerialize한다.
- Category 역할이 바뀌면 이전 category를 사용하던 categorical color/stroke도 새 역할을 따른다.
  변경된 변수의 명시 tick subset은 새 domain으로 재추론하며 기존 label appearance는 유지한다.
- Width, palette, opacity, and center appearance retain the existing profile dataset.
- `center: false` removes its semantic layer, graphic, and materialization config. A later center object recreates the same
  deterministic owned role.
- Every edit rematerializes affected strips, center span, and the density legend while preserving previous programs and
  caller-owned inputs. Stored selection/highlight는 current category-strip items에서 replay하고 stale selector,
  shared-scale handoff 또는 downstream failure는 returned state/trace 없이 거부한다.

### Formal values — `editGradientPlot`

- Implemented: `editGradientPlot({ target?: UserId; data?: UserId; x?: GradientPlotPositionChannel; y?: GradientPlotPositionChannel; density?: GradientPlotDensityOptions; width?: { band?: UnitIntervalExclusive }; gradient?: GradientPlotAppearanceOptions; center?: false | GradientPlotCenterOptions })`.
- Proposed (NOT IMPLEMENTED): arbitrary guide replacement through this resource edit.

### Value coverage — `editGradientPlot`

- ✅ Covered: statistical revision, appearance-only retention, center removal/restoration, immutable options, and empty-edit rejection.
- ✅ Covered: source/field/role and vertical↔horizontal revision, stable strip/center identity, axis/grid/density-legend
  handoff, compatible highlight replay, stale-selector rejection and failed-call atomicity.
- No proposal is required for the approved first implementation. Evidence: `test/unit/actions/statistics/edit-gradient-plot.test.js`.

## FillPaint boundary

`FillPaint = string | LinearGradientPaint` is the concrete `fill` property contract. Structured paint uses item-local
normalized endpoints and nondecreasing `{ offset, color }` stops. Renderers create backend gradient objects ephemerally;
program state stores only immutable backend-neutral data. Rect and closed-path fills support structured paint. Open paths,
text, circles, and strokes reject it. Endpoint interpolation stays finite across any ordered finite item bounds, including
bounds whose raw span overflows.

## Consumer boundaries

- `selectMarks` and `highlightMarks` resolve one final item per category strip. Opacity/stroke/offset-only highlights preserve
  the baseline structured fill; explicit `color` or `fill` replaces it.
- Attached text uses its documented text color when a rect fill is structured. Materialization never samples Canvas pixels or
  attempts renderer-side contrast inference.
- Cartesian facets partition raw rows first, replay one namespaced profile per child, rebind body and center layers, and store
  the replayed source/profile/intensity-domain identity in each child config.
- Facet legends remain governed by the facet guide contract. A shared custom density legend is not implemented.
- Statistical references use the raw measure observations for `boundData` and the per-strip center
  values for `visibleItems`. Grouped raw statistics can use other source columns. Their materializer
  reuses resolved source position scales rather than entering a recursive source/reference plan.
- Appearance, guide coexistence, raw/grouped reference values, and replay evidence:
  `test/unit/actions/statistics/gradient-appearance.test.js`.
