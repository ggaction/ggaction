# Internal wrapped actions

These actions may appear in traces but are not public direct actions or primitives.

현재 등록된 wrapped method는 direct 204개와 internal 104개로 분리된다. 두 집합은 겹치지 않고 합집합은
등록된 308개 전체와 같다. [`../ACTION_INDEX.json`](../ACTION_INDEX.json)이 목록을 소유하며,
`test/contracts/action-catalog.test.js`는 wrapper metadata로 runtime을 읽어 누락·중복·orphan과 각 owner 표의 누락을 검사한다.

## Internal materialization inventory

이 표는 runtime과 trace에 존재하지만 public type과 direct action 계약에서 제외되는 wrapped
action의 전체 목록이다. 각 action은 해당 state 또는 graphical consumer를 소유한 public
domain action을 통해서만 실행한다.

| Internal action | Owning domain |
| --- | --- |
| `materializeBoxSummaryData` | `createBoxPlot` summary data |
| `materializeBoxOutlierData` | `createBoxPlot` optional outlier data |
| `materializeBoxPlot` | deferred `createBoxPlot` completion and position encodings |
| `materializeBinData` | reusable one-dimensional bin data actions |
| `materializeBin2DData` | rectangular 2D-bin data actions |
| `materializeComposition` | `hconcat`, `vconcat`, and composition edits |
| `materializeDensityData` | density data actions |
| `materializeGradientProfileData` | gradient-plot profile data actions |
| `materializeHorizonData` | `encodeHorizon` and `editHorizon` derived band data |
| `materializeGradientPlot` | deferred `createGradientPlot` completion and position encodings |
| `materializeGradientPlotFill` | gradient-plot body, scale, text, and density-legend consumers |
| `materializeFilteredData` | filter data actions |
| `materializeMarkFilteredData` | `filterMarks` selected-item member rows |
| `materializeIntervalData` | interval data actions |
| `materializeRegressionData` | regression data actions |
| `materializeSummaryData` | grouped summary data actions |
| `materializeTimeUnitData` | time-unit data actions |
| `materializeWindowData` | window data actions |
| `materializeRuleSpan` | error-bar cap components and rule rematerialization |
| `materializeLabelLayout` | `layoutLabels` and positioned-label rematerialization |
| `rematerializeArcMark` | arc mark and Polar encoding actions |
| `rematerializeAreaMark` | area mark and encoding actions |
| `rematerializeBarMark` | bar mark and encoding actions |
| `rematerializeErrorBandBoundary` | `editErrorBandBoundary` selected boundary appearance |
| `rematerializeErrorBar` | `editErrorBar` main rule and owned cap reconciliation |
| `rematerializeGradientLegend` | continuous color legend, scale, and Canvas actions |
| `rematerializeGradientPlotLegend` | gradient-plot density legend, Canvas, and appearance edits |
| `rematerializeIntervalLegend` | discretized color legend, scale, and Canvas actions |
| `rematerializeGrid` | grid aggregate and Canvas actions |
| `rematerializeHorizontalGrid` | horizontal grid and Canvas actions |
| `rematerializeHorizontalLegendLane` | top/bottom single occupied-bound alignment, multi-block packing and final Canvas fit |
| `rematerializeRadialGrid` | radial grid, scale, and Canvas actions |
| `rematerializeLegend` | legend, encoding, scale, and Canvas actions |
| `rematerializeLegendBackground` | categorical legend border/background component |
| `rematerializeLegendHighlights` | categorical legend and `highlightMarks` exact-group reflection |
| `rematerializeLegendLabels` | categorical legend label component |
| `rematerializeLegendSymbolLines` | categorical line-symbol component |
| `rematerializeLegendSymbolPoints` | categorical point-symbol component |
| `rematerializeLegendSymbolSwatches` | categorical swatch-symbol component |
| `rematerializeLegendSymbols` | categorical layered-symbol aggregate |
| `rematerializeLegendTitle` | categorical legend title component |
| `rematerializeLineMark` | line mark and encoding actions |
| `rematerializeMarkHighlights` | owning mark rematerializer reapplication of stored highlight assignments |
| `rematerializeOpacityLegend` | field-opacity legend, scale, and Canvas actions |
| `rematerializeParallelAxes` | Parallel dimension scales, axes, and Canvas actions |
| `rematerializePointMark` | point mark and encoding actions |
| `rematerializeRectMark` | rect mark and position/color encoding actions |
| `rematerializeRuleMark` | rule mark, endpoint, appearance, scale, and Canvas actions |
| `rematerializeScale` | scale-owning encoding and Canvas actions |
| `rematerializeSideLegendLane` | left/right categorical legend lane packing and Canvas actions |
| `rematerializeSizeLegend` | point size legend, scale, and Canvas actions |
| `rematerializeStrokeWidthLegend` | line/rule stroke-width legend, scale, and Canvas actions |
| `rematerializeThetaGrid` | theta grid, scale, and Canvas actions |
| `rematerializeTextMark` | text mark, position, content, and appearance actions |
| `rematerializeTickMark` | Tick position, angle, length, appearance, and Canvas actions |
| `rematerializeTitle` | title and Canvas actions |
| `rematerializeVerticalGrid` | vertical grid and Canvas actions |

## Internal state-transition inventory

| Internal action | Public owner | Role |
| --- | --- | --- |
| `composeFacetGuides` | `facet`, facet layout edits | Remove interior child axes/legends and attach one compatible parent legend |
| `rebindLayerData` | `facet`, derived-data revision owners | Rebind one layer to a replayed or revised dataset |
| `rebindGradientPlotProfile` | `facet` | Rebind one gradient owner config to its cell-local source and profile revision |
| `createCategoricalDensityData` | `encodeDensity`, `editDensity` | Create category/split density provenance before the shared density materializer runs |
| `configureAreaStrokeFromFill` | `createViolinPlot` | Preserve the intent that each categorical density outline follows its materialized fill |
| `clearStrokeDashEncoding` | `encodeStrokeDash` | Remove the previous semantic dash assignment before field/constant reassignment |
| `clearOpacityEncoding` | `encodeOpacity` | Remove the previous semantic opacity assignment before field/constant reassignment |
| `releaseDerivedData` | derived-data revision owners | Remove an unreferenced old derived revision through `editSemantic({ remove: true })` |
| `replayDerivedData` | `facet` | Recreate one supported stored transform through its canonical data materializer |
| `setQuantitativeColorScale` | `encodeColor` | Author sequential or discretized color-scale semantics through primitive edits |
| `useProgram` | `hconcat`, `vconcat`, and child replacement | Retain one immutable named child program before composition materialization |

## Internal guide component inventory

이 action들은 public guide 또는 encoding action이 호출하는 peer wrapped component다. Public
type과 direct action 계약에서는 제외되지만 hierarchy는 `trace`에 남는다.

| Internal action | Public owner | Role |
| --- | --- | --- |
| `createCategoricalLegend` | `createLegend` | categorical color/shape/stroke-dash block |
| `createGradientLegend` | `createLegend` | continuous color gradient block |
| `createIntervalLegend` | `createLegend` | discretized color interval swatch block |
| `createOpacityLegend` | `createLegend` | field-opacity sample block |
| `removeCategoricalLegend` | `encodeStrokeDash` | compose semantic/graphic primitive removals for a dash-only legend |
| `removeOpacityLegend` | `encodeOpacity` | compose semantic/graphic primitive removals for an ineligible field-opacity guide |
| `createSizeLegend` | `createLegend` | quantitative equal-area point-size block |
| `createStrokeWidthLegend` | `createLegend` | quantitative line/rule stroke-width sample block |
| `createLegendBackground` | `createLegend` | categorical legend background and border rectangle |
| `createLegendSymbols` | `createLegend` | aggregate of the compatible categorical symbol components |
| `createLegendSymbolLines` | `createLegend` | categorical line-symbol collection |
| `createLegendSymbolPoints` | `createLegend` | categorical point-symbol collection |
| `createLegendSymbolSwatches` | `createLegend` | categorical filled-swatch collection |
| `createLegendLabels` | `createLegend` | categorical legend label collection |
| `createLegendTitle` | `createLegend` | categorical legend title text |
| `createTitleText` | `createTitle` | primary title text graphic |
| `editTitleText` | `editTitle`, title rematerialization | revise the primary title text graphic |
| `createSubtitleText` | `createTitle`, `editTitle` | optional subtitle text graphic |
| `editSubtitleText` | `editTitle`, title rematerialization | revise an existing subtitle text graphic |

## Internal aggregate component inventory

| Internal action | Public owner | Role |
| --- | --- | --- |
| `createBoxSummaryData` | `createBoxPlot` | immutable quartile and observed-whisker rows |
| `createBoxOutlierData` | `createBoxPlot` | immutable owned source-row outliers |
| `createBoxMedian` | `createBoxPlot` | median rule spanning the concrete ranged-bar body |
| `createBoxOutliers` | `createBoxPlot` | diamond point realization for existing outlier rows |
| `createGradientProfileData` | `createGradientPlot`, `editGradientPlot` | immutable sampled category-profile revision |
| `createHorizonData` | `encodeHorizon`, `editHorizon` | immutable sign×band×segment data revision |
| `createGradientPlotCenter` | `createGradientPlot`, `editGradientPlot` | optional center rule for each category strip |
| `createGradientPlotLegend` | `createGradientPlot`, `editGradientPlot` | neutral relative-density legend |
| `createErrorBarCap` | `createErrorBar` | compose one namespaced fixed-pixel cap from rule and encoding child actions |
| `createErrorBandBoundary` | `createErrorBand`, `editErrorBandBoundary` | compose one namespaced lower or upper line boundary from ordinary mark and encoding actions |
| `applyPointHighlight` | `highlightMarks` | replace selected point child geometry and appearance from one stored selection |
| `applyBarHighlight` | `highlightMarks` | replace appearance on every rect attached to selected bar item or stack keys |
| `applyRectHighlight` | `highlightMarks` | replace appearance on selected observed rect cells |
| `applyPathHighlight` | `highlightMarks` | replace selected line/area path appearance and translate path commands |
| `dimUnselectedMarkItems` | `highlightMarks` | assign complement opacity without changing selected children |
| `placeSelectedMarkItemsLast` | `highlightMarks` | place selected collection children after their complement |
| `applyRuleHighlight` | `highlightMarks` | replace selected rule appearance and translate concrete endpoints |

`clearStrokeDashEncoding`은 `encodeStrokeDash`가 field/constant mode를 교체하기 전에 이전
semantic channel을 `editSemantic({ remove: true })` child로 제거하는 internal wrapped
state-transition action이다. `clearOpacityEncoding`도 같은 protocol을 사용한다. Named scale
resource는 삭제하지 않으며 새 assignment와 dependent materialization은 public owner가 이어서 수행한다.
