# Legend and title action contracts

제목과 범례의 충돌 검사는 단일 text와 줄바꿈 text collection의 실제 occupied bounds를 사용한다.
같은 edge의 chart title/subtitle, Cartesian axis component와 legend group 사이 실제 겹침은 작성 순서와 무관하게 거절한다. 서로 다른 edge의 block은 이 검사에서 비교하지 않는다.

## Shared guide collision contract

- Color/series/gradient/interval/size/opacity/strokeWidth의 네 edge에 같은 검증을 적용한다. 같은 target의 categorical+size는 하나의 group이며 retained border도 bounds에 포함한다.
- Axis line/ticks/labels/title는 각자의 position과 실제 stroke·rotation·collection bounds를 사용한다. Axis 내부 component 제약은 axis owner가 별도로 담당한다.
- 서로 독립적인 legend group과 title↔axis, title↔legend, axis↔legend의 strict intersection은 오류다. 경계가 닿는 것만으로는 오류가 아니다.
- Create/edit와 Canvas/scale/dependent replay는 해당 aggregate의 최종 guide geometry를 검증한다. 실패 시 이전 program의 semantic/graphic/config/context/trace는 변하지 않는다.
- 공간이 부족하면 margin 또는 offset을 명시적으로 바꿔야 한다. Canvas 자동 확대나 임의 재배치는 없다. Public extension primitive의 의도된 overlay는 이 domain 검증에 포함하지 않는다.
- Chart title을 먼저 만들어도 bordered gradient/opacity를 생성·편집·재생성할 수 있으며, 동등한 최종 옵션은 title-last와 같은 graphicSpec/drawing order가 된다.
- Evidence: `test/unit/actions/guides/guide-collisions.test.js`, packed Node consumer와 동일 artifact browser Canvas/SVG.

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
  Point의 ordinal color/shape와 quantitative size는 채널 생략 시 실제 encoding의 전체 집합으로 추론한다.
  일곱 nonempty subset 모두 explicit 선택과 같은 semantic/config/graphic 결과이며, color+size와 shape+size도 size를 누락하지 않는다.
  Size companion을 추론할 point 후보가 여럿이면 target을 요구하며 categorical-only로 조용히 축소하지 않는다.
- Point의 inferred/explicit color-only selection은 color swatch legend를 만들고, shape 또는 composite channel
  선택은 typed point series legend를 만든다.
- Shape-only point legend는 color binding 없이도 생성·재생성한다. 다른 line의 존재는 이 경로에 영향을 주지 않는다.
  Automatic line+point recipe는 point와 line 모두 같은 color field와 scale을 공유할 때만 추론한다.
  Evidence: `test/unit/actions/guides/shape-legend-ownership.test.js` (creation, color removal, Canvas/shape-scale replay).
- Explicit `["size"]` 또는 유일한 size-only point는 categorical dispatch보다 먼저 standalone size legend를
  선택한다. Multiple size points는 explicit target을 요구한다. Standalone은 네 방향을 지원하고 combined
  point-series+size block도 네 방향을 지원한다.
- Explicit `["strokeWidth"]` 또는 유일한 stroke-width-only line/rule은 standalone stroke-width legend를 선택한다.
  Full에서 encoded quantitative scale을 사용하며 count와 네 방향 edge/grid/layout, text styles, border를 지원한다. Basic에는 strokeWidth encoding/family가 없으며 이 변경에서 추가하지 않는다.
- `position`: categorical과 continuous color/opacity는 left를 포함한 네 방향을 지원한다.
  combined point-size legend도 네 방향 edge position을 사용한다. chart-independent default는 `"right"`다.
- `align`: `"left" | "center" | "right"`, 기본 center. right와 left side position은
  모든 family에서 center만 허용한다. Gradient/opacity도 non-center side alignment를 거절한다. Horizontal non-center legend를 side로 옮길 때는 같은 edit에서 align center를 명시해야 한다.
- `direction`: `"horizontal" | "vertical"`; top/bottom item-grid fill order는 기본 horizontal이다. Categorical left/right는 기본/필수 vertical이며 columns omission 또는1, titlePosition top만 허용한다. 무시되는 horizontal/여러 columns/left title은 오류다. 기존 horizontal grid를 side로 옮길 때 columns1/top title을 명시하여 호환 상태를 만든다. Evidence: `test/unit/actions/guides/categorical-side-options.test.js`.
- `columns`: positive integer; top/bottom grid의 최대 열 수. 생략하면 한 row에 가능한 item을 둔다.
- Categorical `layout`은 `"edge" | "legacy-bottom"`, default `"edge"`다. Bottom도 omission이면 reserved-margin grid다.
  기존 Canvas 하단 고정 single-row는 position bottom + layout legacy-bottom으로 명시한다. Labels y=height−28,
  title y=height−52이며 align/itemGap/recipe/styles/border를 지원한다. Columns, vertical direction, left title,
  offset≠8은 edge에서만 지원한다. Legacy mode에서 다른 edge로 옮길 때 layout edge도 같은 edit에 명시한다.
  기존 compact examples는 legacy-bottom으로 migration한다. Interval은 layout:"edge"를 지원하며 legacy-bottom은 거부한다. Stroke-width도 layout:"edge"를 지원한다. Size도 layout:"edge"를 지원한다. Gradient/opacity의 layout option은 아직 지원하지 않는다.
- `offset`: non-negative finite number, 기본 `8`; plot과 legend block 간 거리다.
- `titlePosition`: `"top" | "left"`, 기본 top. `"left"`는 horizontal categorical과 sampled opacity
  legend에서 title, symbol, label을 한 reading line으로 배치한다. Gradient와 side opacity는 `"top"`만 지원한다.
- `title`: non-empty string; 생략하면 encoded source field를 사용한다.
- `symbol`: `"auto"`, mark-specific shorthand, 또는 `{ layers: [...] }`. layer type은 `line | point | swatch`;
  각 layer는 non-negative size/stroke parameters와 supported point shape를 사용한다. Layered recipe는
  type별 최대 하나, 전체 최대 세 layer다.
- Point의 자동 typed recipe는 selected shape를 설명하며, selected color가 있을 때만 matching line을 합친다.
  Config의 inferredSymbol이 omission/auto와 caller recipe를 구분한다. Edit symbol auto, encoding 제거·재연결, matching companion mark 추가·제거와 Canvas/scale/data dependency replay는
  자동 recipe를 재추론하고 concrete symbol type·순서를 reconcile한다. Explicit recipe는 보존한다. Recipe의 layer 순서는 생성과 편집 모두 실제 drawing order다.
- `labels`, `titleStyle`: color/fontSize/fontFamily/fontWeight style object. Labels만 offset을 받으며 모든 family의 titleStyle.offset은 거절한다.
- `itemGap`: positive finite number; position별 default spacing을 override한다.
- `border`: `false | true | { color?, lineWidth?, padding?, background? }`; false가 default이며 true는
  default bordered background를 만든다.
- `count`: integer `2..10,000`; size, stroke-width, gradient tick-label 또는 opacity sample count이며 default `5`.
- Interval item content는 공통 pure layout에서 text/swatch를 측정한 뒤 edge에 배치한다. Right 기본 origin은 plot.right+offset30, titleY=plot.y+20, itemY=plot.y+52+index*max(itemGap28,symbolHeight,labelFontSize)다. Left는 visible content 전체 폭을 빼고 label을 swatch 오른쪽에 둔다. Top/bottom은 plot 폭에 align하며 top title-grid gap12, inline title-grid gap20이다. Horizontal columns omission은 전 항목 한 row이며 direction은 cell fill 순서를 정한다. Hidden title은 grid/border 측정에서 제외한다. Interval background도 multi-block lane의 group bounds에 포함한다.
- Categorical color/series의 hidden title은 grid height, inline prefix/gap과 border/fit에 포함하지 않는다. Hidden titleStyle/text/titlePosition 변경은 visible content geometry를 바꾸지 않는다. Legacy-bottom의 sample anchors는 고정하며 hidden border는 실제 item top에서 시작한다. Title 복원은 저장한 style을 사용하고 visible text가 Canvas를 넘으면 실패한다. Evidence: `test/unit/actions/guides/hidden-legend-bounds.test.js`, `test/contracts/hidden-categorical-layout.test.js`.
- Opacity symbol은 단일 `{ type?: "point", radius?: number, fill?: string, stroke?: string, strokeWidth?: number }`다. Radius default7은 positive finite, fill/stroke는 non-empty string, strokeWidth는 non-negative finite다. LegendOptions와 focused symbol editor의 TypeScript 선언도 같은 recipe를 허용하며 createGuides.legend로 전달된다. Evidence: `test/contracts/opacity-legend-types.test.js`와 installed package TypeScript consumer.
- Opacity sample의 occupied radius는 radius+strokeWidth/2다. Labels.offset은 sample 외곽선과 label 사이 실제 거리이며 side의 -2px 보정은 없다. Side minimum pitch는 max(itemGap,occupied diameter,label font height), 첫 itemY는 plot.y+46 이상이면서 visible title 아래 gap12를 확보한다. Horizontal top-title sample center pitch는 max(56,itemGap*2,occupied diameter+itemGap,max label width+itemGap)이며 label은 sample bottom 뒤 offset, title은 sample top 앞12에 배치한다. Inline은 sample occupied diameter와 label width를 포함한 item 사이 itemGap을 둔다. Hidden title은 이 간격에서 제외한다. Shared side lane은 mirrored label의 center 거리를 절대값으로 보존해 큰 left opacity가 label column을 침범하지 않는다. Evidence: `test/unit/actions/guides/opacity-legend-spacing.test.js`, `test/contracts/opacity-legend-spacing.test.js`.
- Gradient/opacity/interval의 hidden title은 occupied bounds와 background에 포함하지 않는다. Inline opacity는 숨긴 title의 width/gap도 제거한다. Long hidden title을 저장한 채 작은 Canvas로 resize할 수 있지만 보이는 content 또는 title 복원이 넘치면 실패한다.
- Sequential midpoint가 있으면 gradient strip은 mark와 같은 mapper로 value를 색에 대응한다. Tick 위치는 value-linear이며 midpoint를 base count samples에 추가·deduplicate한다. Sample을 palette의 균등 위치로 오해하지 않는다. Evidence: `test/charts/color-midpoint/`, `test/unit/actions/scales/midpoint.test.js`.
- Full의 scale family 전환은 compatible 네 edge gradient↔interval을 같은 transaction으로 재생성한다. 보존·오류·default 정책은 CORE editScale이 소유한다. Explicit hidden/auto title와 이후 focused editor도 정상 적용된다. Evidence: `test/unit/actions/scales/color-transitions.test.js`.
- `gradient`: sequential color 전용 `{ length?, thickness? }`, defaults `120`과 `12`.
- Discretized quantitative Point/aggregate Bar/Rect color는 Full과 Basic에서 기본 right/vertical interval swatches를 추론하고 `offset`, `itemGap`,
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
- Single top/bottom edge legend는 최종 foreground/background union의 실제 occupied bounds를 plot x edge/center에 맞춘다. Visible text, actual symbol/line stroke와 collection children, border stroke를 포함한다. Top offset은 occupied bottom과 plot top의 거리이며 bottom offset은 plot bottom과 occupied top의 거리다. Intrinsic 좌표가 Canvas를 넘더라도 최종 배치가 들어가면 허용하며, 최종 overflow는 immutable error다. 모든 family의 생성·편집·content 교체·Canvas/scale/encoding replay에 같은 기준을 적용한다. Explicit legacy-bottom은 이 배치에서 제외하고 독립 edge legend가 있어도 고정 anchors를 유지한다. Evidence: `test/unit/actions/guides/occupied-legend-alignment.test.js`, `test/contracts/occupied-legend-alignment.test.js`.
- Two or more top- or bottom-positioned categorical, gradient, interval, size, stroke-width, or opacity blocks share a horizontal-edge lane.
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

- ✅ Covered: interval four edges in Full/Basic, all16 edge edits, columns/direction/inline title, content replacement, remove/recreate, multi-block lane and Canvas replay (`test/unit/actions/guides/interval-legend-edges.test.js`, `test/contracts/interval-legend-edges.test.js`).
- ✅ Covered: hidden gradient/opacity/interval title bounds, borders, Canvas resize and atomic title restoration, inline opacity (`test/unit/actions/guides/hidden-legend-bounds.test.js`).

- ✅ Covered: Full/Basic companion authoring-order convergence, mark removal, color removal/rebinding, caller recipe preservation and Canvas/scale/filter replay (`test/unit/actions/guides/legend-recipe-replay.test.js`); independent replay primitives in `test/contracts/legend-content-render.test.js`.

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
  - ✅ Covered: explicit/inferred standalone line/rule stroke width, count, four-edge placement and scale
    rematerialization.
  - ✅ Covered: opacity as one continuous guide channel; constant opacity and incompatible mixes rejected.
- `position`
  - ✅ Covered: omission→`"right"`, `"right"`, `"bottom"`, `"top"`, invalid value.
  - ✅ Covered: `"left"` for categorical, point-composite/size, gradient and opacity.
  - ✅ Covered: standalone size four-edge layout and incompatible controls.
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

- Signature: `editLegend({ target?, channels?, position?, layout?, align?, direction?, columns?, offset?, titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?, gradient?, order? })`.
- `target` selects an existing logical legend by mark ID. It may be omitted only when exactly one target owns all
  active blocks; independent targets are ambiguous.
- At least one non-target change is required. Mark encodings and scale bindings remain unchanged.
- Explicit `channels`는 target 전체의 최종 non-empty content 집합이다. 기존 createLegend의 compatible subset만 허용하며 child selector가 아니다. Omission은 기존 content를 유지한다. 같은 kind의 config/count/title visibility를 보존하고 categorical color↔series revision은 styles/order/compatible explicit recipe를 보존한다. 새 block은 생성 기본값을 사용하고 제외된 block과 그 설정은 제거한다. 같은 호출의 style/layout patch는 최종 content에 적용한다. 다른 target의 occupied resource나 unsupported combination은 오류다.
- 새 categorical+size의 size block은 위치와 무관하게 categorical labels/titleStyle을 상속한다. Default title color는 두 block 모두#334155다. 기존 standalone size를 결합하면 저장된 자체 style을 보존하며 standalone default title#0f172a는 유지한다. Size label offset default12 및 명시 shared offset도 유지한다. Evidence: `test/unit/actions/guides/combined-legend-appearance.test.js`, `test/contracts/combined-legend-appearance.test.js`, `test/unit/actions/guides/legend-family-lifecycle.test.js`.
- Categorical+size의 labels/titleStyle patch는 각 block의 유효 스타일에 요청한 leaf만 병합한다. Title/count만 바꾸면 size의 자체 스타일과 inheritance를 보존한다. Inherited size label offset은 sample slot edge 기준 default12다. 생성 시 명시한 shared labels.offset은 size에도 보존하고 후속 inherited typography 편집에서도 유지한다.
- Omitted values remain unchanged. Nested `labels`, `titleStyle`, `border`, and `gradient` objects merge supplied
  leaves. `title` accepts a custom non-empty string, `"auto"` for field inference, or `false` to hide its graphic.
- Categorical `layout` omission은 stored edge/legacy-bottom을 보존한다. Style/title/border edit나 Canvas/scale/encoding replay가
  mode를 바꾸지 않는다. Explicit editLegend/editLegendLayout({layout})만 mode를 전환한다.
- Categorical and combined point-size legends accept all four edges. Left requires center alignment and vertical flow. Edge 변경 시 omitted direction은 새 edge의 default로 추론한다. `count` rematerializes an existing size block.
- Gradient의 titlePosition top은 createLegend/editLegend/editLegendLayout 모두 허용하고 left는 모두 거절한다. Side alignment와 titleStyle의 동일 validation/immutable rejection evidence는 `test/unit/actions/guides/legend-option-parity.test.js`다.
- Gradient edits own `count` and `gradient`; opacity edits own `count`, `itemGap`, and a single point symbol recipe.
  Horizontal opacity edits also own `titlePosition`; entering `"left"` without explicit spacing selects the inline
  8-pixel symbol-label and 20-pixel sample defaults.
  Interval edits own all four positions, layout:"edge", horizontal align/direction/columns/titlePosition, swatch recipe, text style와 title visibility. Side는 vertical, center align, top title, single column이며 columns1은 허용한다. Position 변경 시 omitted direction은 새 edge에 맞춰 추론한다. 다른 명시된 layout controls는 유지하며 incompatible side controls는 오류다.
  Kind-incompatible options fail before the prior program changes.
- Standalone size edits own four-edge/grid layout, border, `title`, `count`, `labels`, and `titleStyle`, including focused title/label/count actions. Count is 2..10,000; custom/auto/hidden title and partial styles survive Canvas/scale/filter replay. Labels default to font12/normal and offset12 after the sample slot; titles to font13/600. Side title/item origin은 plot.y+20/+52이며 pitch는 최소40이다. Equal-area scale mapping, formatter와 symbol defaults를 유지한다. Unrelated categorical targets never supply inherited appearance or placement. Basic creates size legends but does not expose editors. Symbol, gradient and order remain unsupported for standalone size.
- Sampled size/stroke-width titleStyle accepts only color/fontSize/fontFamily/fontWeight; offset belongs to labels.
- Stroke-width edits own four-edge layout/grid/border, `title`, `count`, `labels`, and `titleStyle`. Symbol, gradient and order options are rejected. Label `offset` controls the minimum distance after the occupied sample slot (32-pixel line plus the widest stroke). Exact current item placement is defined in the stroke-width item layout section below.
- Effect: stores graphical config immutably and invokes the corresponding wrapped rematerialization action.
  Categorical symbol recipe changes reconcile concrete graphic types without leaving stale objects. If the
  edited block participates in a side lane, all sibling blocks rematerialize before the lane is placed again.
- Errors: missing/ambiguous target, empty/unknown edit, invalid title mode, incompatible options, invalid count/style,
  insufficient margin, and overlap with left y-axis guides.

### Formal values — `editLegend`

- Implemented: the signature above with `title?: NonEmptyString | "auto" | false` and `channels?: readonly LegendChannel[]` for whole-target replacement.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editLegend`

- ✅ Covered: point 7×7 content replacement, continuous/interval/size/opacity replacement, independent width owner, hidden titles, styles/order/recipe preservation, invalid/occupied content atomicity and Canvas replay.
- Evidence: `test/unit/actions/guides/legend-content-editing.test.js` and content-editing pairs in `test/contracts/legend-content-render.test.js`.

- ✅ Covered: inferred/explicit target and ambiguity/missing-target errors.
- ✅ Covered: left combined categorical/size position, partial nested style/border/count edits, and exact primitive
  equivalence.
- ✅ Covered: custom/hidden/auto title transitions and symbol recipe reconciliation.
- ✅ Covered: gradient count/extent and opacity count/gap/symbol edits with incompatible-kind rejection.
- ✅ Covered: standalone size count, exact equal-area radii, labels/titleStyle/offset, custom/hidden/auto title, focused editors, invalid/missing/ambiguous options, independent owners and Canvas/scale/filter replay.
- ✅ Covered: stroke-width count, labels/titleStyle, custom/hidden/auto title, four-edge layout, borders, bounded option rejection and
  scale/Canvas rematerialization.
- ✅ Covered: Canvas/edit action-order convergence, insufficient margin, immutability, trace, browser/PNG parity.
- ✅ Covered: explicit edge/legacy-bottom default, mode transitions, focused color/title style preservation,
  Full/Basic nested creation, Canvas/scale/encoding-removal replay and incompatible legacy grid controls.
- Evidence: `test/unit/actions/guides/legend-bottom-layout.test.js` and bottom-mode pairs in
  `test/contracts/legend-lifecycle-render.test.js`.
- Evidence: `test/unit/actions/guides/legend-channel-selection.test.js` and
  `test/contracts/legend-content-render.test.js` prove exact explicit/inferred point content across Full/Basic,
  recipe provenance and ordered component replacement, with independent primitive graphics and pixels.
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
  `"color" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity"`이며 matching content만
  제거한다. Combined categorical block의 일부 color/shape/strokeDash만 요청하면 남은 채널로 같은 범례를 재작성한다.
  마지막 채널을 제거하면 block을 삭제한다. Missing block, duplicate/unknown channel과 empty selection도 오류다.
- Partial categorical 재작성은 title visibility/custom 또는 inferred title, labels/titleStyle, layout/border/order와 explicit recipe를 보존한다.
  Auto recipe는 남은 채널로 재추론한다. Category-to-color/shape/dash scale 배정은 변경하지 않는다.
  Categorical content는 retained sampled companions 앞에 생성하여 direct creation과 같은 drawing order를 유지한다.
  Encoding 제거도 같은 content revision owner를 사용하며 숨긴 제목을 다시 만들지 않는다.
- Retained block은 그대로 보존하고 categorical+size 또는 same-side lane layout dependency가 바뀌면 existing
  `rematerializeLegend`를 wrapped child로 호출한다. Categorical block만 제거하고 size를 보존하면 inherited categorical typography를
  해제하고 자체 stored style/position에서 다시 materialize한다. Removed composite block은 retained size를
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
  `test/unit/actions/guides/legend-content-removal.test.js`, `test/unit/actions/guides/legend-lifecycle.test.js`,
  `test/contracts/legend-content-render.test.js` and `test/contracts/legend-lifecycle-render.test.js`.

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

### Stroke-width item layout

Full의 createLegend/editLegend/editLegendLayout은 position right/left/top/bottom, layout edge, align/direction/columns/titlePosition, offset/itemGap과 border를 지원한다. Side는 vertical/center/one column/top title이다. Default offset30, side itemGap32, line length32, label offset12와 기존 font/color/scale formatter를 유지한다. Title centerY=plot.y+20, first sample centerY=plot.y+52로 공통 item layout에 맞춘다(이전 +28/+62). Side에서 두꺼운 sample/큰 label/title이 기본 시작 좌표를 넘으면 title 아래 gap12를 확보하도록 첫 sample을 내린다. Horizontal은 maximum sample stroke width를 row height에 포함하며 각 sample stroke extent와 실제 visible labels/title을 Canvas bounds 및 border 계산에 포함한다. Hidden title은 제외하고 stored title은 보존한다. 생성·편집·Canvas/scale replay 모두 공간 부족을 오류로 반환한다.

Basic의 기존 export/encoding/family 경계는 유지한다. Width는 Full-only이며 새 direct action은 없다. Symbol recipe/gradient/order는 거부한다. TitleStyle의 offset도 거부하며 labels offset은 허용한다.

Evidence: `test/unit/actions/guides/stroke-width-legend-edges.test.js`, `test/contracts/stroke-width-legend-edges.test.js` (독립 literal primitive/graphics/Canvas calls/pixels), `test/unit/actions/guides/stroke-width-legend.test.js`, installed package/browser probes.

### Size item layout와 side label 간격

Size는 실제 최대 diameter와 minimum slot width32를 측정하고 circle을 slot 중앙에 둔다. Labels.offset은 slot 오른쪽 기준(default12)으로 통일했다. 기존 center-relative28의 explicit value는 새 기준으로 해석하므로 기존 offset≥16에서 같은 상대 위치를 원하면 16을 뺀 값을 사용한다(radius≤16의 slot32인 경우). 큰 radius는 slot을 확장하여 default sample-label gap12를 확보한다. Font/color/area mapping/count/formatter는 유지한다. Side item pitch는 max(40, diameter, label font size)이며 큰 title/item은 제목 아래 gap12를 확보한다.

Full/Basic의 standalone create는 네 방향과 layout edge, horizontal align/direction/columns/titlePosition, offset/itemGap, text styles 및 border를 지원한다. Full edits와 Canvas/scale/filter/content replay가 같은 owner를 사용한다. Side item controls는 interval/width와 같은 vertical/center/one column/top title 계약이다. Visible circle/text/background가 Canvas를 벗어나면 실패하고 hidden title은 제외한다.

Combined categorical+size side는 각 owner의 content를 먼저 materialize한 뒤 lane이 결합한다. Size는 categorical의 private size 좌표를 읽지 않는다. Shared label start44는 최소값이며 각 block의 symbol center와 requested label 간격을 수용하도록 확장한다. Retained size 자체 border는 content와 함께 재배치하고 outer categorical group border가 그 occupied bounds를 포함한다. Top/bottom 결합도 지원하며 아래 group 계약을 따른다. 전체 family의 same-edge collision은 이 문서의 공통 최종 상태 검증을 따른다.

Evidence: `test/unit/actions/guides/size-legend-edges.test.js`, `test/contracts/size-legend-edges.test.js`, 기존 size content/editor/lane 및 Cars regression primitive pairs.


### Combined horizontal layout

Categorical+size create/edit/content replacement은 모든 edge를 허용하고 legacy-bottom 결합은 오류다. Horizontal에서는 categorical position/align/direction/columns/titlePosition/offset/itemGap이 두 block의 effective geometry다. Size 자체 설정은 덮어쓰지 않아 categorical 제거 후 복원하며 자체 title/visibility/count/labels.offset/border를 보존한다. Shared typography patch와 categorical title edit 의미는 기존과 같다.

각 block의 실제 title/text/symbol/stroke/nested border bounds를 측정해 categorical→size 순서로 gap40을 두고 배치한다. Plot 폭을 넘으면 다음 outward row로 wrap한다. Top title/content 간격은12이며 sample보다 큰 label도 content 높이에 포함한다. Inline title은 content와 함께 이동한다. 두 block union을 categorical border로 둘러싸고, single combined group의 outer occupied bounds를 plot 폭의 align과 plot edge offset에 맞춘다. 여러 group이 있으면 결합 내부를 보존한 채 atomic block으로 기존 horizontal lane에 넣는다. Size graphics는 categorical 뒤, independent continuous companion 앞에 생성해 creation/content replay의 drawing order도 보존한다.

Canvas overflow 또는 최종 chart title/x-axis guide와 교차하면 immutable failure다. Evidence: `test/unit/actions/guides/combined-legend-edges.test.js`, `test/contracts/combined-legend-edges.test.js`, packed consumer/browser 및 Cars replay. 다른 family의 전체 C2 collision/transition matrix 완료를 뜻하지 않는다.

### 항목형 interval/stroke-width의 실제 sample spacing

공통 item layout은 배치 전에 sample별 stroke bounds를 측정한다. Interval slot은 swatch width+strokeWidth, height+strokeWidth다. Width slot은 line length32+maximum strokeWidth이고 height는 maximum strokeWidth다. 각 sample의 nominal origin을 공통 slot 안에 옮기고 labels.offset은 slot의 occupied right 뒤 minimum gap(default interval8/width12)이다. 두께가 다르면 label column을 유지하여 얇은 sample의 실제 gap은 커진다. Size의 minimum32 slot은 유지한다.

Side pitch와 첫 item/title gap12, horizontal row/column/inline 배치, border와 Canvas fit이 같은 actual extent를 사용한다. Default stroke도 포함하므로 interval의 기존 actual label gap7.75를8로 교정한다. Width의32px line length는 유지되며 stroke extent만큼 slot과 label column이 확장된다. 공간 부족은 earlier program을 변경하지 않는 오류다.

Evidence: `test/unit/actions/guides/item-legend-stroke-spacing.test.js`의72case matrix/lifecycle, `test/contracts/item-legend-stroke-spacing.test.js`의독립 literal primitive/graphics/order/PNG, existing interval/width/size paired references 및 package/browser probes.

### 범주형 recipe·shape·font의 실제 sample spacing

Categorical color/series는 모든 line/point/swatch layer의 실제 bounds와 nominal minimum slot의 union을 예약한다. Mapped point shape의 path miter와 stroke도 포함한다. Labels.offset은 공통 occupied slot 오른쪽 뒤 minimum gap(default color8/series10)이며 좁은 sample도 같은 label column을 사용한다. Side pitch는 max(itemGap,actual symmetric sample height,label font height), 첫 centerY는 plot.y+52 이상이며 visible title 아래12px를 확보한다. Top/bottom grid와 inline title은 실제 sample/label/title 높이를 사용하고 border는 visible bounds+padding이다. Default stroke0.5와 line2도 반영한다.

Legacy-bottom은 labels centerY=Canvas.height−28, title centerY=height−52를 유지하며 actual slot width로 row를 배치한다. Fixed title와 item이 겹치거나 visible content가 plot bottom을 침범하면 오류다. Content와 border의 Canvas fit도 검사한다. Hidden title은 제외한다.

Evidence: `test/unit/actions/guides/categorical-legend-spacing.test.js`의240case와96mapped-shape matrix, lifecycle/shared/legacy; `test/contracts/categorical-legend-spacing.test.js`의4독립 primitive/graphics/order/PNG; existing chart references와installed package/browser probes.
