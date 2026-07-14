# Legend and title action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## Shared formal types

```typescript
type LegendPosition = "right" | "bottom" | "top";
type PlannedLegendPosition = LegendPosition | "left";
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
```

## `createLegend`

- Signature: `createLegend({ target?, channels?, position?, align?, direction?, columns?, offset?, titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count? })`.
- `target`: compatible mark ID; 생략하면 current 또는 유일한 eligible mark를 추론한다.
- `channels`: unique subset of `"color" | "strokeDash" | "shape"`; 생략하면 target의 compatible
  channels를 추론한다. Current legends require categorical channels; Planned sequential color selects
  the gradient contract instead of categorical items.
- `position`: Implemented `"right" | "bottom" | "top"`와 Planned `"left"`; chart-independent
  default는 `"right"`다.
- `align`: `"left" | "center" | "right"`, 기본 center. right와 Planned left side position은
  첫 계약에서 center만 허용한다.
- `direction`: `"horizontal" | "vertical"`; top item-grid fill order를 결정하며 기본 horizontal이다.
- `columns`: positive integer; top grid의 최대 열 수. 생략하면 한 row에 가능한 item을 둔다.
- `offset`: non-negative finite number, 기본 `8`; plot과 legend block 간 거리다.
- `titlePosition`: `"top" | "left"`, 기본 top.
- `title`: non-empty string; 생략하면 encoded source field를 사용한다.
- `symbol`: `"auto"`, mark-specific shorthand, 또는 `{ layers: [...] }`. layer type은 `line | point | swatch`;
  각 layer는 non-negative size/stroke parameters와 supported point shape를 사용한다.
- `labels`, `titleStyle`: color/fontSize/fontFamily/fontWeight style object.
- `itemGap`: positive finite number; position별 default spacing을 override한다.
- `border`: `false | true | { color?, lineWidth?, padding?, background? }`; false가 default이며 true는
  default bordered background를 만든다.
- `count`: integer `>= 2`; size legend symbol count 또는 Planned gradient tick-label count이며 default `5`.
- Effect: categorical semantics에는 scale/channel/title만 저장하고 placement, recipe, fonts, border는
  graphical config와 concrete collection으로 만든다. resolved domain order를 item order로 사용한다.
- Coverage: series/histogram/grouped-bar/top/regression legend tests가 주요 layouts, recipes,
  borders, rematerialization과 invalid values를 검증한다. 모든 symbol-layer parameter pair는 부분적이다.
- Planned: left categorical/point-composite/size side layout, point-composite top/bottom layout and
  continuous-color gradient legend.
- Proposed: —

### Formal values — `createLegend`

- Implemented: `createLegend({ target?: UserId; channels?: readonly ("color" | "strokeDash" | "shape")[]; position?: LegendPosition; align?: LegendAlign; direction?: LegendDirection; columns?: PositiveInteger; offset?: NonNegativeFinite; titlePosition?: "top" | "left"; title?: NonEmptyString; symbol?: "auto" | LegendSymbolLayer | { layers: readonly LegendSymbolLayer[] }; labels?: TextStyle; titleStyle?: TextStyle; itemGap?: PositiveFinite; border?: LegendBorder; count?: IntegerAtLeast2 } = {})`
- Planned (NOT IMPLEMENTED): `{ position?: PlannedLegendPosition; gradient?: { length?: PositiveFinite; thickness?: PositiveFinite } }`; left supports categorical, point-composite and size side layouts, top/bottom support layered point-composite symbols, and sequential color uses a continuous gradient block.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createLegend`

- `target`
  - ✅ Covered: inferred/explicit line, bar, area and compatible point; ambiguity/invalid target.
- `channels`
  - ✅ Covered: color, strokeDash, color+strokeDash, point color+shape, duplicates/incompatible combinations.
- `position`
  - ✅ Covered: omission→`"right"`, `"right"`, `"bottom"`, `"top"`, invalid value.
  - 🟡 Planned: `"left"`; categorical, point-composite/size parity and left-margin geometry.
- `align`
  - ✅ Covered: top/bottom `"left" | "center" | "right"`, right center-only and invalid combinations.
- `direction`
  - ✅ Covered: `"horizontal" | "vertical"` top fill order and invalid value.
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
  - 🟡 Planned: shared 12-shape point layers through the point-shape vocabulary.
  - 🟡 Planned: point-composite symbols in top/bottom item grids.
  - 🟡 Planned: sequential-color gradient block; categorical symbol recipes remain unchanged.
- `labels`, `titleStyle`
  - ✅ Covered: representative color/font overrides and invalid styles.
  - ⚠️ Partial: numeric/string fontWeight boundaries across every position.
- `itemGap`
  - ✅ Covered: defaults and positive representative; ⚠️ Partial exact near-zero boundary.
- `border`
  - ✅ Covered: omission/`false`, `true`, explicit color/lineWidth/padding/background and invalid objects.
- `count`
  - ✅ Covered: omission→5, integer `>=2`, `<2`/non-integer rejection for size block.
  - 🟡 Planned: gradient tick-label count with the same boundary contract.
- `gradient`
  - 🟡 Planned: positive length/thickness, position-derived orientation and categorical-option conflicts.
- 🟡 Planned: left point-composite/size side layout, point-composite top/bottom layout and continuous color legends.
- Evidence: series, histogram, grouped-bar, top categorical and regression legend tests.

## `createGuides`

- Signature: `createGuides({ axes?, grid?, legend? })`.
- `axes`, `grid`, `legend`: 해당 child option object, `false`, 또는 생략. 생략은 semantic applicability
  inference, `{}`는 명시적 선택+inference, false는 opt-out이다.
- Effect: applicable axes → grid → legend wrapped actions을 deterministic order로 호출한다. title은 guide가
  아니므로 포함하지 않는다.
- 오류: explicit/automatic selection 결과가 하나도 없거나 child resource inference가 ambiguous하면 거부한다.
- Coverage: `test/unit/actions/guides/guide-collection-actions.test.js`와 regression/density guide tests가
  chart-type applicability, forwarding, opt-out, ambiguity와 trace를 검증한다.

### Formal values — `createGuides`

- Implemented: `createGuides({ axes?: false | Parameters<ChartProgram["createAxes"]>[0]; grid?: false | Parameters<ChartProgram["createGrid"]>[0]; legend?: false | Parameters<ChartProgram["createLegend"]>[0] } = {})`
- Planned (NOT IMPLEMENTED): nested axes가 top/right positions, nested legend가 left position을 전달한다.
- Proposed (NOT IMPLEMENTED): —; new guide type requires an approved child action first.

### Value coverage — `createGuides`

- `axes`, `grid`, `legend`
  - ✅ Covered: omission/applicability inference, `{}` explicit selection, nested options, `false` opt-out.
  - ✅ Covered: unsupported/non-object values, no selected guide and ambiguous child errors.
  - ⚠️ Partial: explicit selection of all three with every nested option family simultaneously.
- 🟡 Planned: nested top/right axes와 left legend forwarding.
- No proposal: title remains intentionally separate. New guide types should be added only with a concrete domain action.
- Evidence: `test/unit/actions/guides/guide-collection-actions.test.js` and density/regression guide tests.

## `createTitle`

- Signature: `createTitle({ text, subtitle?, position?, align?, offset?, gap?, titleStyle?, subtitleStyle? })`.
- `text`: 필수 non-empty string; `subtitle`은 optional non-empty single-line string.
- `position`: Implemented `"top"`, Planned `"bottom" | "left" | "right"`; 기본 top.
- `align`: `"left" | "center" | "right"`, 기본 left; plot bounds 기준이다.
- `offset`: finite number, 기본 `0`; top block의 vertical origin을 이동한다.
- `gap`: non-negative finite number, 기본 `8`; title/subtitle 사이 거리다.
- `titleStyle`, `subtitleStyle`: `{ color?, fontSize?, fontFamily?, fontWeight? }`; positive fontSize,
  non-empty strings와 string/finite weight를 사용한다.
- Effect: text만 semanticSpec에 저장하고 geometry/style은 concrete text graphics와 title config에 저장한다.
  top legend와 실제 occupied bounds가 겹치거나 margin에 맞지 않으면 오류다.
- Coverage: `test/unit/actions/guides/title-actions.test.js`가 optional subtitle, alignment, style,
  insufficient layout, duplicates와 Canvas rematerialization을 검증한다.
- Planned: bottom/left/right positions plus wrapping, maxWidth, lineHeight and deterministic text measurement.

### Formal values — `createTitle`

- Implemented: `createTitle({ text: NonEmptyString; subtitle?: NonEmptyString; position?: "top"; align?: "left" | "center" | "right"; offset?: Finite; gap?: NonNegativeFinite; titleStyle?: TextStyle; subtitleStyle?: TextStyle })`
- Planned (NOT IMPLEMENTED): `{ position?: "top" | "bottom" | "left" | "right"; maxWidth?: PositiveFinite; lineHeight?: PositiveFinite; wrap?: "word" | "character" }`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createTitle`

- `text`, `subtitle`
  - ✅ Covered: required non-empty title, subtitle omitted/present, empty/non-string rejection.
- `position`
  - ✅ Covered: omission→`"top"`, explicit top, invalid value.
  - 🟡 Planned: `"bottom" | "left" | "right"`; occupied bounds, rotation과 guide collision contract.
- `align`
  - ✅ Covered: `"left" | "center" | "right"`, default left and invalid value.
- `offset`
  - ✅ Covered: zero/default, positive/negative finite values within layout, non-finite/out-of-layout rejection.
- `gap`
  - ✅ Covered: default `8`, zero/positive, negative/non-finite rejection.
- `titleStyle`, `subtitleStyle`
  - ✅ Covered: default and explicit color/fontSize/fontFamily/fontWeight, invalid values.
- 🟡 Planned: word/character wrapping, maxWidth, explicit/inferred lineHeight and deterministic text measurement.
- Evidence: `test/unit/actions/guides/title-actions.test.js`.
