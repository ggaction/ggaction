# Legend and title action contracts

제목과 범례의 충돌 검사는 단일 text와 줄바꿈 text collection의 실제 occupied bounds를 사용한다.
서로 다른 margin의 제목·범례는 재배치 후에도 유효하며 실제 겹침은 작성 순서와 무관하게 거절한다.

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## Shared formal types

```typescript
type LegendPosition = "right" | "bottom" | "top" | "left";
type LegendAlign = "left" | "center" | "right";
type LegendDirection = "horizontal" | "vertical";
type LegendChannel = "color" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity";
type LegendSymbolLayer =
  | { type: "line"; length?: NonNegativeFinite; lineWidth?: NonNegativeFinite }
  | { type: "point"; shape?: "circle"; size?: NonNegativeFinite; fill?: NonEmptyString; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite }
  | { type: "swatch"; width?: NonNegativeFinite; height?: NonNegativeFinite; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite };
type LegendBorder = false | true | {
  color?: NonEmptyString;
  lineWidth?: NonNegativeFinite;
  padding?: NonNegativeFinite;
  background?: NonEmptyString;
};
type TitlePosition = "top" | "bottom" | "left" | "right";
type TitleWrap = "word" | "character";
```

## `createLegend`

- Sampled opacity legend는 active quantitative opacity scale이 있는 Point와 Line을 지원한다.
  Line도 기존 circle sample recipe를 사용하며 constant assignment는 자신의 opacity block만 제거한다.

- Signature: `createLegend({ target?, channels?, position?, layout?, align?, direction?, columns?, offset?, titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?, gradient?, order? })`.
- `target`: compatible mark ID; 생략하면 current 또는 유일한 eligible mark를 추론한다. Sequential gradient는
  point와 aggregate bar를 지원한다.
- `order`: categorical 전용 `"scale" | { values: readonly CategoryValue[] } | { channel: "x"|"y"|"theta" }`.
  생략은 기존 scale domain 순서. Explicit values는 nonempty unique partial list이며 빠진 값은 source first appearance 순서로 붙이며, source에 없는 explicit scale-domain 항목도 마지막에 유지한다.
  Unknown/duplicate/non-scalar는 오류. Link는 같은 target의 같은 categorical field와 동일 category set을 요구한다.
  Policy는 semantic `guide.legend.color/series.order`에 저장하며 config에는 resolved item order만 저장한다.
  각 item의 color/shape/dash는 원래 scale에서 category 값으로 조회하므로 팔레트 배정이 바뀌지 않는다.
  Linked position scale/order 변경은 범례도 갱신한다. 연결 인코딩 제거·field/category-set 불일치는 atomic 오류이며
  먼저 `editLegend({ order: "scale" })`로 policy를 제거할 수 있다. Continuous/interval/size/stroke-width/opacity는 order를 거부한다.
  Complete chart의 nested guide 선언은 가능한 position 역할로 좁힌다: Cartesian categorical 위치는 x/y, Pie·measured radial은 theta이다. 선언된 위치가 quantitative/temporal뿐인 Line·Area·Density와 dimension 축을 사용하는 Parallel은 scale 또는 explicit values만 노출한다. 일반 createLegend/editLegend의 lower 계약은 그대로다.
- `channels`: unique compatible subset of
  `"color" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity"`. 생략하면
  target의 compatible channels를 추론한다. Sequential color는 gradient, field-driven opacity는 sampled
  point block을 선택한다. Opacity는 단독 channel만 지원한다.
- Explicit channels는 생성할 content의 정확한 집합이다. Point의 `["color","shape","size"]`,
  `["color","size"]`, `["shape","size"]`는 categorical와 size를 분리 생성한다. Size가 선택되지 않으면
  이미 size encoding이 있어도 companion을 추가하지 않는다. Categorical-only에 count는 오류다.
  Omitted channels의 기존 color+shape(+size) inference는 유지하며, color-only/shape-only/color+size point의
  omitted inference는 아직 line-series fallback이므로 정확한 content에는 explicit channels가 필요하다.
- Point의 explicit color-only selection은 color swatch legend를 만들고, shape 또는 composite channel
  선택은 typed point series legend를 만든다.
- Shape-only point legend는 color binding 없이도 생성·재생성한다. 다른 line의 존재는 이 경로에 영향을 주지 않는다.
  Automatic line+point recipe는 point와 line 모두 같은 color field와 scale을 공유할 때만 추론한다.
  Evidence: `test/unit/actions/guides/shape-legend-ownership.test.js` (creation, color removal, Canvas/shape-scale replay).
- Explicit `["size"]` 또는 유일한 size-only point는 categorical dispatch보다 먼저 standalone size legend를
  선택한다. Multiple size points는 explicit target을 요구한다. Standalone은 right만 지원하고 combined
  point-series+size block은 right/left를 지원한다.
- Explicit `["strokeWidth"]` 또는 유일한 stroke-width-only line/rule은 standalone stroke-width legend를 선택한다.
  It accepts `count`, uses the encoded quantitative scale and currently supports only right-side placement.
- `position`: categorical과 continuous color/opacity는 left를 포함한 네 방향을 지원한다.
  combined point-size legend는 right/left side position을 사용한다. chart-independent default는 `"right"`다.
- `align`: `"left" | "center" | "right"`, 기본 center. right와 left side position은
  첫 계약에서 center만 허용한다.
- `direction`: `"horizontal" | "vertical"`; top/bottom item-grid fill order를 결정하며 기본 horizontal이다.
- `columns`: positive integer; top/bottom grid의 최대 열 수. 생략하면 한 row에 가능한 item을 둔다.
- Categorical `layout`은 `"edge" | "legacy-bottom"`, default `"edge"`다. Bottom도 omission이면 reserved-margin grid다.
  기존 Canvas 하단 고정 single-row는 position bottom + layout legacy-bottom으로 명시한다. Labels y=height−28,
  title y=height−52이며 align/itemGap/recipe/styles/border를 지원한다. Columns, vertical direction, left title,
  offset≠8은 edge에서만 지원한다. Legacy mode에서 다른 edge로 옮길 때 layout edge도 같은 edit에 명시한다.
  기존 compact examples는 legacy-bottom으로 migration한다. Continuous/size/width/interval layout option은 아직 지원하지 않는다.
- `offset`: non-negative finite number, 기본 `8`; plot과 legend block 간 거리다.
- `titlePosition`: `"top" | "left"`, 기본 top. `"left"`는 horizontal categorical과 sampled opacity
  legend에서 title, symbol, label을 한 reading line으로 배치한다. Gradient와 side opacity는 `"top"`만 지원한다.
- `title`: non-empty string; 생략하면 encoded source field를 사용한다.
- `symbol`: `"auto"`, mark-specific shorthand, 또는 `{ layers: [...] }`. layer type은 `line | point | swatch`;
  각 layer는 non-negative size/stroke parameters와 supported point shape를 사용한다. Layered recipe는
  type별 최대 하나, 전체 최대 세 layer다.
- Point의 자동 typed recipe는 selected shape를 설명하며, selected color가 있을 때만 matching line을 합친다.
  Config의 inferredSymbol이 omission/auto와 caller recipe를 구분한다. Edit symbol auto와 encoding 제거 후 재생성은
  자동 recipe를 재추론하며 explicit recipe는 보존한다. Recipe의 layer 순서는 생성과 편집 모두 실제 drawing order다.
- `labels`, `titleStyle`: color/fontSize/fontFamily/fontWeight style object.
- `itemGap`: positive finite number; position별 default spacing을 override한다.
- `border`: `false | true | { color?, lineWidth?, padding?, background? }`; false가 default이며 true는
  default bordered background를 만든다.
- `count`: integer `2..10,000`; size, stroke-width, gradient tick-label 또는 opacity sample count이며 default `5`.
- Sequential midpoint가 있으면 gradient strip은 mark와 같은 mapper로 value를 색에 대응한다. Tick 위치는 value-linear이며 midpoint를 base count samples에 추가·deduplicate한다. Sample을 palette의 균등 위치로 오해하지 않는다. Evidence: `test/charts/color-midpoint/`, `test/unit/actions/scales/midpoint.test.js`.
- Full의 scale family 전환은 compatible right/vertical gradient↔interval을 같은 transaction으로 재생성한다. 보존·오류·default 정책은 CORE editScale이 소유한다. Explicit hidden/auto title와 이후 focused editor도 정상 적용된다. Evidence: `test/unit/actions/scales/color-transitions.test.js`.
- `gradient`: sequential color 전용 `{ length?, thickness? }`, defaults `120`과 `12`.
- Discretized quantitative Point/aggregate Bar/Rect color는 Full과 Basic에서 right/vertical interval swatches를 추론하고 `offset`, `itemGap`,
  swatch width/height/stroke, label/title style을 concrete graphics로 materialize한다.
- Effect: categorical semantics에는 scale/channel/title와 선택적 order policy를 저장하고 placement, recipe, fonts, border는
  graphical config와 concrete collection으로 만든다. resolved appearance domain에 order policy를 적용한 순서를 item order로 사용하며
  categorical/discretized resolved item cardinality는 최대 `10,000`이다.
- Composite layers share one item-local origin. Their concrete union bounds determine label placement and
  declared layer order determines rendering order in right, top, and bottom layouts.
- Two or more right- or left-side legend blocks share one side lane. Every block uses the same title start,
  symbol center, and label start columns, and adjacent occupied bounds keep at least 24 logical pixels of
  vertical space. Blocks are ordered by owning layer declaration and then color/series, size, opacity,
  stroke-width family order.
- Same-target categorical and size blocks retain their shared border group. Independent categorical,
  gradient, interval, opacity, and stroke-width blocks keep their own group bounds while participating in
  the same lane. A lane that does not fit the requested margin or Canvas height fails atomically.
- Two or more top- or bottom-positioned categorical, gradient, or opacity blocks share a horizontal-edge lane.
  The lane starts at the plot's left edge and places blocks consecutively in stable layer/family order with
  40 logical pixels between occupied bounds. A block moves to the next outward row only when it does not fit
  the remaining plot width. Each row shares one title baseline, one graphical-element start line, and an exact
  12-pixel title-to-element gap for default top titles. With `titlePosition: "left"`, categorical and sampled
  opacity blocks instead align one common center line; opacity uses 8 pixels from symbol to label and 20 pixels
  before the next sample. Top and bottom gradient/opacity labels otherwise follow their graphical element.
  Multi-legend placement ignores absolute block `align`; a single legend retains left/center/right placement.
  Each block keeps its item grid and direction.
- Coverage: series/histogram/grouped-bar/top/bottom/regression legend tests가 주요 layouts, recipes,
  borders, rematerialization과 invalid values를 검증한다. 모든 symbol-layer parameter pair는 부분적이다.
- Left categorical/point-composite/size는 vertical block order와 symbol→label/domain order를 유지한다.
- Proposed: —

### Formal values — `createLegend`

- Implemented: `createLegend({ target?: UserId; channels?: readonly LegendChannel[]; position?: LegendPosition; layout?: "edge" | "legacy-bottom"; align?: LegendAlign; direction?: LegendDirection; columns?: PositiveInteger; offset?: NonNegativeFinite; titlePosition?: "top" | "left"; title?: NonEmptyString; symbol?: "auto" | LegendSymbolLayer | { layers: readonly LegendSymbolLayer[] }; labels?: TextStyle; titleStyle?: TextStyle; itemGap?: PositiveFinite; border?: LegendBorder; count?: IntegerAtLeast2; gradient?: { length?: PositiveFinite; thickness?: PositiveFinite }; order?: "scale" | { values: readonly CategoryValue[] } | { channel: "x"|"y"|"theta" } } = {})`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createLegend`

- `target`
  - ✅ Covered: inferred/explicit line, bar, area and compatible point; sequential point/aggregate-bar gradient;
    ambiguity/invalid target.
- `channels`
  - ✅ Covered: color, strokeDash, color+strokeDash, point color-only swatch, point color+shape,
    duplicates/incompatible combinations.
  - ✅ Covered: explicit/inferred standalone point size, createGuides inference, multiple-target ambiguity and
    unchanged composite point-series+size dispatch.
  - ✅ Covered: exact explicit point color/shape/size subsets in Full/Basic and complete scatter facades;
    selected count, unselected encoding isolation, color swatch stability and combined owner ambiguity.
  - ✅ Covered: explicit/inferred standalone line/rule stroke width, count, right-side placement and scale
    rematerialization.
  - ✅ Covered: opacity as one continuous guide channel; constant opacity and incompatible mixes rejected.
- `position`
  - ✅ Covered: omission→`"right"`, `"right"`, `"bottom"`, `"top"`, invalid value.
  - ✅ Covered: `"left"` for categorical, point-composite/size, gradient and opacity.
  - ✅ Covered: standalone size right and unsupported standalone left rejection.
- `align`
  - ✅ Covered: top/bottom `"left" | "center" | "right"`, right center-only and invalid combinations.
- `direction`
  - ✅ Covered: `"horizontal" | "vertical"` top/bottom fill order and invalid value.
- `columns`
  - ✅ Covered: omitted, positive integer representative, invalid zero/non-integer.
- `offset`
  - ✅ Covered: default `8`, zero/positive, negative/non-finite rejection.
- `titlePosition`
  - ✅ Covered: categorical `"top" | "left"`; horizontal sampled opacity `"top" | "left"`; gradient and side
    opacity left-title rejection; defaults and invalid value.
- `title`
  - ✅ Covered: inferred field, explicit non-empty, empty/non-string rejection.
- `symbol`
  - ✅ Covered: `"auto"`, line shorthand, swatch shorthand, layered line+point recipes.
  - ✅ Covered: schema-driven layer validation covers circle/rect/line/path dimensions, fill/stroke and unknown keys;
    representative composite recipes prove authored order without exhaustive recipe products.
  - ✅ Covered: shared 12-shape point layers through the point-shape vocabulary.
  - ✅ Covered: point-composite symbols in top/bottom item grids with shared anchors and declared layer order.
  - ✅ Covered: sequential-color gradient block and opacity sample points with auto/explicit recipe.
- `labels`, `titleStyle`
  - ✅ Covered: representative color/font overrides and invalid styles.
  - ✅ Covered: shared text validation covers numeric/string boundaries and position-independent layout tests prove
    top/bottom/left/right forwarding.
- `itemGap`
  - ✅ Covered: default, zero, near-zero and positive item-gap boundaries with non-finite/negative rejection.
- `border`
  - ✅ Covered: omission/`false`, `true`, explicit color/lineWidth/padding/background and invalid objects.
- `count`
  - ✅ Covered: omission→5, integer `>=2`, `<2`/non-integer rejection for size block.
- ✅ Covered: gradient tick-label and opacity sample count with the same boundary contract.
- ✅ Covered: quantize/quantile/threshold interval labels, swatches, reverse와 exact primitive/public parity.
- `gradient`
  - ✅ Covered: positive length/thickness, four position-derived orientations, point/aggregate-bar consumers and
    categorical-option conflicts.
- ✅ Covered: left point-composite/size side layout and occupied-bounds failure.
- ✅ Covered: right/left multi-block column alignment, deterministic authoring order, 24-pixel stacking,
  gradient/opacity, interval/stroke-width, atomic overflow, and the actual-data Cars visual Gate.
- ✅ Covered: top/bottom plot-left sequential packing with 40-pixel gaps and width wrapping, shared top-title/element
  rows with exact 12-pixel spacing, fully inline categorical/opacity center lines, categorical/gradient/opacity with
  and without borders, authoring-order independence, edit/remove/scale/Canvas convergence, collision and overflow failure.
- Evidence: series, histogram, grouped-bar, top categorical, regression legend tests,
  `test/unit/layout/legend-lane.test.js`, `test/unit/actions/guides/multi-legend-lane.test.js`, and
  `test/charts/cars-multi-legend-layout/`.

## Categorical order evidence

`test/unit/actions/guides/legend-order.test.js`는 creation/edit/reset, domain·field compatibility, shared scale,
encoding removal/recreation, combined legend와 Polar 가이드를 검증한다. `test/charts/theta-legend-order/`는
독립 수치 oracle, primitive/public graphic·Canvas·decoded PNG·SVG/PDF 동등성을 검사한다.
`test/contracts/category-legend-order-types.test.js`는 positive/negative declaration 계약을 검사한다.

## `editLegend`

- Signature: `editLegend({ target?, position?, layout?, align?, direction?, columns?, offset?, titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?, gradient?, order? })`.
- `target` selects an existing logical legend by mark ID. It may be omitted only when exactly one target owns all
  active blocks; independent targets are ambiguous.
- At least one non-target change is required. Semantic `channels` and scale binding are intentionally not editable.
- Omitted values remain unchanged. Nested `labels`, `titleStyle`, `border`, and `gradient` objects merge supplied
  leaves. `title` accepts a custom non-empty string, `"auto"` for field inference, or `false` to hide its graphic.
- Categorical `layout` omission은 stored edge/legacy-bottom을 보존한다. Style/title/border edit나 Canvas/scale/encoding replay가
  mode를 바꾸지 않는다. Explicit editLegend/editLegendLayout({layout})만 mode를 전환한다.
- Categorical and combined point-size legends accept left/right side layout; the first left contract requires
  center alignment and vertical flow. `count` rematerializes an existing size block.
- Gradient edits own `count` and `gradient`; opacity edits own `count`, `itemGap`, and a single point symbol recipe.
  Horizontal opacity edits also own `titlePosition`; entering `"left"` without explicit spacing selects the inline
  8-pixel symbol-label and 20-pixel sample defaults.
  Interval edits own right/vertical spacing, swatch recipe, text style와 title visibility.
  Kind-incompatible options fail before the prior program changes.
- Standalone size edits own `title`, `count`, `labels`, and `titleStyle`, including focused title/label/count actions. Count is 2..10,000; custom/auto/hidden title and partial styles survive Canvas/scale/filter replay. Labels default to font12/normal and offset28 from sample center; titles to font13/600. Existing right-side origin, equal-area scale mapping, formatter and symbol defaults remain. Unrelated categorical targets never supply inherited appearance or placement. Basic creates size legends but does not expose editors. Layout, symbol, border, gradient and order remain unsupported for standalone size in this contract.
- Sampled size/stroke-width titleStyle accepts only color/fontSize/fontFamily/fontWeight; offset belongs to labels.
- Stroke-width edits own `title`, `count`, `labels`, and `titleStyle`. The block remains in its current right-side
  placement; layout, symbol, border, gradient and item-gap options are rejected before state changes. Label `offset`
  controls the distance after the fixed 32-pixel line sample. Custom/hidden/auto title transitions and partial text-style
  merges use the same modes as other legend kinds.
- Effect: stores graphical config immutably and invokes the corresponding wrapped rematerialization action.
  Categorical symbol recipe changes reconcile concrete graphic types without leaving stale objects. If the
  edited block participates in a side lane, all sibling blocks rematerialize before the lane is placed again.
- Errors: missing/ambiguous target, empty/unknown edit, invalid title mode, incompatible options, invalid count/style,
  insufficient margin, and overlap with left y-axis guides.

### Formal values — `editLegend`

- Implemented: the signature above with `title?: NonEmptyString | "auto" | false` and without `channels`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editLegend`

- ✅ Covered: inferred/explicit target and ambiguity/missing-target errors.
- ✅ Covered: left combined categorical/size position, partial nested style/border/count edits, and exact primitive
  equivalence.
- ✅ Covered: custom/hidden/auto title transitions and symbol recipe reconciliation.
- ✅ Covered: gradient count/extent and opacity count/gap/symbol edits with incompatible-kind rejection.
- ✅ Covered: standalone size count, exact equal-area radii, labels/titleStyle/offset, custom/hidden/auto title, focused editors, invalid/missing/ambiguous options, independent owners and Canvas/scale/filter replay.
- ✅ Covered: stroke-width count, labels/titleStyle, custom/hidden/auto title, right-side bounded option rejection and
  scale/Canvas rematerialization.
- ✅ Covered: Canvas/edit action-order convergence, insufficient margin, immutability, trace, browser/PNG parity.
- ✅ Covered: explicit edge/legacy-bottom default, mode transitions, focused color/title style preservation,
  Full/Basic nested creation, Canvas/scale/encoding-removal replay and incompatible legacy grid controls.
- Evidence: `test/unit/actions/guides/legend-bottom-layout.test.js` and bottom-mode pairs in
  `test/contracts/legend-lifecycle-render.test.js`.
- Evidence: `test/unit/actions/guides/legend-channel-selection.test.js` and
  `test/contracts/legend-content-render.test.js` prove selection, recipe provenance and ordered component replacement.
- Evidence: `test/unit/actions/guides/size-legend-editing.test.js`, `test/contracts/legend-lifecycle-render.test.js`,
  `test/unit/actions/guides/legend-edit-actions.test.js`,
  `test/unit/actions/guides/stroke-width-legend.test.js`,
  `test/unit/actions/guides/legend-lifecycle.test.js`, and regression-scatterplot left-legend variant.

## `editLegendLayout`

- Signature: `editLegendLayout({ target?, position?, layout?, align?, direction?, columns?, offset?, titlePosition?, itemGap? })`.
- Layout-only facade이며 최소 한 layout change를 요구하고 wrapped `editLegend`를 호출한다.

### Formal values — `editLegendLayout`

- Implemented: `editLegendLayout(options: EditLegendLayoutOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editLegendLayout`

- ✅ Covered: explicit/inferred target, left layout, invalid options and exact Gate parity.
- No proposal: semantic channel binding은 focused layout edit의 범위가 아니다.
- Evidence: `test/unit/actions/guides/legend-edit-actions.test.js` and Roadmap 3 focused-editing Gate.

## `editLegendLabels`

- Signature: `editLegendLabels({ target?, color?, fontSize?, fontFamily?, fontWeight? })`.
- Label style만 `editLegend({ labels })`로 전달한다. 최소 한 style change가 필요하다.

### Formal values — `editLegendLabels`

- Implemented: `editLegendLabels(options: EditLegendLabelsOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editLegendLabels`

- ✅ Covered: partial style merge, shared categorical/size application, trace and invalid option rejection.
- No proposal: label text는 resolved domain이 소유하며 appearance action으로 교체하지 않는다.
  Empty-string nominal values는 domain에서는 보존하고 visible label은 deterministic `(empty)`로 표시한다.
- Evidence: `test/unit/actions/guides/legend-edit-actions.test.js`.

## `editLegendTitle`

- Signature: `editLegendTitle({ target?, title?, color?, fontSize?, fontFamily?, fontWeight? })`.
- `title`은 `NonEmptyString | "auto" | false`; 나머지는 `titleStyle`로 전달한다.

### Formal values — `editLegendTitle`

- Implemented: `editLegendTitle(options: EditLegendTitleOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editLegendTitle`

- ✅ Covered: style-only edit, title mode validation and nested `editLegend` trace.
- No proposal: title 위치는 `editLegendLayout`의 `titlePosition`이 소유한다.
- Evidence: `test/unit/actions/guides/legend-edit-actions.test.js`.

## `editLegendSymbols`

- Signature: `editLegendSymbols({ target?, symbol?, count?, gradient?, order? })`.
- Legend kind별 기존 symbol/count/gradient validation을 그대로 사용한다.

### Formal values — `editLegendSymbols`

- Implemented: `editLegendSymbols(options: EditLegendSymbolsOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editLegendSymbols`

- ✅ Covered: combined categorical-size count, kind incompatibility and rematerialization.
- No proposal: symbol/count/gradient 외 kind-specific component는 현재 없다.
- Evidence: `test/unit/actions/guides/legend-edit-actions.test.js`.

## `editLegendBorder`

- Signature: `editLegendBorder({ target?, border })`.
- `border`는 `boolean | LegendBorderOptions`이며 required다.

### Formal values — `editLegendBorder`

- Implemented: `editLegendBorder(options: EditLegendBorderOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editLegendBorder`

- ✅ Covered: partial border merge, invalid boundary and exact Gate parity.
- No proposal: border removal은 `border: false`로 표현한다.
- Evidence: `test/unit/actions/guides/legend-edit-actions.test.js` and Roadmap 3 focused-editing Gate.

Focused actions는 별도 stored schema를 만들지 않고 `editLegend`의 target resolution, closed kind policy,
config normalization과 rematerialization을 공유한다. Evidence:
`test/unit/actions/guides/legend-edit-actions.test.js` and Roadmap 3 focused-editing Gate.

## `removeLegend`

- Signature: `removeLegend({ target?, channels? } = {})`.
- `target`은 explicit mark ID 또는 unique existing legend owner로 resolve한다. Multiple owners는 `channels`가 한
  target에만 존재하더라도 explicit target을 요구해서 기존 target inference를 유지한다.
- Omitted `channels`는 one stable mark target에 속한 모든 categorical, size, continuous color, interval, opacity와
  stroke-width block을 complete semantic/graphic/config resource 단위로 제거하는 기존 behavior다.
- Explicit `channels`는 unique non-empty subset of
  `"color" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity"`이며 matching complete block만
  제거한다. Combined categorical block은 stored represented channel set 전체를 한 call에 지정해야 한다. 일부만
  요청하면 collateral removal 대신 오류다. Missing block, duplicate/unknown channel과 empty selection도 오류다.
- Retained block은 그대로 보존하고 categorical+size 또는 same-side lane layout dependency가 바뀌면 existing
  `rematerializeLegend`를 wrapped child로 호출한다. Categorical block만 제거하고 size를 보존하면 inherited categorical typography를
  해제하고 standalone defaults/position에서 다시 materialize한다. Removed composite block은 retained size를
  재생성하지 않고 ordinary `createLegend`로 다시 만들 수 있다.
- Mark encodings, resolved/semantic scales와 source data는 제거하지 않는다. Shared semantic-kind state는 another
  retained block이 소유할 때 삭제하지 않는다. 모든 selector validation은 첫 state change 전에 끝난다.

### Formal values — `removeLegend`

- Implemented: `removeLegend(options?: { target?: UserId; channels?: readonly LegendChannel[] })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeLegend`

- ✅ Covered: inferred/explicit/ambiguous/unknown target, omitted whole-target compatibility and complete categorical
  cleanup.
- ✅ Covered: combined categorical complete/partial selection, independent size/opacity removal, standalone categorical,
  gradient, interval and stroke-width removal, retained-block rematerialization and recreation.
- ✅ Covered: empty/duplicate/unknown/missing channels, encoding/scale preservation and prior-program/caller immutability.
- Evidence: `test/unit/actions/guides/remove-guides.test.js`,
  `test/unit/actions/guides/legend-lifecycle.test.js`, and `test/contracts/legend-lifecycle-render.test.js`.

## `createGuides`

- Signature: `createGuides({ axes?, grid?, legend? })`.
- `axes`, `grid`, `legend`: 해당 child option object, `false`, 또는 생략. 생략은 semantic applicability
  inference, `{}`는 명시적 선택+inference, false는 opt-out이다.
- Effect: applicable axes → grid → legend wrapped actions을 deterministic order로 호출한다. title은 guide가
  아니므로 포함하지 않는다.
- Lifecycle: aggregate create-only다. 생성 뒤 변경과 제거는 axis, grid와 legend child action이 소유한다.
  Generic `editGuides`는 의도적으로 없으며 aggregate에 별도 edit gap은 없다.
- Direct 호출은 계속 strict create다. Chart facade의 missing-only 보완과 호환성 검사는
  [공통 facade guide 계약](BASIC_CHARTS.md#facade-guide-reuse)이 소유하며 이 action을 idempotent edit로 바꾸지 않는다.
- Polar omission은 실제 저장된 theta/radius channel별 axis와 grid만 선택한다. Arc color encoding은
  categorical legend applicability에 포함되며 theta-only count arc는 radial guide를 합성하지 않는다.
- 오류: explicit/automatic selection 결과가 하나도 없거나 child resource inference가 ambiguous하면 거부한다.
- Coverage: `test/unit/actions/guides/guide-collection-actions.test.js`와 size/regression/density guide tests가
  chart-type applicability, standalone size inference, forwarding, opt-out, ambiguity와 trace를 검증한다.

### Formal values — `createGuides`

- Implemented: `createGuides({ axes?: false | Parameters<ChartProgram["createAxes"]>[0]; grid?: false | Parameters<ChartProgram["createGrid"]>[0]; legend?: false | Parameters<ChartProgram["createLegend"]>[0] } = {})`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —; new guide type requires an approved child action first.

### Value coverage — `createGuides`

- `axes`, `grid`, `legend`
  - ✅ Covered: omission/applicability inference, `{}` explicit selection, nested options, `false` opt-out.
  - ✅ Covered: theta-only arc의 theta axis/grid + color legend, radial guide absence.
  - ✅ Covered: unsupported/non-object values, no selected guide and ambiguous child errors.
  - ✅ Covered: all-three selection, nested forwarding and child order are executable; leaf actions own exhaustive
    nested value classes so the aggregate does not duplicate their Cartesian product.
- ✅ Covered: automatic continuous-color/opacity selection and nested continuous legend options.
  - ✅ Covered: nested top/right axes and categorical left legend forwarding.
- No proposal: title remains intentionally separate. New guide types should be added only with a concrete domain action.
- Evidence: `test/unit/actions/guides/guide-collection-actions.test.js` and density/regression guide tests.

## `createTitle`

- Signature: `createTitle({ text, subtitle?, position?, align?, offset?, gap?, maxWidth?, wrap?, lineHeight?, titleStyle?, subtitleStyle? })`.
- `text`: 필수 non-empty string; `subtitle`은 optional non-empty single-line string이다. 첫 contract는 explicit newline을 거부한다.
- `position`: `"top" | "bottom" | "left" | "right"`; 기본 top. top/bottom rotation은 0, left는
  `-Math.PI / 2`, right는 `Math.PI / 2`다.
- `align`: `"left" | "center" | "right"`, 기본 left; plot bounds 기준이다. Facet parent title은 translated child
  plot bounds의 union을 사용하며 child margin, axis text/title, composition padding과 shared legend를 제외한다.
- top/bottom align은 plot의 x start/center/end이고 left/right align은 edge 진행 방향의
  top/center/bottom이다.
- `offset`: finite number, 기본 `0`; top/bottom은 y, left/right는 x Canvas axis에서 block을 이동한다.
- `gap`: non-negative finite number, 기본 `8`; title/subtitle 사이 거리다.
- `maxWidth`: positive finite reading-axis width. 지정하면 wrapping이 활성화되고 `wrap` 기본값은 `"word"`다.
- `wrap`: `"word" | "character"`; `maxWidth` 없이 지정하면 오류다. word mode의 oversized token은
  character fallback을 사용하고 character mode는 Unicode code point boundary를 보존한다.
- `lineHeight`: positive finite number; `maxWidth`가 필요하고 title/subtitle의 resolved fontSize 이상이어야 한다.
  생략 시 각 style의 fontSize × `1.2`를 사용한다.
- `titleStyle`, `subtitleStyle`: `{ color?, fontSize?, fontFamily?, fontWeight? }`; positive fontSize,
  non-empty strings와 string/finite weight를 사용한다.
- Effect: text만 semanticSpec에 저장하고 geometry/style은 concrete text graphics와 title config에 저장한다.
  wrapping은 shared deterministic text metric으로 materialization하고 renderer는 line break를 추론하지 않는다.
  실제 rotated occupied bounds가 해당 margin에 맞지 않거나 same-edge guide와 겹치면 오류다.

### Formal values — `createTitle`

- Implemented: `createTitle({ text: NonEmptyString; subtitle?: NonEmptyString; position?: TitlePosition; align?: "left" | "center" | "right"; offset?: Finite; gap?: NonNegativeFinite; maxWidth?: PositiveFinite; wrap?: TitleWrap; lineHeight?: PositiveFinite; titleStyle?: TextStyle; subtitleStyle?: TextStyle })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createTitle`

- `text`, `subtitle`
  - ✅ Covered: required non-empty title, subtitle omitted/present, empty/non-string rejection.
- `position`
  - ✅ Covered: omission→`"top"`, all four positions, rotation, align/offset, invalid value.
- `align`
  - ✅ Covered: `"left" | "center" | "right"`, default left, invalid value, asymmetric unit margins와
    facet child-plot union.
- `offset`
  - ✅ Covered: zero/default, positive/negative finite values within layout, non-finite/out-of-layout rejection.
- `gap`
  - ✅ Covered: default `8`, zero/positive, negative/non-finite rejection.
- `titleStyle`, `subtitleStyle`
  - ✅ Covered: default and explicit color/fontSize/fontFamily/fontWeight, invalid values.
- ✅ Covered: word/character wrapping, long-token fallback, Unicode, maxWidth dependency, inferred/explicit lineHeight.
- ✅ Covered: actual occupied-bounds failures, same-edge guide collision, Canvas rematerialization and
  primitive/public exact equivalence.
- Evidence: `test/unit/actions/guides/title-actions.test.js` and
  `test/unit/actions/composition/facet.test.js`.

## `editTitle`

- Signature: `editTitle({ text?, subtitle?, position?, align?, offset?, gap?, maxWidth?, wrap?, lineHeight?, titleStyle?, subtitleStyle? })`.
- 기존 chart title이 필수이며 최소 한 option을 요구한다. Omitted property는 기존 값을 유지한다.
- `text`와 string `subtitle`은 semantic text를 교체하고 `subtitle: false`는 semantic subtitle과 concrete
  subtitle graphics를 제거한다. 이후 string subtitle로 다시 만들 수 있다.
- `titleStyle`과 `subtitleStyle`은 제공된 leaf만 기존 graphical config에 merge한다.
- Layout/wrapping option은 stored complete config와 합친 뒤 `createTitle`과 동일한 contract로 검증한다.
- Effect: semantic text edit와 graphical config update를 분리하고 wrapped `rematerializeTitle`을 호출한다.
  single text와 wrapped text collection, subtitle 존재 여부와 edge rotation 변화는 stale graphic 없이 reconcile한다.
- Errors: missing title, empty/unknown edit, invalid value/dependency, insufficient margin와 same-edge collision.

### Formal values — `editTitle`

- Implemented: `editTitle({ text?: NonEmptyString; subtitle?: NonEmptyString | false; position?: TitlePosition; align?: "left" | "center" | "right"; offset?: Finite; gap?: NonNegativeFinite; maxWidth?: PositiveFinite; wrap?: TitleWrap; lineHeight?: PositiveFinite; titleStyle?: TextStyle; subtitleStyle?: TextStyle })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editTitle`

- ✅ Covered: text/subtitle replacement, subtitle removal/restoration and empty edit rejection.
- ✅ Covered: four-edge transition, partial nested style merge and existing wrapping-config merge.
- ✅ Covered: single/collection reconciliation, rotation-property reconciliation, trace and immutability.
- ✅ Covered: Canvas/edit action-order convergence, insufficient margin, guide collision and exact variant equivalence.
- Evidence: `test/unit/actions/guides/title-actions.test.js` and density-area wrapped-title variant tests.

## `removeTitle`

- Signature: `removeTitle()`.
- Removes semantic title/subtitle, every concrete title graphic and stored title materialization config. It accepts
  no options and requires an existing title resource.

### Formal values — `removeTitle`

- Implemented: `removeTitle(): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeTitle`

- ✅ Covered: title/subtitle cleanup, no-options validation, missing-resource behavior and immutability.
- Evidence: `test/unit/actions/guides/remove-guides.test.js` and Roadmap 3 focused-editing Gate.
