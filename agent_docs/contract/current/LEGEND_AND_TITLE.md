# Legend and title action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## Shared formal types

```typescript
type LegendPosition = "right" | "bottom" | "top" | "left";
type LegendAlign = "left" | "center" | "right";
type LegendDirection = "horizontal" | "vertical";
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

- Signature: `createLegend({ target?, channels?, position?, align?, direction?, columns?, offset?, titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?, gradient? })`.
- `target`: compatible mark ID; 생략하면 current 또는 유일한 eligible mark를 추론한다. Sequential gradient는
  point와 aggregate bar를 지원한다.
- `channels`: unique compatible subset of `"color" | "strokeDash" | "shape" | "size" | "opacity"`. 생략하면
  target의 compatible channels를 추론한다. Sequential color는 gradient, field-driven opacity는 sampled
  point block을 선택한다. Opacity는 단독 channel만 지원한다.
- Point의 explicit color-only selection은 color swatch legend를 만들고, shape 또는 composite channel
  선택은 typed point series legend를 만든다.
- Explicit `["size"]` 또는 유일한 size-only point는 categorical dispatch보다 먼저 standalone size legend를
  선택한다. Multiple size points는 explicit target을 요구한다. Standalone은 right만 지원하고 combined
  point-series+size block은 right/left를 지원한다.
- `position`: categorical과 continuous color/opacity는 left를 포함한 네 방향을 지원한다.
  combined point-size legend는 right/left side position을 사용한다. chart-independent default는 `"right"`다.
- `align`: `"left" | "center" | "right"`, 기본 center. right와 left side position은
  첫 계약에서 center만 허용한다.
- `direction`: `"horizontal" | "vertical"`; top/bottom item-grid fill order를 결정하며 기본 horizontal이다.
- `columns`: positive integer; top/bottom grid의 최대 열 수. 생략하면 한 row에 가능한 item을 둔다.
- `position: "bottom"`만 지정한 기존 호출은 Canvas bottom에 고정된 compact single-row layout을 유지한다.
  `columns`, `direction`, `offset`, `titlePosition`, `itemGap` 중 하나를 명시하면 reserved-margin grid를 사용한다.
- `offset`: non-negative finite number, 기본 `8`; plot과 legend block 간 거리다.
- `titlePosition`: `"top" | "left"`, 기본 top.
- `title`: non-empty string; 생략하면 encoded source field를 사용한다.
- `symbol`: `"auto"`, mark-specific shorthand, 또는 `{ layers: [...] }`. layer type은 `line | point | swatch`;
  각 layer는 non-negative size/stroke parameters와 supported point shape를 사용한다.
- `labels`, `titleStyle`: color/fontSize/fontFamily/fontWeight style object.
- `itemGap`: positive finite number; position별 default spacing을 override한다.
- `border`: `false | true | { color?, lineWidth?, padding?, background? }`; false가 default이며 true는
  default bordered background를 만든다.
- `count`: integer `>= 2`; size, gradient tick-label 또는 opacity sample count이며 default `5`.
- `gradient`: sequential color 전용 `{ length?, thickness? }`, defaults `120`과 `12`.
- Discretized quantitative color는 right/vertical interval swatches를 추론하고 `offset`, `itemGap`,
  swatch width/height/stroke, label/title style을 concrete graphics로 materialize한다.
- Effect: categorical semantics에는 scale/channel/title만 저장하고 placement, recipe, fonts, border는
  graphical config와 concrete collection으로 만든다. resolved domain order를 item order로 사용한다.
- Composite layers share one item-local origin. Their concrete union bounds determine label placement and
  declared layer order determines rendering order in right, top, and bottom layouts.
- Coverage: series/histogram/grouped-bar/top/bottom/regression legend tests가 주요 layouts, recipes,
  borders, rematerialization과 invalid values를 검증한다. 모든 symbol-layer parameter pair는 부분적이다.
- Left categorical/point-composite/size는 vertical block order와 symbol→label/domain order를 유지한다.
- Proposed: —

### Formal values — `createLegend`

- Implemented: `createLegend({ target?: UserId; channels?: readonly ("color" | "strokeDash" | "shape" | "size" | "opacity")[]; position?: LegendPosition; align?: LegendAlign; direction?: LegendDirection; columns?: PositiveInteger; offset?: NonNegativeFinite; titlePosition?: "top" | "left"; title?: NonEmptyString; symbol?: "auto" | LegendSymbolLayer | { layers: readonly LegendSymbolLayer[] }; labels?: TextStyle; titleStyle?: TextStyle; itemGap?: PositiveFinite; border?: LegendBorder; count?: IntegerAtLeast2; gradient?: { length?: PositiveFinite; thickness?: PositiveFinite } } = {})`
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
  - ✅ Covered: `"top" | "left"`, defaults and invalid value.
- `title`
  - ✅ Covered: inferred field, explicit non-empty, empty/non-string rejection.
- `symbol`
  - ✅ Covered: `"auto"`, line shorthand, swatch shorthand, layered line+point recipes.
  - ⚠️ Partial: every layer type's zero/max dimensions, fill/stroke combinations and invalid nested keys.
  - ✅ Covered: shared 12-shape point layers through the point-shape vocabulary.
  - ✅ Covered: point-composite symbols in top/bottom item grids with shared anchors and declared layer order.
  - ✅ Covered: sequential-color gradient block and opacity sample points with auto/explicit recipe.
- `labels`, `titleStyle`
  - ✅ Covered: representative color/font overrides and invalid styles.
  - ⚠️ Partial: numeric/string fontWeight boundaries across every position.
- `itemGap`
  - ✅ Covered: defaults and positive representative; ⚠️ Partial exact near-zero boundary.
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
- Evidence: series, histogram, grouped-bar, top categorical, Phase 2 composite and regression legend tests.

## `editLegend`

- Signature: `editLegend({ target?, position?, align?, direction?, columns?, offset?, titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?, gradient? })`.
- `target` selects an existing logical legend by mark ID. It may be omitted only when exactly one target owns all
  active blocks; independent targets are ambiguous.
- At least one non-target change is required. Semantic `channels` and scale binding are intentionally not editable.
- Omitted values remain unchanged. Nested `labels`, `titleStyle`, `border`, and `gradient` objects merge supplied
  leaves. `title` accepts a custom non-empty string, `"auto"` for field inference, or `false` to hide its graphic.
- Categorical and combined point-size legends accept left/right side layout; the first left contract requires
  center alignment and vertical flow. `count` rematerializes an existing size block.
- Gradient edits own `count` and `gradient`; opacity edits own `count`, `itemGap`, and a single point symbol recipe.
  Interval edits own right/vertical spacing, swatch recipe, text style와 title visibility.
  Kind-incompatible options fail before the prior program changes.
- Effect: stores graphical config immutably and invokes the corresponding wrapped rematerialization action.
  Categorical symbol recipe changes reconcile concrete graphic types without leaving stale objects.
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
- ✅ Covered: Canvas/edit action-order convergence, insufficient margin, immutability, trace, browser/PNG parity.
- Evidence: `test/unit/actions/guides/legend-edit-actions.test.js` and regression-scatterplot left-legend variant.

## `editLegendLayout`

- Signature: `editLegendLayout({ target?, position?, align?, direction?, columns?, offset?, titlePosition?, itemGap? })`.
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

- Signature: `editLegendSymbols({ target?, symbol?, count?, gradient? })`.
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

- Signature: `removeLegend({ target? } = {})`.
- One stable mark target에 속한 categorical, size, continuous color and opacity legend blocks를 complete
  semantic/graphic/config resource 단위로 제거한다. A unique target may be inferred; independent legends require
  `target`. Mark encodings and scales remain unchanged.

### Formal values — `removeLegend`

- Implemented: `removeLegend(options?: { target?: UserId })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeLegend`

- ✅ Covered: inferred/explicit target, unknown target, complete categorical cleanup and Gate parity.
- Evidence: `test/unit/actions/guides/remove-guides.test.js` and Roadmap 3 focused-editing Gate.

## `createGuides`

- Signature: `createGuides({ axes?, grid?, legend? })`.
- `axes`, `grid`, `legend`: 해당 child option object, `false`, 또는 생략. 생략은 semantic applicability
  inference, `{}`는 명시적 선택+inference, false는 opt-out이다.
- Effect: applicable axes → grid → legend wrapped actions을 deterministic order로 호출한다. title은 guide가
  아니므로 포함하지 않는다.
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
  - ⚠️ Partial: explicit selection of all three with every nested option family simultaneously.
- ✅ Covered: automatic continuous-color/opacity selection and nested continuous legend options.
  - ✅ Covered: nested top/right axes and categorical left legend forwarding.
- No proposal: title remains intentionally separate. New guide types should be added only with a concrete domain action.
- Evidence: `test/unit/actions/guides/guide-collection-actions.test.js` and density/regression guide tests.

## `createTitle`

- Signature: `createTitle({ text, subtitle?, position?, align?, offset?, gap?, maxWidth?, wrap?, lineHeight?, titleStyle?, subtitleStyle? })`.
- `text`: 필수 non-empty string; `subtitle`은 optional non-empty single-line string이다. 첫 contract는 explicit newline을 거부한다.
- `position`: `"top" | "bottom" | "left" | "right"`; 기본 top. top/bottom rotation은 0, left는
  `-Math.PI / 2`, right는 `Math.PI / 2`다.
- `align`: `"left" | "center" | "right"`, 기본 left; plot bounds 기준이다.
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
  - ✅ Covered: `"left" | "center" | "right"`, default left and invalid value.
- `offset`
  - ✅ Covered: zero/default, positive/negative finite values within layout, non-finite/out-of-layout rejection.
- `gap`
  - ✅ Covered: default `8`, zero/positive, negative/non-finite rejection.
- `titleStyle`, `subtitleStyle`
  - ✅ Covered: default and explicit color/fontSize/fontFamily/fontWeight, invalid values.
- ✅ Covered: word/character wrapping, long-token fallback, Unicode, maxWidth dependency, inferred/explicit lineHeight.
- ✅ Covered: actual occupied-bounds failures, same-edge guide collision, Canvas rematerialization and
  primitive/public exact equivalence.
- Evidence: `test/unit/actions/guides/title-actions.test.js`.

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
