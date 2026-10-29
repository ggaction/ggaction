# Current program composition actions

Returned facet/repeat children have closed action stacks, including when derivation is nested inside an edit. Subsequent child edits create top-level trace nodes.

Nested snapshots preserve complete child ancestry with collision-free graphic IDs. Each composition adds only its
own namespace prefix; existing identifiers are not encoded again. Identifier length grows linearly with ancestry.
Exact internal graphic ID spelling is not a public authoring option.

## Facet spacing policy

헤더 lane으로 plot gap이 부족하면 기존 오류 메시지를 유지하며 `getErrorDetails`에
`code: "invalid-value"`, `optionPath: "gap"`, 요청값 `actual`, 헤더의 최소 간격 `limit`을 제공한다.
이 하한은 guide 충돌까지 허용한다는 보장이 아니며 수정된 요청은 다시 검증한다.

Facet, grid, repeat 및 facet의 `editCompositionLayout`은 `spacing: "canvas" | "plot"`을 받는다.
기본 canvas는 기존 cell Canvas 사이 gap이다. plot은 내부 data region의 grid track 사이 gap이며
child plot 크기는 유지한다. 바깥 여백은 각 방향 child margin의 최댓값을 외곽에 한 번 배정한다.
Role/legacy header의 긴 축은 plot에 맞추고, 수직 방향은 retained Cartesian/Polar/Parallel guide text와
local legend의 concrete ink 바깥에 offset만큼 배치한다. 내부 guide/header 예약은 gap 안에 들어가야 한다.
바깥 header lane은 inferred parent Canvas에 예약하며 child Canvas와 명시적 plot gap은 바꾸지 않는다.
남겨둔 축/범례/헤더가 다른 panel plot 또는 다른 panel guide와 겹치면 원자적으로 거부한다.
Panel background는 plot 안에만 그려 인접 panel을 덮지 않으며 parent background가 외곽을 채운다.
Shared legend와 title의 parent 예약은 기존 규칙을 유지한다. Concat에는 spacing 옵션을 거부한다.
Evidence: `test/unit/actions/composition/facet-plot-spacing.test.js`, `test/unit/grammar/layout/facets.test.js`.
Guide text/header clearance and source-style replay: `test/unit/actions/composition/facet-guide-header-clearance.test.js`.

## Independent axis gaps

Facet, facetGrid, repeatCharts와 facet의 editCompositionLayout은 기존 숫자 gap 또는
정확히 `{x: NonNegativeFinite, y: NonNegativeFinite}`를 받는다. 숫자는 두 방향에 같은
간격을 적용하고 저장 표현·기본값·기존 오류를 유지한다. 객체는 두 축을 모두 명시해야 하며
partial/unknown key/비유한/음수 값은 거부한다. 객체 편집은 전체 교체이고 gap 생략은 보존이다.
Concat 생성·편집은 계속 숫자만 받는다. 한 행이나 한 열이어도 객체 양축을 모두 검증한다.

Canvas/plot spacing의 열 간격은 x, 행 간격은 y다. Content spacing의 가로·세로 retained
bounds clearance에 각각 적용한다. 기존 spacing/family 제한, 셀 순서, shared footer/legend,
header anchor, topLane, 제목, plot 크기, concrete overlap 검사는 바꾸지 않는다.
Plot header의 두 방향 최소 clearance를 각각 검사하며 큰 다른 축 값으로 상쇄하지 않는다.
객체 오류 상세는 `gap.x`/`gap.y`와 해당 요청값/최소값을 쓰고, 잘못된 객체 형식은 `gap`이다.
기존 scalar header 오류는 기존 `gap` 경로와 두 방향 중 큰 최소값을 유지한다.

`compositionSpec.gap`은 숫자 또는 두 키 객체 원형 그대로 한 번 저장한다. Object 입력은
구조 복사·freeze하고 편집·파생 replay·저장 복원에 보존한다. 객체 누적 좌표와 크기의 overflow는
거부하며 실패한 action은 이전 program과 trace를 변경하지 않는다.
Evidence: `test/unit/layout/facet-axis-gaps.test.js`,
`test/unit/actions/composition/facet-axis-gaps.test.js`,
`scripts/consumers/fixtures/facet-axis-gaps.ts`.

## Independent content flow

Wrapped `facet` and `repeatCharts` also accept `spacing:"content"`; keyed `facetGrid` rejects it.
Native retained marks, axes, local legends and individual headers determine independent plot origins.
The stable row-major logical order is unchanged even when plot origins in the same row differ.
Gap adds clearance between measured content; child plot dimensions and data remain unchanged.
`topLane:"shared"` remains exclusive to plot spacing. Content flow ignores track alignment because
it packs measured bounds rather than equal-size slots. Edits, source replay and persistence retain this policy.
Bottom outer X guides are detached from child viewports and placed at one common trailing body edge,
using the last logical occupied child in each column. Other component sides retain occupied-edge ownership.
Parent title/legend lanes and nested snapshots include these footer guides in their final bounds.

`guides.axes` accepts scalar `"each" | "outer"` or a nonempty object `{x?,y?}` with those modes.
Creation defaults omitted object channels to each; editing preserves their previous mode. Scalar edits reset
both channels. Stored objects contain both keys; unknown keys, empty objects and invalid modes reject.
Object policies require Cartesian coordinates; repeat rejects any outer channel. Existing scalar storage is unchanged.

Header `anchor:"view"` uses retained native body bounds, including axes, and excludes shared bottom footers.
It requires plot or content spacing. Existing `anchor:"content"` retains mark-only bounds and also accepts
content spacing. Both preserve long-axis plot alignment. Role titles keep their outer reservations.
Evidence: `test/unit/actions/composition/facet-content-flow.test.js`,
`test/contracts/facet-content-header-types.test.js`.

## Shared facet top lane

The existing `facet`, `facetGrid`, `repeatCharts`, and facet `editCompositionLayout` accept
`topLane: "stacked" | "shared"`. Omitted creation and explicit stacked retain the existing additive title/header
layout and store no field. Shared requires plot spacing and stores only `compositionSpec.topLane: "shared"`.
Edits that omit the option or pass undefined preserve it; explicit stacked removes it. Switching to canvas
spacing while shared requires stacked in the same call. Concat rejects this option, including stacked.

Shared uses the existing child top margin plus explicit parent padding for title and first-row top headers,
without adding those two reservations again. Child plot and Canvas sizes, internal row/header gap checks,
other header sides and existing shared-legend placement remain unchanged. Final concrete parent title, subtitle
and header text must fit the parent Canvas, clear child plots, each other, and retained visible text. Nested
Canvas translation, rotation and ancestor clipping use ordinary graphic bounds; empty or invisible text does
not occupy a lane. Insufficient space fails atomically without shrinking fonts, hiding endpoints, expanding
margins or relaxing standalone bounds. Existing stored policy survives layout, source, scale, guide, title,
header, theme, text-metric and editable-persistence replay.

Evidence: `test/unit/layout/facet-top-lane.test.js`, `test/unit/actions/composition/facet-top-lane.test.js`,
`test/contracts/facet-top-lane-types.test.js`, and `test/charts/facet-shared-top-lane/`.

## `facet`

- Signature: `facet({ id?, field, data?, values?, columns?, gap?, spacing?, topLane?, align?, padding?, scales?, guides?, headers? })`.
- `field` is required. Omitted `data` resolves only when every eligible repeated layer has one unique common row-preserving ancestor.
- Explicit `data` may also select a materialized fold or aligned-array flatten snapshot that is an ancestor of every repeated layer. Cells filter that snapshot and replay only its descendants; raw rows and the original expansion definition/materialization remain intact. Fold and flatten stay cardinality-changing transforms, omitted inference is unchanged, and other statistical anchors remain unsupported. Missing/noncommon/nonmaterialized boundaries and absent fields fail atomically. This also applies to explicit `facetGrid.data`. Data revisions rebind the stored partition snapshot through the existing retained-template DAG; changing the expansion definition can explicitly select its new snapshot in a new composition. Evidence: `test/unit/actions/composition/fold-facet-partition.test.js`, `test/unit/grammar/facet-dependencies.test.js`.
- Supported sources are complete Cartesian point, line, area, histogram bar, aggregate bar, ranged bar, rule, data-bound text,
  regression, density, interval/error-band, and box-plot programs; Polar Point, Line, direct Arc, Pie, Rose and Radar;
  and Parallel-coordinate programs whose visible layers share one valid partition anchor and one coordinate family.
- Independent Cartesian text requires x/y scale bindings and a text encoding. Its data must share the partition ancestor; filtered label datasets replay per cell. Empty label subsets retain sibling marks without fabricating labels. Attached labels remain source-dependent.
- Literal annotations with datum x/y/text decorate the primary coordinate family, including Polar and Parallel facets. They retain their own validated coordinate and scale bindings without establishing a competing family or making an otherwise empty facet populated. A text-only program still treats those text layers as primary.
- Evidence: `test/unit/actions/composition/facet-text.test.js`.
- Facet values use source first-appearance order. Explicit `values` is a unique observed-value list whose exact order controls
  child, header and layout order. Omitted `columns` creates one row; a positive integer wraps cells row-major.
- Omitted scale policies are shared unless another explicitly selected channel uses the same physical scale. In that case omitted aliases inherit its policy transitively; two explicitly contradictory policies still reject. `x`, `y`, `xOffset`, `yOffset`, `theta`, `r`, `color`, `stroke`, `size`, `shape`,
  `opacity`, `strokeDash`, and `parallelDimensions` accept `"shared" | "independent"` when the role is used. Public
  `r` resolves the semantic `radius` binding; `radius` is not an accepted facet-policy alias. The single
  `parallelDimensions` policy applies separately to every dimension scale and never unions different dimensions.
  Explicit semantic domains override either policy. Histogram children share one bin-boundary set only when x is shared.
- Box-plot body, whisker/cap/median rules, and outliers consume the same resolved facet scales;
  component or highlight rematerialization must not replace shared domains with cell-local domains.
  Evidence: `test/unit/actions/composition/facet-box-geometry.test.js`.
- 각 cell의 명시적 tick/label/grid values는 해결된 domain과 교집합으로 파생한다. 원본 guide intent는 parent에 보존하므로 shared policy로 돌아가면 전체 선택이 복원된다. Unit의 잘못된 명시적 값 검증은 그대로 유지한다.
- Filter, regression, density, interval, box-summary, and box-outlier dependencies replay topologically from each
  filtered cell source through `replayDerivedData`. Every affected layer is explicitly rebound through
  `rebindLayerData` before one deduplicated rematerialization plan runs.
- `markFilter`도 partition source에 target mark를 먼저 rebind/materialize한 뒤 같은 selector recipe를
  실행한다. 빈 결과의 shared-scale cell은 유지하며 원본 filter/remove 이력은 바뀌지 않는다.
- `guides.axes` is `"each"` by default. `"outer"` keeps x axes on the bottommost occupied cell in each column and y
  axes on the leftmost occupied cell in each row, including an incomplete final row. Polar theta/radius and Parallel
  dimension axes remain child-local; requesting `"outer"` for either family is an atomic error.
- `guides.legend` is `false` by default. `"shared"` promotes compatible categorical, gradient, discretized-color,
  size, or opacity recipe to a parent-owned concrete guide. Independent or otherwise incompatible child guide
  definitions are rejected before a facet result is returned. Promotion preserves the concrete child legend's
  configured `"left" | "right" | "top" | "bottom"` edge and the horizontal alignment of top/bottom legends. The
  promoted outside legend uses its existing recipe offset from the translated child-plot union, rather than adding
  another lane beyond the explicit child Canvas margins. Omitted offsets clear the actual retained axis/header
  lane; an explicit offset that collides with retained text rejects atomically. Explicit child Canvas dimensions
  and margins remain unchanged. The inferred parent Canvas contains both the child snapshots and the occupied
  legend bounds, translating the complete child layout when a left/top guide needs additional space. Shared side legends align their complete occupied top (including border strokes) to the translated child-plot union top; parent titles and headers do not set this anchor. This also applies to inferred categorical shared legends and layout/guide-policy replay. An inferred legacy
  categorical legend defaults to `"right"`; the legacy shared-string policy has no separate position input.
- When shared-string inference finds continuous or discretized color/stroke on one eligible target, it creates independent native channel owners instead of an ordinal series. Remaining ordinal color/stroke/shape/strokeDash channels keep their compatible categorical block. Multiple numeric blocks retain their own scale and automatic samples; the private capture Canvas may grow to hold them, without resizing child plots. Explicitly authored child owners continue through the existing promotion path. Evidence: `test/unit/actions/composition/facet-legend-scale-inference.test.js`.
- `guides.legend: LegendOptions` directly declares one parent guide. Its target names the source template mark; omitted target must be unique. Unit defaults apply independently of incidental child legend styles. Final placement uses the bounding rectangle of occupied child inner plots, including gaps. Corners and free `at` must fit that union; outside groups use actual retained guide lanes and the inferred parent Canvas. Child Canvas sizes/margins remain unchanged. Family validation, grouped/local placement, combined mappings, borders and samples reuse the unit owners.
- `editLegend`, focused legend editors, `editLegendBlock` and `removeLegend` accept facet/facetGrid/repeat parents with an existing shared owner. Concat and absent owners reject. `createLegend` stays unit-only; use `editFacetGuides({legend:{…}})` to declare a missing parent owner. Source mark/channel selectors retain their unit closed contracts. A focused edit of `"shared"` normalizes the current native owner while preserving automatic title/sample/offset flags. Partial removal retains other blocks; final removal sets false and cannot resurrect on replay.
- Authored intent is owned once by `compositionSpec.facet.guides.legend`. Public input remains closed `LegendOptions`; returned/imported authored state uses a private closed tagged block normal form. Parent native guide configs/graphics are derived from it. Child templates/programs do not store parent intent. False clears the parent owner, shared resets template promotion/inference, and another object replaces the declaration. Scale/data/source/theme/text metrics/headers/layout/persistence replay must preserve all authored settings or fail atomically on incompatible bindings, independent appearance scales, recipe changes, overflow or occupied-text collision. Existing no-override shared-string rendering remains unchanged.
- A `combine: "color-size"` parent block retains both native color/size scale IDs, the identical numeric endpoint domain, samples and optional point clipping. Its color and size selectors address one owner. Editable persistence validates both scale references and the native combined guide meaning; partial removal clears that owner while preserving sibling blocks, and final removal cannot restore it during reflow.
- Evidence for authored parent lifecycle: `test/unit/actions/composition/facet-parent-legend.test.js`, `test/contracts/named-cartesian-axis-types.test.js`. Normalized internal shape is an implementation contract, not a new accepted public input vocabulary.
- The result is a composition parent whose `children` retain immutable filtered programs and whose `graphicSpec` contains the complete namespaced nested-Canvas snapshot.
- Canonical title order is `.facet(...).createTitle(...)`. A valid title authored before `facet` is promoted once to the parent.
- Parent title alignment uses the translated child-plot union. The existing signed `alongOffset` shifts every
  painted title/subtitle line horizontally from that anchor on creation, editing, title promotion, and layout/scale/guide replay.
  Painted text outside the composed Canvas is rejected atomically; no title is clipped or hidden. Valid omitted-offset
  output is unchanged. Evidence: `test/unit/actions/composition/facet-title-along-offset.test.js`.
  Legacy facet headers remain one item per cell and
  align to each translated child plot. Explicit row/column role headers align to the occupied translated plot union
  for their row or column; neither long-axis anchor uses the child Canvas, axis-reserved margin, facet padding, or
  shared legend extent.
- Empty-string facet values remain semantic values and render with the deterministic visible header `(empty)`.
- Facet child cardinality는 공통 generated-item 한도 `10,000`을 적용하며 child derivation 전 `partitionRows * childCount <= 10,000,000`
  work budget을 검증한다.
- Facet materialization fails atomically when a header leaves the composed Canvas, intersects another header or its
  child plot, or when a shared legend leaves the composed Canvas. Legacy outside promotion cannot intersect the child-plot union; authored corners/free placement may overlap marks while retaining axis/header clearance.

### Formal values — `facet`

- Implemented: `facet({ id?: UserId; field: NonEmptyString; data?: ExistingDatasetId; values?: NonEmptyUniqueObservedScalarArray; columns?: PositiveInteger; gap?: NonNegativeFinite | { x: NonNegativeFinite; y: NonNegativeFinite }; spacing?: "canvas" | "plot" | "content"; topLane?: "stacked" | "shared"; align?: "start" | "center" | "end"; padding?: NonNegativeFinite | Partial<FourSidePadding>; scales?: Partial<Record<FacetScaleChannel, "shared" | "independent">>; guides?: { axes?: "each" | "outer" | { x?: "each" | "outer"; y?: "each" | "outer" }; legend?: false | "shared" | LegendOptions }; headers?: FacetHeadersOptions }): ChartProgram`.
- Implemented non-Cartesian families: Polar Point/Line/direct Arc/Pie/Rose/Radar and Parallel coordinates.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `facet`

- ✅ Covered: source and value inference, explicit common ancestor, one-row and wrapped layout,
  point/histogram/aggregate/ranged-bar eligibility, regression/density/interval/box dependency replay,
  shared/independent continuous domains,
  explicit-domain precedence, shared ordinal order, shared/independent histogram policy, parent categorical legend,
  parent gradient/discretized/size/opacity legends, occupied-edge outer axes, title promotion, child-plot-aligned
  four-edge parent title with an outer reserved lane, and headers, empty-string header display, renderer isolation, layout rematerialization, immutable
  base/children, four-edge shared-legend placement and layout-edit preservation, incompatible guide, invalid
  channel, dependency, and ambiguous-source rejection; Polar theta/radius and Parallel dimension domains, local Pie
  denominators, local frames/axes, attached-label replay, transform-produced empty cells, and non-Cartesian outer-axis
  rejection.
- Evidence: `test/unit/grammar/facets.test.js`, `test/unit/grammar/facet-dependencies.test.js`,
  `test/unit/grammar/facet-scales.test.js`, `test/unit/actions/composition/facet-derivation.test.js`,
  `test/unit/actions/composition/facet.test.js`, `test/unit/actions/composition/facet-derived-families.test.js`,
  `test/unit/actions/composition/facet-editing.test.js`,
  `test/unit/actions/composition/facet-shared-legend-placement.test.js`,
  `test/unit/actions/composition/facet-legend-families.test.js`,
  `test/unit/actions/composition/polar-facets.test.js`,
  `test/unit/actions/composition/parallel-facets.test.js`,
  `test/contracts/polar-parallel-facets.test.js`, `test/charts/cars-origin-scatterplot-facet/facet-variants.test.js`,
  `test/charts/cross-feature-integration/variants/facet-resolution/public.test.js`.

### Initial header styles

- `facet`, `facetGrid`, `repeatCharts` accept `headers?: FacetHeadersOptions`.
  Common appearance/map options match `editFacetHeaders` without `role` or `side`;
  optional `row` and `column` objects match that editor without `role`.
- Common defaults apply first, then explicit role overrides. Role/side eligibility,
  label-map resets, measured layout and atomic rejection match the editor below.
  Explicit initial styles remain authored overrides across themes and source replay.
- Omission retains legacy defaults. Row intent requires a two-field grid. Initial
  options are stored in the existing facet header config, with no second state owner.
- Evidence: `test/unit/actions/initial-facet-headers.test.js` compares initial
  construction with create-then-edit for facets, grids, and repeats.

## `facetGrid`

- Signature: `facetGrid({ id?, data?, rows, columns, combinations?, gap?, spacing?, topLane?, align?, padding?, scales?, guides?, headers? })`.
- `rows` and `columns` each require a different source field and accept an optional unique observed `values` order.
  Omitted orders use first appearance independently on each field.
- `combinations: "observed"` is the default. It creates only observed pairs while retaining their true row and column
  coordinates, so missing pairs do not compact the grid. `"full"` creates the Cartesian product and represents an
  unobserved pair as a named Canvas child with the original semantic layers and coordinate plus canonical empty mark
  graphics. Shared or explicit domains materialize child-local guides in that slot. An independent automatic domain
  that has no final values is rejected instead of inventing a fallback domain.
- Stable child IDs are `${id}-row-${rowIndex + 1}-column-${columnIndex + 1}`. Canonical state stores both ordered
  domains, every child's scalar pair, coordinate and empty status. Headers display `rowValue · columnValue`.
- Scale, guide, derived-data, title/header, renderer, child/work-budget and immutable-failure policies are the same
  owners as one-field `facet`. Shared domains are resolved from populated cells; blank cells do not invent values.

### Formal values — `facetGrid`

- Implemented: `facetGrid({ id?: UserId; data?: ExistingDatasetId; rows: { field: NonEmptyString; values?: NonEmptyUniqueObservedScalarArray }; columns: { field: NonEmptyString; values?: NonEmptyUniqueObservedScalarArray }; combinations?: "observed" | "full"; gap?: NonNegativeFinite | { x: NonNegativeFinite; y: NonNegativeFinite }; spacing?: "canvas" | "plot"; topLane?: "stacked" | "shared"; align?: CompositionAlign; padding?: CompositionPaddingInput; scales?: FacetScaleResolutions; guides?: FacetGuideOptions; headers?: FacetHeadersOptions }): ChartProgram`.
- Implemented for the same Cartesian, Polar and Parallel families and policies as `facet`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `facetGrid`

- ✅ Covered: exact row/column order, observed holes, full empty cells with retained semantics/coordinates/local guides,
  stable IDs, stored coordinates, shared and independent domains, all seven non-Cartesian family empty graphics,
  source replay, header/title policy, layout, immutable rejection, Canvas and renderer output.
- Evidence: `test/unit/actions/composition/facet-grid-repeat.test.js`,
  `test/contracts/composition-family-matrix.test.js`,
  `test/contracts/polar-parallel-facets.test.js`.

## `repeatCharts`

- Signature: `repeatCharts({ id?, target?, channel, fields, columns?, gap?, spacing?, topLane?, align?, padding?, scales?, guides?, headers? })`.
- Repeats one complete direct-source mark by replacing an eligible field role across an ordered unique field list.
  Cartesian marks accept `x` or `y`; Polar Point/Line/direct field-bound Arc/Rose accept `theta` or public `r`; Parallel
  coordinates accept `{ parallelDimension: field }` and replace exactly that dimension while preserving its position,
  field type, custom title, sibling dimensions, key and missing-value policy. Omitted `target` requires exactly one
  eligible primary mark. Attached Text labels and statistical-reference dependents owned by that target replay with it;
  unrelated layers are rejected.
- Pie and Radar reject raw theta/r replacement because those facades own different semantic roles. Composite
  statistical owners and derived target datasets are also rejected rather than partially or textually rewritten.
- Stable child IDs are `${id}-field-${index + 1}` and headers are field names. The repeated channel defaults to
  independent domains; explicit shared policy uses the deterministic union across all repeated fields. Other used
  channels follow the ordinary facet defaults and a compatible non-repeated legend may be parent-owned.
- Axes remain per cell because repeated fields can have different units and titles. `guides.axes: "outer"` is rejected
  both at creation and later guide-policy editing.

### Formal values — `repeatCharts`

- Implemented: `repeatCharts({ id?: UserId; target?: EligibleDirectMarkId; channel: "x" | "y" | "theta" | "r" | { parallelDimension: NonEmptyString }; fields: NonEmptyUniqueFieldTuple; columns?: PositiveInteger; gap?: NonNegativeFinite | { x: NonNegativeFinite; y: NonNegativeFinite }; spacing?: "canvas" | "plot" | "content"; topLane?: "stacked" | "shared"; align?: CompositionAlign; padding?: CompositionPaddingInput; scales?: FacetScaleResolutions; guides?: FacetGuideOptions; headers?: FacetHeadersOptions }): ChartProgram`.
- Explicitly rejected: Pie/Radar raw positional-role replacement, composite statistical roles, derived target datasets,
  two-dimensional repeat matrices, and outer axes.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `repeatCharts`

- ✅ Covered: x/y/theta/r/parallelDimension role replacement, independent/shared domains, exact order and IDs,
  Parallel sibling/title/scale preservation, attached-label replay, explicit Pie/Radar rejection, shared categorical
  legend, source replay, scale-policy edit, outer-axis rejection and strict types.
- Evidence: `test/unit/actions/composition/facet-grid-repeat.test.js`,
  `test/unit/actions/composition/non-cartesian-repeat.test.js`,
  `test/contracts/composition-phase10-types.test.js`,
  `test/contracts/polar-parallel-facets.test.js`.

## `editFacetSource`

- Signature: `editFacetSource({ program })` 또는 `editFacetSource({ action: { method, options? } })`.
- `describeAction`의 facet/facetGrid preflight는 같은 pure dependency planner로 partition ancestry를 검사하며 action을 실행하지 않는다.
- 두 입력은 상호 배타적이다. `action`은 retained source unit에 실제 wrapped chart-authoring 함수를 한 번 실행한 후 기존 facet/grid/repeat recipe를 다시 적용한다. Primitive, materialization, composition 함수와 알 수 없는 함수는 거부한다. Full-data item과 원래 axis config를 복원하므로 partitioned seed child의 item grain이나 outer-axis 생략을 source 의미로 사용하지 않는다. 새로운 label/statistical-reference config를 보존하고 전체 transaction은 하나의 `editFacetSource` trace node이다.
- Requires a facet, grid or repeat parent and one complete unit `ChartProgram`. It reapplies the current partition or
  repeat recipe to the revised unit while preserving explicit value/field order, IDs when the recipe cardinality is
  unchanged, layout, scale/guide policy, parent header styling and parent title.
- The stored partition dataset ID, ordered domains and repeat fields are part of that recipe. Every stored facet value
  must remain observed in the revised source. Changing a dataset ID, domain or repeated field list requires creating a
  new composition from the revised unit.
- Validation and all cell derivation occur on an immutable branch. A missing field/target, unsupported family,
  incompatible guide or incomplete program leaves both the previous parent and caller program unchanged.

### Formal values — `editFacetSource`

- Implemented: `editFacetSource({ program: CompleteUnitChartProgram } | { action: { method: PublicUnitActionName, options?: object } }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetSource`

- ✅ Covered: one-field, grid and repeat recipe replay, revised rows under retained Cartesian/Polar/Parallel domains,
  stable policy and IDs, attached-label/selection/placement/theme/style preservation, revised-unit Canvas replay,
  title/header preservation, nested action trace and immutable failure.
- Evidence: `test/unit/actions/composition/facet-grid-repeat.test.js`, `test/unit/actions/facet-source-action.test.js`.

## `editFacetHeaders`

- Signature: `editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset?, role?, labelMap?, side?, align?, rotation?, title?, anchor? })`.
- Requires a facet composition and at least one appearance change.
- Unqualified edits use `role:"all"` and update common style/mapping while preserving the legacy one-header-per-cell
  topology. `role:"row" | "column"` activates role mode. A row-column grid then owns one header per occupied
  numeric column followed by one per occupied numeric row. One-field facets and repeats support only the column role
  and keep one header per cell, including wrapped physical rows.
- Common config is the fallback for each role; a role-specific style, alignment or `labelMap` wins. Role
  `labelMap:"auto"` removes that override and falls back to the common map; common `"auto"` falls back to
  `formatVisibleText`. Typed raw values remain the identity, so `1` and `"1"` may display differently without
  changing partitions. Duplicate visible labels and `""` are valid; empty mapped text keeps the item identity but
  reserves no strip space.
- Row sides are `left | right`; grid column sides are `top | bottom`. One-field facet
  and repeat column headers also accept `left | right`, keeping one header per cell. Side cell
  headers reserve the maximum measured text width plus offset for each physical column,
  including wrapped rows, without resizing child canvases. `align:"start" | "center" | "end"` applies
  along the occupied plot span. `side` requires an explicit row/column role. Role strips reserve measured space in
  the parent layout before child placement, so font, map, side, layout, title and shared-legend changes converge.
- `rotation?: RotationInput`은 기존 숫자 radians 또는 `{ value, unit: "radians" | "degrees" }`를 받는다.
  생성 공통/row/column 헤더와 편집이 같은 정규화를 쓰며, 유한 radians만 기존
  `materializationConfigs.facets[id].headers` 소유자에 저장한다. 생략은 기존 의도를 유지하고
  0은 기존 비회전 그래픽·예약으로 복원한다. common보다 role의 명시 값이 우선한다.
- nonzero 회전 role 헤더와 plot-spacing legacy 헤더는 회전된 글자 블록의 가까운 경계를
  해당 edge에서 `offset`만큼 바깥에 두고, `align`은 회전된 블록을 edge를 따라 정렬한다.
  Canvas-spacing legacy 헤더는 기존 안쪽 anchor를 유지하며 회전한다. 폭/높이·Canvas 이탈·겹침은
  회전된 실제 concrete bounds로 검사한다. 빈 표시 문자열은 기존처럼 예약하지 않는다.
- plot-spacing의 회전 외곽 헤더는 이미 보존된 child margin을 중복 예약하지 않고 넘는 부분만
  추가 예약한다. 내부 row/column 사이의 전체 헤더 두께와 offset은 기존 gap 검사에 포함된다.
  생략/0도의 기존 출력과 경계 조건은 바꾸지 않는다. source/theme/text-metric/layout 및
  editable persistence 재생은 회전을 보존하고, 잘못된 각도/단위/비정규 저장 값은 원자적으로 거부한다.
- Editing preserves child identity, semantic facet values, shared scales and layout order, then rematerializes the
  parent snapshot. Clipping, snapshot intersection or header-header overlap fails atomically.
- `anchor:"content"` requires plot or content spacing. The outward anchor follows the union of each selected child's
  plot rectangle and concrete semantic mark bounds, including strokes, collection children, translations and
  clipping. Opacity does not alter these geometric bounds. Axes, grids, legends, titles and extension-only
  graphics are excluded. Alignment along the edge continues to use the plot span. Mark overflow is included
  in header reservations. Common/role precedence, all four sides, rotation and editable replay apply normally.
  Role field titles retain their existing plot anchor; their inferred offset clears the content-anchored labels.
  Omission or `anchor:"plot"` preserves existing placement, including canvas spacing. No default anchor field
  is inserted into older configurations. Invalid values, content with canvas spacing, clipping and collisions
  reject atomically; child dimensions and clips are never changed to make a header fit.

- 역할별 `title`은 전체 점유 plot 합집합에 한 번 정렬하는 필드 제목이다. 생성
  `headers.column.title` 및 grid `headers.row.title`도 같은 옵션을 받는다. common/all은
  거부한다. 최초 객체는 비어 있지 않은 text가 필수이고 이후는 부분 병합한다.
  명시적 hard break와 빈 줄은 concrete lines로 보존하며 전체 두께를 예약한다.
  생략은 보존, false는 제거다. text/fontSize/fontFamily/fontWeight/color/offset/align/
  rotation/alongOffset만 받는다. 글꼴·색상은 역할 헤더를 상속하며 align 기본 center,
  회전 기본 top/bottom 0,left -π/2,right +π/2다. 회전은 유한 정규 radians로 저장한다.
- offset은 plot-spacing에서 plot 합집합, canvas-spacing에서 child Canvas 합집합과
  회전된 제목 가까운 경계 사이 비음수 거리다. 기본은 같은 쪽 헤더 최대 두께+offset과
  보존 child margin 중 큰 값+8이다. alongOffset은 edge 방향의 유한 signed 이동이다.
  외곽 cell/role 예약과 child margin은 중복 사용하지 않고 필요한 초과분만 예약한다.
- 제목은 기존 header collection 끝에 column,row 순서로 concrete text가 된다. 모든
  Canvas/plot/헤더/보존 축·범례·차트 제목 text 충돌을 최종 상태에서 원자 검사한다.
  제목 없는 기존 graphic 출력은 유지한다. layout/source/data/theme/textMetrics 및
  editable persistence 재생을 지원하며 잘못된 저장 title은 거부한다.

### Formal values — `editFacetHeaders`

- Implemented: `editFacetHeaders({ fontSize?: PositiveFinite; fontFamily?: NonEmptyString; fontWeight?: NonEmptyString | Finite; color?: NonEmptyString; offset?: NonNegativeFinite; role?: "all" | "row" | "column"; labelMap?: DisplayLabelMap | "auto"; side?: "top" | "bottom" | "left" | "right"; align?: "start" | "center" | "end"; rotation?: RotationInput; title?: FacetHeaderTitleOptions | false; anchor?: "plot" | "content" | "view" }): ChartProgram`, with the role-specific side restrictions above.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetHeaders`

- ✅ Covered: legacy child-plot alignment, typed common and role maps, precedence/reset, deterministic row/column
  item order, four sides, three alignments, empty labels, exact strip reservation, source/layout replay, immutable
  prior state, invalid role/side/map, empty edit and non-facet rejection. Rotation adds initial/edit equality,
  four sides, three block alignments, finite angles/units, zero reset, inherited overrides, exact primitive pixels,
  outer-margin reuse, collision/overflow and persistence rejection without relaxing existing bounds.
- Content anchoring evidence: `test/unit/actions/composition/facet-content-headers.test.js` and
  `test/contracts/facet-content-header-types.test.js` cover per-panel geometry, strokes/clips, four sides,
  rotation, inherited overrides, field titles, fixed shared top space, source/layout/theme/metrics replay,
  saved programs, unchanged defaults and atomic rejection.
- Evidence: `test/unit/actions/composition/facet.test.js`,
  `test/unit/actions/composition/facet-display-headers.test.js`,
  `test/unit/actions/composition/facet-side-headers.test.js`,
  `test/unit/grammar/layout/facets.test.js`, and
  `test/charts/cars-origin-scatterplot-facet/facet-variants.test.js`,
  `test/unit/actions/composition/facet-header-rotation.test.js`,
  `test/contracts/facet-header-rotation-types.test.js`, and
  `test/charts/facet-header-rotation/`.

## `editCompositionLayout`

- Signature: `editCompositionLayout({ columns?, gap?, spacing?, topLane?, align?, padding?, legends? })`.
- Requires an existing composition program and at least one layout option.
- `columns`: positive integer for one-field facet and repeat layouts, no larger than the retained child count.
  A row-column grid keeps the width of its declared column domain; concat compositions reject it.
- `gap`: non-negative finite distance between adjacent child slots, or a closed `{x,y}` pair on facet parents only (see Independent axis gaps).
- `align`: `"start" | "center" | "end"` on the cross axis.
- `padding`: a non-negative scalar for all sides or a partial `{ top?, right?, bottom?, left? }` patch.
- Effect: preserves the ordered child IDs and child program references, then rebuilds the complete parent snapshot
  from canonical child state. Omitted options preserve current values.
- Facet compositions use the same action for columns, gap, alignment, and padding. Their derived children, child
  references, field/data identity and value order are retained while the complete parent snapshot is rebuilt.

### Formal values — `editCompositionLayout`

- Implemented: `editCompositionLayout({ columns?: PositiveInteger; gap?: NonNegativeFinite | { x: NonNegativeFinite; y: NonNegativeFinite }; spacing?: "canvas" | "plot" | "content"; topLane?: "stacked" | "shared"; align?: "start" | "center" | "end"; padding?: NonNegativeFinite | Partial<FourSidePadding> }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editCompositionLayout`

- ✅ Covered: scalar and partial padding, every alignment, gap, facet columns, child preservation, immutable earlier
  program, complete rematerialization, facet compatibility, concat columns rejection, and invalid option rejection.
- Evidence: `test/unit/actions/composition/concat.test.js`, `test/unit/actions/composition/facet.test.js`,
  `test/unit/actions/composition/facet-editing.test.js`,
  `test/charts/program-composition/variants/layouts/public.test.js`.

### Named lookup data composition

- A row-preserving lookup may be faceted by a primary or copied field. Partition only the primary
  branch, retain its complete reference table, and replay both-input revisions atomically.
- `repeat` accepts a direct materialized lookup or computed dataset and changes only the selected encoding
  fields. It does not rewrite lookup inputs or computed expressions. Other derived-data repeat restrictions remain.
- Parameter-dependent computed fields retain their exact resource bindings in facet/repeat source snapshots. Parent editParameter revises that source and rebuilds children/shared guides/layout.
- Parameter evidence: `test/unit/actions/data/parameter-lifecycle.test.js`.
- Evidence: `test/unit/actions/composition/lookup-facets.test.js`.

## `editFacetScales`

- Signature: `editFacetScales({ x?, y?, xOffset?, yOffset?, theta?, r?, color?, stroke?, size?, shape?, opacity?, strokeDash?, parallelDimensions? })`.
- Requires an existing facet composition and at least one used channel whose `"shared" | "independent"` policy
  changes. Omitted channels preserve the complete current policy. Unused channels and conflicting policies on one
  shared scale ID are rejected before child replacement.
- The action reconstructs the current facet definition from the parent-retained pre-facet semantic/materialization
  state, preserving facet ID, field, source data, first-appearance value order, child IDs, layout, guide policy,
  headers and title. Every child is immutably rederived through the same filter/derived-data/rebind/materialization
  registry as `facet`.
- Shared automatic domains use the complete deterministic union; independent automatic domains are child-local.
  Explicit semantic domains remain authoritative. Shared histogram x keeps one boundary set; independent x replays
  each child's requested bin policy. Polar ranges/frames and Parallel dimension positions remain child-local even when
  their semantic domains are shared. Selection/label/highlight intent is replayed from the canonical unit state.
- Complete child derivation, scale resolution, guide compatibility and parent snapshot materialization run on a
  speculative immutable branch first. A failure preserves the previous parent, children, source and caller options.

### Formal values — `editFacetScales`

- Implemented: `editFacetScales(options: FacetScaleResolutions): ChartProgram` with at least one effective used-channel
  policy change.
- Implemented for used Cartesian channels, Polar `theta`/`r`, and `parallelDimensions`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetScales`

- ✅ Covered: partial policy preservation, shared↔independent domains, histogram bin replay, stable child IDs,
  immutable child replacement, title/highlight preservation, child replay trace, equivalent/unused/invalid policy
  rejection, incompatible shared legend atomicity, Polar/Parallel domains and local frames, attached-label replay,
  empty-partition policy, and non-facet rejection.
- Evidence: `test/unit/actions/composition/facet-editing.test.js`,
  `test/unit/actions/composition/facet-derived-families.test.js`, and
  `test/contracts/facet-policy-editing.test.js`,
  `test/contracts/polar-parallel-facets.test.js`.

## `editFacetGuides`

- Signature: `editFacetGuides({ axes?, legend? })`.
- Requires an existing facet composition and at least one supplied guide policy. Omitted policy preserves current
  intent. `axes` accepts scalar or per-channel policies described above; `legend` accepts `false | "shared" | LegendOptions`.
- Every child is rederived from the retained canonical unit state under the current scale policy before parent guide
  ownership is reconciled. Child guide configs come from retained unit children; parent-inferred shared legends never become
  child-owned guides. Removing a shared inferred legend also removes its parent-only config before recomposition.
  `"outer"` keeps only occupied-edge Cartesian axes for the current columns topology and is rejected for Polar,
  Parallel, and every `repeatCharts` composition. `"shared"`
  promotes one concretely compatible legend; incompatible independent child scales reject the complete call.
- Facet field/data/value order, child IDs, scale and layout policy, headers, title, selections and highlights are
  preserved. Earlier parent and child programs remain immutable.

### Formal values — `editFacetGuides`

- Implemented: `editFacetGuides({ axes?: "each" | "outer" | { x?: "each" | "outer"; y?: "each" | "outer" }; legend?: false | "shared" | LegendOptions }): ChartProgram`.
- Polar and Parallel child-local guide replay is implemented; their outer-axis promotion is explicitly unsupported.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetGuides`

- ✅ Covered: each↔outer ownership, false↔shared legend promotion, partial omission preservation, stable child IDs,
  immutable child replacement, incompatible shared legend atomicity, Polar/Parallel child-local guide preservation,
  outer-axis rejection, empty edit and non-facet rejection.
- Evidence: `test/unit/actions/composition/facet-editing.test.js`,
  `test/unit/actions/composition/facet-legend-families.test.js`, and
  `test/contracts/facet-policy-editing.test.js`,
  `test/contracts/polar-parallel-facets.test.js`.

## `replaceCompositionChild`

- Signature: `replaceCompositionChild({ target, program })`.
- `target`: one existing child slot ID.
- `program`: one complete unit or nested composition `ChartProgram` with no unfinished action stack.
- Effect: preserves the target ID, slot order and all sibling references, replaces only the named child, then
  rebuilds the complete parent snapshot. The child program itself remains immutable and is retained by reference.
- Facet children are derived from one canonical source and cannot be replaced through this action.

### Formal values — `replaceCompositionChild`

- Implemented: `replaceCompositionChild({ target: UserId; program: CompleteChartProgram }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `replaceCompositionChild`

- ✅ Covered: unit replacement, nested-child eligibility, slot/order preservation, immutable source and sibling
  identity, namespaced snapshot rebuilding, unknown target and incomplete child rejection.
- Evidence: `test/unit/actions/composition/concat.test.js`, `test/charts/program-composition/variants/layouts/public.test.js`,
  `test/charts/program-composition/variants/layouts/png.render.js`.

## `insertCompositionChild`

- Signature: `insertCompositionChild({ id, program, before?, after? })`.
- Adds one complete unit or nested composition under a new stable ID. `before` and `after` are mutually exclusive;
  omission appends. The referenced anchor must exist. Child validation precedes all state changes.
- Available only on concat compositions. The ordered child list is canonical and the complete namespaced snapshot is
  rematerialized without changing sibling references.

### Formal values — `insertCompositionChild`

- Implemented: `insertCompositionChild({ id: UserId; program: CompleteChartProgram; before?: UserId; after?: UserId }): ChartProgram`, with `before` and `after` mutually exclusive.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `insertCompositionChild`

- ✅ Covered: before/after/tail insertion, duplicate ID, unknown anchor, incomplete child, concat-only scope,
  preserved sibling identity, complete rematerialization and immutable failure.
- Evidence: `test/unit/actions/composition/named-child-editing.test.js`,
  `test/contracts/composition-family-matrix.test.js`.

## `removeCompositionChild`

- Signature: `removeCompositionChild({ target })`.
- Removes exactly one named concat child and its snapshot. A concat may retain one child after editing; removing that
  final child is rejected. Tail and interior removal use the same layout reconstruction.

### Formal values — `removeCompositionChild`

- Implemented: `removeCompositionChild({ target: ExistingConcatChildId }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeCompositionChild`

- ✅ Covered: interior and tail removal, valid one-child concat, final-child and unknown-child rejection, stable
  remaining references, rematerialized geometry and immutable failure.
- Evidence: `test/unit/actions/composition/named-child-editing.test.js`,
  `test/contracts/composition-family-matrix.test.js`.

## `reorderCompositionChildren`

- Signature: `reorderCompositionChildren({ order })`.
- `order` must contain every current child ID exactly once, with no duplicate or unknown value, and must differ from
  the current order. Child references remain identical while placement and snapshots follow the new order.

### Formal values — `reorderCompositionChildren`

- Implemented: `reorderCompositionChildren({ order: NonEmptyExactConcatChildIdTuple }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `reorderCompositionChildren`

- ✅ Covered: exact permutation, missing, duplicate, unknown and unchanged order rejection, preserved child
  references, fresh-concat graphic equality and immutable failure.
- Evidence: `test/unit/actions/composition/named-child-editing.test.js`,
  `test/contracts/composition-family-matrix.test.js`.

### Value coverage — named child structural editing

- ✅ Covered: before/after/tail insertion, duplicate/anchor/incomplete rejection, interior/tail removal, one-child
  concat, final-child rejection, exact reorder, fresh-concat graphic equality, immutable previous state and facet
  mutation rejection.
- Evidence: `test/unit/actions/composition/named-child-editing.test.js`,
  `test/contracts/composition-family-matrix.test.js`.

## Cross-feature integration contract

- A complete Cartesian, Polar or Parallel unit program may be a direct or nested `hconcat`/`vconcat` child. Each child keeps
  its semantic state, resolved scales, guides, selections, and immutable program identity; the parent stores only
  retained child programs plus a concrete namespaced Canvas snapshot.
- Replacing a nested child is explicit at every ancestor. Revise the leaf, call `replaceCompositionChild` on its
  immediate parent, and repeat for each outer parent. Earlier leaves and compositions remain unchanged.
- Automatic cross-axis sizing rematerializes unit children. Nested compositions keep their intrinsic layout and are
  placed inside the resolved slot using the outer composition's `align` policy instead of stretching their internal
  cells, gaps, or guide geometry.
- Every renderer applies each nested Canvas translation to both shape and text coordinates. PDF output preserves
  distinct child-local margins in `hconcat`/`vconcat`; a later child's text position includes its composition slot
  offset instead of falling back to the root or sibling origin.
- `facet` and `facetGrid` support the Cartesian families listed above plus Polar Point/Line/direct Arc/Pie/Rose/Radar
  and Parallel coordinates. Shared meaning domains are resolved across populated children while each child retains its
  own coordinate range/frame and local positional guides. `repeatCharts` additionally supports eligible Polar
  theta/r roles and one exact Parallel dimension; Pie/Radar and composite-role substitution remain explicit errors.
- Composition Canvas size remains derived from retained child Canvases. Resize a revised unit and pass it through
  `editFacetSource` to recompute every child range/frame; `editCanvas` itself remains a unit-program action.

### Value coverage — cross-feature integration

- ✅ Covered: direct and nested Polar concat, nested replacement and explicit ancestor propagation, immutable prior
  state, centered unequal snapshots, PDF text translation across unequal child margins, Cartesian/Polar/Parallel facet
  shared/independent scale and local-guide resolution, seven-family full-grid empties, non-Cartesian repeat roles,
  and explicit unsupported-role/outer-axis rejection.
- Evidence: `test/charts/cross-feature-integration/`,
  `test/contracts/composition-integration.test.js`,
  `test/contracts/polar-parallel-facets.test.js`, and
  `test/contracts/visual-capability-surface.test.js`, plus
  `test/unit/renderers/pdf-renderer.test.js` for backend translation parity.


### Retained header recipe during source edits

`editFacetSource` carries the existing canonical header configuration into the first native facet rebuild. It never validates an intermediate default header layout before restoring authored rotation, field titles or content anchors. The public header options and final atomicity contract are unchanged.

## Shared concat scales and plot alignment

Concat accepts `share: CompositionShares` (`x`, `y`, `color`, `stroke`, `size`, `shape`,
`opacity`, `strokeWidth`, `strokeDash`, each boolean). Omission leaves channels independent.
Each enabled channel must exist in every affected unit view. Shared position scales require
Cartesian positions. Field, field type, temporal interpretation, measurement units (count,
squared measurement, ordinary measurement), and mapping definitions must agree. Explicit
conflicting domains reject. One common explicit domain is authoritative; otherwise resolved
child domains are unioned, ordinal categories in stable first-seen order. Shared appearance
requires compatible palette/range. Source-dependent overlays do not introduce another scale owner.

A facet contributes its displayed cell domains after partition-local aggregation and stacking,
not the retained unpartitioned source template's resolved domain. Outer sharing applies the
union to every rendered cell, even when the facet originally used independent scales or its
source template already happened to equal the union. Authored explicit domains remain
authoritative. Disabling outer sharing restores the original facet policies and cell inference.

Canonical children retain authored domains and dimensions. The composition materializer derives
shared render snapshots on every child edit. Disabling sharing restores independent inference;
it does not retain the previous union as an authored fixed domain. Immutable-owner WeakMaps
cache these derived snapshots without adding persisted state or a global semantic observer.

Concat `align: "plot"` aligns both ends of the cross-axis plot. Unit render snapshots adopt the
largest cross-axis plot extent while keeping their own margins; canonical explicit child sizes
remain unchanged. Nested compositions distribute the required plot-extent increase across their tracks;
facets resize their source plot through editFacetSource. Text and symbols are rematerialized, not stretched. Existing `start`/`center`/`end` behavior is unchanged. Facets keep their own
`scales` and alignment policy.

## `createAdjacentPlot`

Creates a concat parent around the receiving complete unit, facet, or concat view and one new chart. On units/facets, `source` is an
explicit/current/unique independent mark; `id` names the new view and mark (default `adjacent`,
which must differ from the source view ID). Original view ID is the selected source mark ID.
A concat receiver requires `source: { childPath: readonly string[], id: ExistingIndependentMarkId }`.
The path is relative to the receiving view selected by `target.childPath` (root when omitted),
and must resolve to a unit or facet base mark. Missing paths/IDs, a concat source, an overlay
source, or a generated facet cell reject atomically. There is no implicit first-child source.
The existing concat is retained under its composition ID; a colliding new ID rejects.
For top/bottom, the new plot width is the receiver's plot-union width and its height comes from
the source view. Left/right use the receiver's plot-union height and source width. Group-local
titles and guide settings remain attached to the original group. Existing alignment and sharing
policies govern final snapshots; no bitmap stretching is involved.
The new chart receives an independent snapshot of the source's materialized data and theme.
Materialized input tables (datasets without a derived `source`) also remain available in the
new view, including columns absent from the selected summary. This is snapshot retention,
not a cross-view data dependency. Completion transforms preserve upstream positional-field
and aggregation meanings during inference.
`plot.options.data` may name another materialized dataset in the same source view.
`plot.inherit?: { color?: boolean }` controls omitted color/group defaults in both adjacent and layer constructors. False suppresses source color inheritance and inferred color grouping; explicit constructor color/group options remain authoritative. Unknown inheritance keys and nonboolean flags reject. Explicit Rug X/Y owns its axis rather than inheriting a second source axis. Explicit Area X/Y uses the native valueChannel default (Y), unless valueChannel is supplied.
`plot.options.id` is rejected; the top-level `id` owns both the new view and mark. The default is a line,
right placement and plot alignment. Horizontal placement defaults to shared Y and vertical placement to shared X only when field, measurement operations and Cartesian coordinate meanings are compatible. Caller
`share` replaces the default. No layer or data dependency is introduced between adjacent views.

All constructor defaults use the shared positional-role registry to recover original input fields and data. Line/bar retain supported aggregation and bins; point/distribution charts use original observations. Different measurement operations disable automatic sharing; explicit incompatible sharing rejects. Shared channels inherit scale definitions. New adjacent color legends also inherit the source shared legend's position and compatible presentation options; independent color legends retain constructor defaults. Ambiguous additional roles require native options. All constructors
retain their ordinary validity and data-shape requirements. Explicit native plot options override
inferred values. New chart appearance uses its constructor; inherited theme/text metrics are retained.

### Formal values — `createAdjacentPlot`

- Implemented: `createAdjacentPlot({ id?: UserId, source?: ExistingIndependentMarkId | { childPath: readonly string[], id: ExistingIndependentMarkId }, position?: "left"|"right"|"top"|"bottom", plot?: AdjacentPlotSpecification, share?: CompositionShares, gap?: NonNegativeFinite, align?: "plot"|"start"|"center"|"end", legends?: "local"|"collect" }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): None.

### Value coverage — `createAdjacentPlot`

- ✅ Covered. Evidence: `test/unit/actions/composition/shared-adjacent.test.js`, `test/unit/actions/composition/adjacent-groups.test.js` (group extent, explicit relative sources, scoped edits, titles, legends, and rejection), `test/charts/linked-composition/`, and `examples/shared-adjacent/` cover four edges, shared domains, primitive/pixel equivalence, nesting, persistence, and atomic target edits.

## `editCompositionScales`

Edits a nonempty subset of the concat parent's `share` policies and rematerializes once. Omitted
channels are preserved; false restores independent rendering. Incompatible requested sharing
rejects without changing any previous program or child. Facet callers use `editFacetScales`.

공유 대상은 데이터 필드 또는 count 의미가 있는 채널 바인딩이다. 상수 주석 위치의
독립적인 plot-fraction 스케일은 공유 domain 계산에서 제외하며 각 plot의 anchor를 유지한다.
데이터 좌표 주석이 원본 마크의 스케일을 참조하면 그 스케일의 공유 결과를 그대로 따른다.
Evidence: `test/unit/actions/composition/shared-annotations.test.js` (X/Y, facet, adjacent, scoped edits, persistence).

### Formal values — `editCompositionScales`

- Implemented: `editCompositionScales({ share: NonEmpty<CompositionShares> }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): None.

### Value coverage — `editCompositionScales`

- ✅ Covered. Evidence: `test/unit/actions/composition/shared-adjacent.test.js`: domain growth/shrink, reset to independent, compatibility, and mutation isolation.

## Explicit action targets

Full authoring adds `target: { childPath: string[], id?: string, facetSource?: true }` or a nonempty array of string
IDs and/or these selectors to ordinary action options. An empty path addresses the current
view. `id` becomes that native action's ordinary `target`; omission selects the view itself and
keeps the native action's existing inference. For example a title uses a path without an ID,
while `encodeColor` identifies a mark. No wildcard silently chooses eligible marks. The UI can
construct an explicit list for All. Basic retains its original single-target option types.

Each target invokes the same public native function. Immutable candidates are edited first;
all changed ancestors and shared-domain constraints are materialized from the complete final
state. A failure returns no partially edited program. Duplicate targets, unknown paths and
ambiguous native targets reject. Facet source edits use `editFacetSource`, or `facetSource: true` on an explicit facet-view selector. That selector routes the same requested native action through the retained facet source and regenerates cells; it can be mixed atomically with ordinary-view selectors. The flag rejects on nonfacet views and accepts only literal true. Inspection resolves the same retained source. Paths through generated facet cells are rejected to avoid losing edits on source replay. Parent/source overlapping target lists must be structurally valid.
The outer trace records one requested function; retained child traces contain the native edits.


## Concat parent titles, shared color guide, and uniform surfaces

- `hconcat`/`vconcat` accept `legends: "local" | "collect"`. Omission preserves local independent guides and the existing shared-color collection. `createAdjacentPlot` defaults to `"collect"`; explicit `"local"` retains the lower-level policy. `editCompositionLayout({legends})` changes this policy on concat only; facets reject it and retain `editFacetGuides`.
- Collect mode displays every visible native legend block around the complete parent plot union (right by ordinary guide defaults), including independent size/opacity/stroke and faceted/nested owners. Only compatible shared-color explanations are deduplicated; unrelated mappings retain separate blocks. Overlapping outside blocks pack along the same edge with the native side/horizontal block gaps, while explicit non-overlapping offsets remain intact. Corners/free placement retain their parent-plot anchors. Child data, plot dimensions, authored guides and styles are unchanged.
- Scoped edits, drag offsets and resizing validate collected guides in the parent frame; hidden local copies do not participate in child fit/collision checks. Switching back to local placement restores canonical children. The collection policy is stored once in `compositionSpec.legends`, validated on import and retained across layout/source/guide replay. No renderer-specific behavior is added.
- Evidence: `test/unit/actions/composition/collected-guide-placement.test.js` covers all four edges, nested/faceted owners, independent mappings, policy changes, invalid values and persistence.

- `createTitle`/`editTitle`/`removeTitle` without a target own one parent title resource.
  Explicit child paths retain per-view title behavior. Four-edge title/subtitle lanes
  align to the translated plot union and rematerialize after layout and child edits.
- A shared color scale collects compatible guide snapshots into one shared legend at the representative block's authored position and alignment. The same resolved frame reserves the Canvas lane, shifts child placements for top/left anchors, and preserves in-plot anchors. Explicit legend presentation is retained when adding a same-color neighbour, including left/top insertion.
  Outside offsets are measured from the translated plot union, not child Canvas edges or a removed legend's old lane. Inferred offsets clear retained concrete content on the same edge; explicit offsets remain exact and reject occupied-content collisions. Free `at` coordinates remain plot-relative. Existing child margins are reused, and the parent Canvas grows only when the resolved legend requires more room. Child Canvas dimensions and plot sizes are preserved. Evidence: `test/unit/actions/composition/shared-legend-spacing.test.js`.
  A same-field categorical block that explains color plus shape/stroke/etc. also covers
  color-only blocks when its category mappings agree. Prefer the most informative block,
  then the first visible child for equal coverage. Conflicting extra mappings remain separate;
  unrelated size/other-field blocks are retained (in the outer lane in collect mode). Nested compositions collect only displayed
  blocks, including already-promoted combined legends, without deleting incompatible explanations.
  The native shared scale supplies the color domain. Canonical child guides remain unchanged
  and reappear separately when sharing is disabled.
- Equal child Canvas backgrounds fill parent gaps/padding and title/legend lanes.
  Mixed backgrounds preserve the existing parent surface (initially white).
- Serialization, nested child edits, and repeated guide creation preserve these rules.
- Evidence: `test/unit/actions/composition/concat-guides.test.js` and `shared-combined-legends.test.js`.

## `createLayerPlot`

- Signature: `createLayerPlot({ id?, source?, plot, placement? })`.
- Adds an independent native plot in an existing unit view. `plot.action` uses the same constructor registry as `createAdjacentPlot`; `plot.options` contains that constructor's options with source data and positional fields safely inferred. The top-level `id` owns the new plot; nested `options.id` is rejected. The default `layer` ID is available once. Scoped targets and `editFacetSource` reuse ordinary composition dispatch.
- `source` selects an independent plot owner. Compound Box/Violin/Gradient/Interval/Endpoint/Raincloud and derived dataset provenance resolve to the original input fields rather than internal statistical aliases. Read-only `getPlotComposition(program, { target?, childPath? })` from `ggaction/inspection` exposes version 1, owner, recursive ownedMarks, source data, coordinate, channels, dimensions and measurement provenance. It does not render or mutate a program.
- Layering requires compatible coordinate families, source fields, field types, temporal units and measurement units. Raw values, mean/median/quantile summaries share the original value unit. Count, sum, density, cumulative probability, normalized and folded values do not silently become raw observations. A count histogram can share its measure axis with a Rug; density/ECDF cannot be laid on count heights. Radar and Parallel layers require identical dimensions/order. Horizon layers require identical folding parameters. Ambiguous roles (e.g. Dumbbell's second measure) need explicit options.
- Shared named scales are reused, never reset by constructor defaults. Explicit conflicting scale definitions are rejected; edit the shared resource first. When a distribution requires band geometry, an existing categorical point scale is promoted with a native `editScale` child action so all consumers align. Parallel dimension `scale.id` can name an existing compatible scale.
- Implicitly re-encoding one positional field on a shared scale rejects if it would change the meaning still used by another independent owner. Explicit scale IDs retain the ordinary native resource semantics; a different scale remains subject to the existing guide-rebinding constraints. Pie layers preserve the exact category partition and weight; Rose and Radial Bar layers must retain the same area or radius-length mapping.
- `placement` is `front` (default) or `back`. All owned marks move as one block within their existing graphic parent; guides retain their relative order. Independent appearance edits target the new owner; shared scale edits affect all consumers. Constructors consume existing guides (`guides:false`); call `createGuides` once after constructing the view.
- Color uses the source mapping when its field is available at the new layer's statistical grain. Category-only summaries omit an unrelated inherited color while preserving the source layer's mapping; an explicit unsupported color rejects. Interval summaries infer categorical color as groupBy. An explicit Violin split preserves its split-field color. Endpoint summaries require color to be the category; continuous distribution grouping is rejected. Distinct coordinate families and incompatible units remain available through independent `createAdjacentPlot`.
- Line, Polar Line and Area inherit color only when the native path-series appearance contract accepts it at the prospective grouping. A varying per-observation continuous point color becomes a single-color path by default; it does not create artificial series or average the color. Compatible categorical color and explicit source grouping remain intact. Line and Polar Line retain a continuous color that is constant within each series; Area constructor color remains categorical. Explicit `plot.options.color` never silently disappears: incompatible fields reject in both inspection and execution. `plot.inherit.color: false` remains an explicit single-color choice, and `plot.options.groupBy` selects another supported series grain. Evidence: `test/unit/actions/composition/path-layer-color.test.js`.
- Existing `createOverlay` remains the explicit `visibleItems` follower. `createLayerPlot` recomputes its own native statistics from shared source data and is not a second follower implementation or stored chart recipe.
- `describeAction` uses the same constructor planner to report incompatible roles/units without constructing chart candidates. Successful preflight does not replace the native constructor's data-level validation.

### Formal values — `createLayerPlot`

- Implemented: `createLayerPlot({ id?: UserId, source?: ExistingIndependentMarkId, plot: LayerPlotSpecification, placement?: "front"|"back" }): ChartProgram`.
- `LayerPlotSpecification` is the native adjacent constructor union with optional inferable options. No app-only action or prototype patch is used. Default guide creation is suppressed; explicit non-false nested guides are rejected because guides belong to the shared view.
- Proposed (NOT IMPLEMENTED): None.
- Lifecycle: structural create-only; native constructor-specific editors, encoding actions, shared scale editors and `removeMark` own subsequent changes.

### Value coverage — `createLayerPlot`

- ✅ Covered. Evidence: `test/charts/linked-composition/variants/independent-layers/`: approved visual targets, 148 directional constructor combinations, shared resource/ownership, independent appearance, persistence and resize.
- `test/unit/actions/composition/layer-plot.test.js`: incompatible units/coordinates, immutable failures, facet/nested concat and source updates.

### Scoped edits of collected guides

Every collected legend block is validated in the parent layout where it is painted. Scoped public edits and local planning frames retain that visibility ownership: hidden source copies do not conflict with their former child axes. Uncollected guides still participate in native collision checks, and visible parent collisions reject atomically. The temporary editing context is removed before returning or persisting a program. Native source programs remain immutable. Evidence: `test/unit/actions/composition/shared-legend-offset.test.js`.

### Composition audit regression coverage

- `test/unit/actions/composition/audit-composition-regressions.test.js` verifies horizontal Bar/Dot/Lollipop/Line layers with source aggregation, original-field sharing from Violin to raw points, explicit Area/Rug roles, color inheritance suppression, categorical point guide retention, and mixed facet/ordinary atomic appearance edits including persistence and failure isolation.
- Shared concat field identity follows statistical transform provenance; category/value distributions retain their original value-field meaning. Explicit sum/raw comparison retains the value unit while automatic sharing still requires equal measurement operations. Normalized probability, density, count and squared units remain distinct.
- Horizontal categorical Line and compatible group/overlay/stack/diverging layers share a scale in common units; fill/center cannot mix with incompatible layouts. Category-positioned density silhouettes report the same visible-endpoint overlay incompatibility through inspection and execution.

### Binned and raw layer positions

A binned quantitative position may share its scale with an unbinned layer when
provenance resolves both to the same field, type, and measurement units. All
binned consumers still require an identical bin definition. An automatic domain
includes raw observations and binned endpoints without replacing source bin
assignments; explicit domains remain authoritative. Different fields or units
remain incompatible.


## Responsive nested reflow

Facet derivation resolves candidate scales before materializing guides. The final
shared or independent domains remain authoritative during a responsive range
solve; authored `domain: "auto"` is retained. Text metric apply/remove and
inherited theme replay explicitly carry each facet child's resolved domains into
layout-only work. This transient authority is restored on return and never
persisted. Empty full-grid cells retain their resolved shared domains and empty
mark graphics. Intrinsic authored-legend measurement replays resolved intent and
does not independently re-run the parent theme completion hook.

Nested concat source-target edits refresh facet snapshots, occupied bounds and all
ancestor placement while preserving unrelated child identities. The final bounds
owner remains `resolveGraphicBounds`. Legacy rotated header containment uses a
16-ULP scale-relative boundary allowance, matching responsive containment; actual
header/header and header/content intersections remain errors.

Resource-only inferred graphs may accompany native facet/repeat marks. Facet
projection uses a separate private prepared authority from same-source later
revision: exact old/new dataset refs, exact receiver/args and the complete graph
and layout dependency closure must agree. It cannot authorize an unrelated
revision, missing dependent result or changed graph definition. GraphPlot facet
support is unchanged. Projection context is not stored or exposed publicly.

Evidence: `test/unit/actions/composition/nested-responsive-layout.test.js`,
`facet-resource-projection.test.js`, `test/charts/nested-responsive/`, and
`test/browser/nested-responsive.browser.js`. No new authoring options or persisted
schema were introduced by this closure.
