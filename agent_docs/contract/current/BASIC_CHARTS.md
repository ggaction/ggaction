# Current Basic Chart facade contracts

Basic Chart facade는 existing domain action을 wrapped child로 조합하는 user-facing aggregate create action이다.
별도 semantic schema, compiler, materialization config와 renderer branch를 만들지 않는다. Canvas와 source dataset은
선행 state에 있어야 하고 생성 후 편집은 resource-specific action을 사용한다.

## Shared contract

- Data resolution: explicit existing ID → valid current dataset → one unique dataset. Ambiguity is an error.
- The selected dataset must have materialized `values`. A definition-only derived dataset raises a domain error;
  the facade does not execute its transform or fall back to a different dataset.
- Omitted ID uses one stable facade role. Occupied default requires an explicit ID and never creates a numbered ID.
- Field strings normalize to `{ field }`; objects reuse the corresponding child encoding vocabulary.
- Position target and coordinate are facade-owned. A nested channel cannot override them.
- Omitted or `{}` guides는 아래 공통 확보 계약을 사용한다. `false`는 이번 facade의 guide 요청을 생략한다.
- Outer/nested option shape and resource ownership are resolved before the first child. Any later child validation failure
  returns no partial program because every transition and trace branch is immutable.
- Optional encodings appear in state and trace only when requested.
- Scatter `point.stroke`, Bar/Histogram `bar.stroke` accept a non-empty color string or `false`, matching their
  child mark creation/edit owners. `false` disables the outline and its width; incompatible width edits remain errors.

## Facade guide reuse

- Scatter, Line, Bar, Histogram, Heatmap, Parallel, Violin과 Box/Gradient completion의 공통 계약이다.
  Automatic applicability와 target은 해당 facade의 layer/coordinate에서만 추론한다.
- Compatible 축·격자·범례를 재사용하고 없는 구성요소만 기존 wrapped owner로 만든다. 처음 생성할 때는
  가능한 경우 createGuides를 사용하며, 부분 보완은 실제 필요한 axis/tick/label/title/grid/legend child만 호출한다.
  별도 public ensureGuides나 observer는 없다. Direct createGuides/createAxes/leaf create의 strict 생성 계약은 유지한다.
- 축·격자는 channel·coordinate ID·scale ID가 일치해야 한다. 같은 domain만으로 합치지 않는다. Legacy 축에
  coordinate가 없으면 같은 channel/scale consumer의 coordinate가 유일할 때만 결정하여 저장한다.
  Partial line/ticks/labels/title은 기존 placement와 tick mode를 보존하며 부족한 component만 채운다.
- 자동 기본값은 기존 제목·스타일을 덮어쓰지 않는다. 명시한 nested style이 기존값과 다르면 editor 또는
  해당 guide branch의 false opt-out을 안내하는 conflict다. Facade가 source field에서 보충한 title은 explicit style이 아니다.
- 범례는 kind·channels·scale IDs·domain/order·symbol layer 구성이 호환돼야 한다. Point/Line의 다른 symbol
  recipe는 자동 병합하지 않는다. 재사용한 범례는 원래 target을 유지한다. 명시한 layout/style 차이는 conflict다.
- Histogram의 shared x scale은 각 consumer가 계산한 bin boundaries가 모두 같을 때만 자동 ticks를 재사용한다.
  Parallel의 별도 facade는 각자 dimension scale IDs를 만들므로 다른 owner의 축을 자동 공유하지 않는다.
  Gradient density legend도 owner별 density scale ID가 달라 다른 owner/family의 color legend를 덮어쓰지 않는다.
- `guides:false` 또는 nested branch false는 기존 guide를 삭제하지 않는다. 세 branch 모두 false인 facade는
  guide action을 실행하지 않는다. Box omission=false와 Box/Gradient의 deferred completion은 유지한다.
- 이 계약은 하위 데이터·grain·scale compatibility를 확장하지 않는다. 예를 들어 grouped Bar의 서로 다른
  중간 layout policy는 별도 position scale이 필요할 수 있다. Derived facade를 연속 작성할 때 source data도 명시한다.
- 증거: `test/unit/actions/charts/facade-guide-reuse.test.js`, guide owner regressions, 기존 chart primitive/public render.

## `createScatterPlot`

```typescript
createScatterPlot({
  id?: UserId;
  data?: UserId;
  coordinate?: UserId;
  x: FieldName | PointPositionOptions;
  y: FieldName | PointPositionOptions;
  color?: FieldName | ColorEncodingOptionsWithoutTarget;
  size?: FieldName | SizeEncodingOptionsWithoutTarget;
  shape?: FieldName | ShapeEncodingOptionsWithoutTarget;
  point?: PointMarkAppearanceOptions;
  guides?: false | CreateGuidesOptions;
}): ChartProgram;
```

- Stable default ID is `scatterPlot`.
- Hierarchy: `createPointMark`, `encodeX`, `encodeY`, optional `encodeColor`/`encodeSize`/`encodeShape`,
  optional `createGuides`.
- Constant appearance belongs to `point`; field-driven color/size/shape stays top-level. Child conflicts are preserved.
- Omitted size uses the materialized point radius `3`; the facade does not author an explicit radius config.
- Semantic/graphic/render output exactly matches the equivalent explicit action chain and approved Cars primitive.

### Formal values — `createScatterPlot`

- Implemented: `createScatterPlot(options: CreateScatterPlotOptions): ChartProgram`.
- Required: `x`, `y`; optional: `id`, `data`, `coordinate`, `color`, `size`, `shape`, `point`, `guides`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createScatterPlot`

- ✅ Covered: shortest call, stable/explicit ID, explicit/current/unique/ambiguous data.
- ✅ Covered: string/object channels, point appearance, guide default/disable and option ownership.
- ✅ Covered: default radius, scale reversal, Canvas rendering, Node PNG and primitive equality.
- ✅ Covered: unknown/nested target options, mark/encoding conflicts and immutable failure.
- Evidence: `test/unit/actions/charts/basic-chart-facades.test.js`,
  `test/charts/cars-scatterplot/public.test.js`, and
  `test/charts/cars-scatterplot/png.render.js`.

## `createLinePlot`

```typescript
createLinePlot({
  id?: UserId;
  data?: UserId;
  coordinate?: UserId;
  x: FieldName | LinePositionOptions;
  y: FieldName | LinePositionOptions;
  color?: FieldName | ColorEncodingOptionsWithoutTarget;
  groupBy?: FieldName;
  strokeDash?: StrokeDashEncodingOptionsWithoutTarget;
  line?: LineMarkAppearanceOptions;
  guides?: false | CreateGuidesOptions;
}): ChartProgram;
```

- Stable default ID is `linePlot`.
- Hierarchy: `createLineMark`, `encodeX`, `encodeY`, optional `encodeColor`/`encodeGroup`/`encodeStrokeDash`,
  optional `createGuides`.
- Plain strokeDash string is rejected because a field name and a named dash style are both strings.
- Direct, grouped, temporal aggregate, and direct materialized window-output line policies remain child-owned.
  `closed: true` is rejected because this facade is Cartesian; Polar line authoring remains available through the
  advanced mark/encoding chain.
- Semantic/graphic/render output exactly matches the equivalent explicit action chain and approved Cars line primitive.

### Formal values — `createLinePlot`

- Implemented: `createLinePlot(options: CreateLinePlotOptions): ChartProgram`.
- Required: `x`, `y`; optional: `id`, `data`, `coordinate`, `color`, `groupBy`, `strokeDash`, `line`, `guides`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createLinePlot`

- ✅ Covered: shortest direct line, grouped/color/dash series, temporal aggregate line, and materialized window output.
- ✅ Covered: curve/width appearance, guide default/disable, invalid aggregate and closed/dash errors.
- ✅ Covered: x/y order policy, Canvas rendering, Node PNG and primitive equality.
- Evidence: `test/unit/actions/charts/basic-chart-facades.test.js`,
  `test/charts/cars-line-chart/public.test.js`, and
  `test/charts/cars-line-chart/png.render.js`.

## `createBarPlot`

```typescript
createBarPlot({
  id?: UserId;
  data?: UserId;
  coordinate?: UserId;
  x: FieldName | BarPositionOptions;
  y: FieldName | BarPositionOptions;
  color?: FieldName | ColorEncodingOptionsWithoutTarget;
  width?: BarWidthOptionsWithoutTarget;
  bar?: BarMarkAppearanceOptions;
  guides?: false | CreateGuidesOptions;
}): ChartProgram;
```

- Stable default ID is `barPlot`.
- Hierarchy: `createBarMark`, category-first position actions (`encodeX`→`encodeY` vertically,
  `encodeY`→`encodeX` horizontally), optional `encodeColor`/`encodeBarWidth`, optional `createGuides`.
- `x`/`y` field strings and option objects without `fieldType` infer finite numeric data as quantitative and
  other supported scalar data as nominal. Explicit `fieldType` remains authoritative for ordinal numeric categories
  and temporal fields.
- The positional owner infers `mean` for an omitted quantitative measure aggregate opposite a categorical position
  in either direction. Horizontal temporal categories accept the same temporal scale vocabulary as vertical ones.
  Temporal categories do not aggregate or stack; the quantitative measure owns those options.
- Aggregate, ranged, vertical/horizontal, group/stack/fill/overlay/diverging behavior stays owned by the existing bar
  position and `color.layout` policies. The facade does not introduce a second layout option.
- Constant appearance belongs to `bar`; field-driven color stays top-level. Width reuses the exact `encodeBarWidth`
  band/pixel vocabulary.
- Semantic/graphic/render output exactly matches the equivalent explicit chain and approved Jobs grouped-bar primitive.

### Formal values — `createBarPlot`

- Implemented: `createBarPlot(options: CreateBarPlotOptions): ChartProgram`.
- Required: `x`, `y`; optional: `id`, `data`, `coordinate`, `color`, `width`, `bar`, `guides`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createBarPlot`

- ✅ Covered: shortest vertical/horizontal shorthand, ordinal/temporal horizontal category, preserved mean inference,
  category-first child equivalence after Canvas/style edits, stable/explicit ID and explicit/current data.
- ✅ Covered: vertical grouped, horizontal stacked, color layout, band width and constant appearance.
- ✅ Covered: guide default/disable, caller ownership, invalid nested target/layout and immutable failure.
- ✅ Covered: Browser Canvas, Node PNG and approved primitive equality.
- Evidence: `test/unit/actions/charts/bar-histogram-facades.test.js`,
  `test/charts/jobs-grouped-bar/public.test.js`, and
  `test/charts/jobs-grouped-bar/png.render.js`.

## `createHistogram`

```typescript
createHistogram({
  id?: UserId;
  data?: UserId;
  coordinate?: UserId;
  field: FieldName;
  maxBins?: PositiveInteger;
  binStep?: PositiveFinite;
  binBoundaries?: readonly [Finite, Finite, ...Finite[]];
  stack?: StackMode;
  xScale?: NonPointQuantitativePositionScaleOptions;
  yScale?: NonPointZeroSupportingPositionScaleOptions;
  color?: FieldName | ColorEncodingOptionsWithoutTarget;
  bar?: BarMarkAppearanceOptions;
  guides?: false | CreateGuidesOptions;
}): ChartProgram;
```

- Stable default ID is `histogram`.
- Hierarchy: `createBarMark`, one atomic `encodeHistogram`, optional `encodeColor`, optional `createGuides`.
- Default `maxBins` is `10`; `maxBins`, `binStep` and `binBoundaries` remain mutually exclusive. Count, stack,
  normalized fill, empty-bin omission and x/y scale policy are owned by `encodeHistogram` and bar materialization.
- Constant appearance belongs to `bar`; grouped/filled color uses the existing color policy.
- Semantic/graphic/render output exactly matches the equivalent explicit chain and approved Cars histogram primitive.

### Formal values — `createHistogram`

- Implemented: `createHistogram(options: CreateHistogramOptions): ChartProgram`.
- Required: `field`; optional: `id`, `data`, `coordinate`, `maxBins`, `binStep`, `binBoundaries`, `stack`,
  `xScale`, `yScale`, `color`, `bar`, `guides`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createHistogram`

- ✅ Covered: shortest default bins, stable/explicit ID and explicit/current data.
- ✅ Covered: max bins, step, boundaries, zero/normalize stack, color fill and appearance.
- ✅ Covered: mutually exclusive bin validation, empty field, guide default/disable and immutable failure.
- ✅ Covered: Browser Canvas, Node PNG and approved primitive equality.
- Evidence: `test/unit/actions/charts/bar-histogram-facades.test.js`,
  `test/charts/cars-histogram/public.test.js`, and
  `test/charts/cars-histogram/png.render.js`.

## `createHeatmap`

```typescript
createHeatmap({
  id?: UserId;
  data?: UserId;
  coordinate?: UserId;
  x: FieldName | RectPositionOptions;
  y: FieldName | RectPositionOptions;
  bin?: {
    bins?: PositiveInteger | { x: PositiveInteger; y: PositiveInteger };
    extent?: { x?: [Finite, Finite]; y?: [Finite, Finite] };
    includeEmpty?: boolean;
  };
  color?: FieldName | ColorEncodingOptionsWithoutTarget | {
    scale?: NonPointContinuousColorScaleOptions | NonPointDiscretizedColorScaleOptions;
    palette?: Palette;
  };
  rect?: { opacity?: number; stroke?: string | false; strokeWidth?: number };
  guides?: false | CreateGuidesOptions;
}): ChartProgram;
```

- Stable default ID is `heatmap`.
- Pre-gridded hierarchy: `createRectMark`, `encodeX`, `encodeY`, `encodeColor`, optional `createGuides`.
- Binned hierarchy: `createBin2DData`, `createRectMark`, `encodeX`, `encodeX2`, `encodeY`, `encodeY2`, `encodeColor`,
  optional `createGuides`.
- Without `bin`, pre-gridded behavior is unchanged: x/y/color are required, only observed combinations are emitted, and
  missing combinations are not synthesized.
- With `bin`, x/y are raw quantitative fields and color field ownership moves to the generated count. `color` is optional
  and may configure only the continuous/discretized scale or palette.
- Binned `bins` defaults to `{ x: 10, y: 10 }`; `includeEmpty` defaults to `true`, unlike the low-level data action.
- Omitted extents are resolved from finite eligible values. Position domains default to those resolved extents so the
  final upper endpoints map to the plot boundary.
- Generated dataset ID is `${heatmapId}Bin2DData`; default generated fields remain namespaced under that ID.
- Binned default axis/legend titles are the source x field, source y field and `Count`. Automatic grid is disabled unless
  explicitly requested.
- Field-driven color is the only cell-fill owner. `rect` controls opacity and outline appearance; constant `rect.fill` is
  rejected because it would conflict with color.
- String color shorthand follows the existing nominal default. Quantitative/temporal color intent must use the object form.
- Text labels are not automatic. They may be added afterward through `createTextMark().encodeText()` and remain below guides
  through the shared graphic attachment policy.
- Semantic/graphic/render output exactly matches the equivalent explicit chain and approved Gapminder heatmap primitive.

### Formal values — `createHeatmap`

- Implemented: `createHeatmap(options: CreateHeatmapOptions): ChartProgram`.
- Required in every mode: `x`, `y`.
- Pre-gridded required: `color`; optional: `id`, `data`, `coordinate`, `rect`, `guides`.
- Binned required: `bin`; optional: `id`, `data`, `coordinate`, `color`, `rect`, `guides`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createHeatmap`

- ✅ Covered: shortest pre-gridded call, stable/explicit ID and explicit/current data.
- ✅ Covered: quantitative continuous color, nominal shorthand, opacity/outline appearance and guide disable.
- ✅ Covered: observed-cell cardinality, missing-combination omission, Canvas/scale rematerialization and caller ownership.
- ✅ Covered: required color, rejected fill/target conflicts and immutable failure.
- ✅ Covered: Browser Canvas, Node PNG, post-facade text layering and approved primitive equality.
- ✅ Covered: shortest binned call, scalar/per-axis bins, auto/explicit extent, empty-cell default, generated count color,
  source-facing guide titles and wrapped child hierarchy.
- ✅ Covered: binned primitive/public semantic, graphic, renderer-call and pixel equality.
- Evidence: `test/unit/actions/charts/heatmap-facade.test.js`,
  `test/charts/gapminder-life-expectancy-heatmap/public.test.js`, and
  `test/charts/gapminder-life-expectancy-heatmap/png.render.js`.

## `createParallelCoordinates`

```typescript
createParallelCoordinates({
  id?: UserId;
  data?: UserId;
  coordinate?: UserId;
  dimensions: readonly [ParallelDimension, ParallelDimension, ...ParallelDimension[]];
  key?: FieldName;
  missing?: "break" | "drop-row" | "error";
  color?: FieldName | ColorEncodingOptionsWithoutTarget;
  strokeDash?: StrokeDashEncodingOptionsWithoutTarget;
  line?: { strokeWidth?, stroke?, opacity?, curve?: "linear", closed?: false };
  guides?: false | CreateGuidesOptions;
}): ChartProgram;
```

- Stable default ID는 `parallelCoordinates`, default coordinate ID는 `parallel`이다.
- Hierarchy: `createCoordinate({ type: "parallel" })`, `createLineMark`, atomic `encodeParallelCoordinates`, optional
  `encodeColor`/`encodeStrokeDash`, optional `createGuides`.
- `dimensions`만 최소 의미로 required다. Data는 explicit/current/unique 순서, compatible Parallel coordinate는
  explicit/current/unique/stable default 순서로만 해결하고 ambiguity는 오류다.
- Dimension field/type/title/scale와 key/missing policy는 advanced encoding contract를 그대로 사용한다. Facade가
  projection, scale 또는 axis 계산을 복제하지 않는다.
- `line`은 existing open linear line appearance를 재사용한다. Curved/closed paths는 Parallel topology와 맞지 않아
  거부한다. Color와 stroke dash는 row item에 적용되고 applicable legend를 만든다.
- Omitted guides는 dimension axes와 applicable legend를 만들며 `guides: false`는 guide branch를 만들지 않는다.
- Parallel facade guides are scoped to the facade's Parallel coordinate. Cartesian or Polar axis channels and a
  conflicting coordinate id/type are rejected before the chart changes.
- Parallel facade guides do not accept grid options; `grid` may only be omitted or `false`.
- Semantic/graphic/order/Canvas calls와 Node PNG는 approved Cars primitive와 exact match다.

### Formal values — `createParallelCoordinates`

- Implemented: `createParallelCoordinates(options: CreateParallelCoordinatesOptions): ChartProgram`.
- Required: `dimensions`; optional: `id`, `data`, `coordinate`, `key`, `missing`, `color`, `strokeDash`, `line`, `guides`.
- Planned (NOT IMPLEMENTED): —.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `createParallelCoordinates`

- ✅ Covered: shortest call, stable/explicit ID, explicit/current/unique/ambiguous data and coordinate.
- ✅ Covered: mixed dimensions, key/missing, line/color/strokeDash appearance and guide default/disable.
- ✅ Covered: Canvas/data/filter/scale rematerialization, selection/highlight/filter and immutable errors.
- ✅ Covered: Browser Canvas, Node PNG, exact primitive equality and package consumption.
- Evidence: `test/unit/actions/encodings/parallel-coordinates.test.js`,
  `test/charts/cars-parallel-coordinates/public.test.js`, and
  `test/charts/cars-parallel-coordinates/png.render.js`.
