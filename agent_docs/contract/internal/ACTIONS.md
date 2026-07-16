# Internal wrapped actions

These actions may appear in traces but are not public direct actions or primitives.

## Internal materialization inventory

이 표는 runtime과 trace에 존재하지만 public type과 direct action 계약에서 제외되는 wrapped
action의 전체 목록이다. 각 action은 해당 state 또는 graphical consumer를 소유한 public
domain action을 통해서만 실행한다.

| Internal action | Owning domain |
| --- | --- |
| `materializeBoxSummaryData` | `createBoxPlot` summary data |
| `materializeBoxOutlierData` | `createBoxPlot` optional outlier data |
| `materializeBoxPlot` | deferred `createBoxPlot` completion and position encodings |
| `materializeDensityData` | density data actions |
| `materializeFilteredData` | filter data actions |
| `materializeMarkFilteredData` | `filterMarks` selected-item member rows |
| `materializeIntervalData` | interval data actions |
| `materializeRegressionData` | regression data actions |
| `materializeRuleSpan` | error-bar cap components and rule rematerialization |
| `rematerializeAreaMark` | area mark and encoding actions |
| `rematerializeBarMark` | bar mark and encoding actions |
| `rematerializeGradientLegend` | continuous color legend, scale, and Canvas actions |
| `rematerializeGrid` | grid aggregate and Canvas actions |
| `rematerializeHorizontalGrid` | horizontal grid and Canvas actions |
| `rematerializeLegend` | legend, encoding, scale, and Canvas actions |
| `rematerializeLegendHighlights` | categorical legend and `highlightMarks` exact-group reflection |
| `rematerializeLineMark` | line mark and encoding actions |
| `rematerializeMarkHighlights` | owning mark rematerializer reapplication of stored highlight assignments |
| `rematerializeOpacityLegend` | field-opacity legend, scale, and Canvas actions |
| `rematerializePointMark` | point mark and encoding actions |
| `rematerializeRuleMark` | rule mark, endpoint, appearance, scale, and Canvas actions |
| `rematerializeScale` | scale-owning encoding and Canvas actions |
| `rematerializeSizeLegend` | point size legend, scale, and Canvas actions |
| `rematerializeTitle` | title and Canvas actions |
| `rematerializeVerticalGrid` | vertical grid and Canvas actions |

## Internal state-transition inventory

| Internal action | Public owner | Role |
| --- | --- | --- |
| `releaseDerivedData` | `editDensity` | Remove an unreferenced old derived revision through `editSemantic({ remove: true })` |

## Internal guide component inventory

이 action들은 public guide 또는 encoding action이 호출하는 peer wrapped component다. Public
type과 direct action 계약에서는 제외되지만 hierarchy는 `trace`에 남는다.

| Internal action | Public owner | Role |
| --- | --- | --- |
| `createCategoricalLegend` | `createLegend` | categorical color/shape/stroke-dash block |
| `createGradientLegend` | `createLegend` | continuous color gradient block |
| `createOpacityLegend` | `createLegend` | field-opacity sample block |
| `removeCategoricalLegend` | `encodeStrokeDash` | compose semantic/graphic primitive removals for a dash-only legend |
| `removeOpacityLegend` | `encodeOpacity` | compose semantic/graphic primitive removals for an ineligible field-opacity guide |
| `createSizeLegend` | `createLegend` | quantitative equal-area point-size block |

## Internal aggregate component inventory

| Internal action | Public owner | Role |
| --- | --- | --- |
| `createBoxSummaryData` | `createBoxPlot` | immutable quartile and observed-whisker rows |
| `createBoxOutlierData` | `createBoxPlot` | immutable owned source-row outliers |
| `createBoxMedian` | `createBoxPlot` | median rule spanning the concrete ranged-bar body |
| `createBoxOutliers` | `createBoxPlot` | diamond point realization for existing outlier rows |
| `createErrorBarCap` | `createErrorBar` | compose one namespaced fixed-pixel cap from rule and encoding child actions |
| `createErrorBandBoundary` | `createErrorBand` | compose one namespaced lower or upper line boundary from ordinary mark and encoding actions |
| `applyPointHighlight` | `highlightMarks` | replace selected point child geometry and appearance from one stored selection |
| `applyBarHighlight` | `highlightMarks` | replace appearance on every rect attached to selected bar item or stack keys |
| `applyPathHighlight` | `highlightMarks` | replace selected line/area path appearance and translate path commands |
| `dimUnselectedMarkItems` | `highlightMarks` | assign complement opacity without changing selected children |
| `placeSelectedMarkItemsLast` | `highlightMarks` | place selected collection children after their complement |
| `applyRuleHighlight` | `highlightMarks` | replace selected rule appearance and translate concrete endpoints |

`clearStrokeDashEncoding`은 `encodeStrokeDash`가 field/constant mode를 교체하기 전에 이전
semantic channel을 `editSemantic({ remove: true })` child로 제거하는 internal wrapped
state-transition action이다. `clearOpacityEncoding`도 같은 protocol을 사용한다. Named scale
resource는 삭제하지 않으며 새 assignment와 dependent materialization은 public owner가 이어서 수행한다.
