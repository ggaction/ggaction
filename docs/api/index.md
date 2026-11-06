---
layout: default
title: Chart API
---

# Chart API

{% include chart-example.html id="scatterplot" lead=true %}

Build a chart from a small set of domain actions. Start with the family that
owns the decision you need to make; follow its focused pages only when the
overview no longer provides enough control.

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./basic-charts/"><strong>Basic charts</strong><span>Create scatter, line, bar, histogram, and heatmap charts from their minimum field decisions.</span></a>
  <a href="./canvas/"><strong>Canvas</strong><span>Create and resize the drawing surface, background, and plot margins.</span></a>
  <a href="./data/"><strong>Data and transforms</strong><span>Create immutable source data, derived datasets, filters, bins, windows, and statistical transforms.</span></a>
  <a href="./marks/"><strong>Marks</strong><span>Create point, line, area, bar, rule, text, rect, tick, arc, and image layers.</span></a>
  <a href="./encodings/"><strong>Encodings</strong><span>Map fields and constants to position, grouping, and appearance.</span></a>
  <a href="./coordinates/"><strong>Coordinates</strong><span>Use Cartesian, Polar, Parallel, or Geo coordinate systems.</span></a>
  <a href="./scales/"><strong>Scales</strong><span>Control domains, ranges, mapping types, palettes, and missing values.</span></a>
  <a href="./parallel-coordinates/"><strong>Parallel coordinates</strong><span>Compare each source row across an ordered set of dimension-local scales.</span></a>
  <a href="./guides/"><strong>Guides and titles</strong><span>Create axes, grids, legends, and chart titles from existing encodings.</span></a>
  <a href="./composition/"><strong>Program composition</strong><span>Arrange complete chart programs horizontally or vertically and replace stable child slots.</span></a>
  <a href="./rendering/"><strong>Rendering</strong><span>Render the fully materialized program to Browser Canvas, SVG, Node PNG, or vector PDF.</span></a>
</div>

## All complete chart families

The [complete chart picker](./chart-picker.md) covers the general-purpose chart facades, including
Pie, Area, Density, Horizon, endpoint charts, ECDF, Rug, Strip, Beeswarm, and Raincloud. Specialized
families with their own layout or resource are listed below and under
[Specialized chart families](./chart-picker.md#specialized-chart-families).

## Statistical and distribution facades

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./regression/"><strong>Regression</strong><span>Add grouped fitted lines and optional confidence bands to encoded observations.</span></a>
  <a href="./error-bars/"><strong>Error bars</strong><span>Show observed values with explicit or derived interval endpoints.</span></a>
  <a href="./error-bands/"><strong>Error bands</strong><span>Show continuous uncertainty ribbons with optional boundaries.</span></a>
  <a href="./box-plots/"><strong>Box plots</strong><span>Summarize quartiles, whiskers, medians, and outliers by category.</span></a>
  <a href="./gradient-plots/"><strong>Gradient plots</strong><span>Compare category distributions as compact density fills.</span></a>
  <a href="./violin-plots/"><strong>Violin plots</strong><span>Compare symmetric or split density shapes by category.</span></a>
</div>

## Hierarchies, networks and maps

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./hierarchy/"><strong>Hierarchy</strong><span>Build typed hierarchies and draw trees and treemaps from stored layouts.</span></a>
  <a href="./partition/"><strong>Partition</strong><span>Draw icicle and sunburst charts with focus and navigation.</span></a>
  <a href="./graphs/"><strong>Graphs</strong><span>Store observed or inferred graphs, lay them out, and draw node-link plots.</span></a>
  <a href="./edge-routes/"><strong>Edge routes</strong><span>Bundle graph edges with hierarchical, force-directed, density, or edge-path routing.</span></a>
  <a href="./flows/"><strong>Flows and Sankey</strong><span>Draw conserved flows, including cyclic feedback.</span></a>
  <a href="./geometry/"><strong>Geometry and maps</strong><span>Project GeoJSON/TopoJSON features and draw shapes, points, lines, and graticules.</span></a>
  <a href="./contours/"><strong>Contours</strong><span>Draw contour lines and filled bands from grids or 2D density.</span></a>
  <a href="./calendar/"><strong>Calendar</strong><span>Lay out civil-day values in week and weekday cells.</span></a>
</div>

## Specialized plots

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./pyramid/"><strong>Pyramid</strong><span>Show ordered stages as trapezoids with explicit percent bases.</span></a>
  <a href="./ohlc/"><strong>OHLC</strong><span>Show open, high, low, and close per row.</span></a>
  <a href="./waterfall/"><strong>Waterfall</strong><span>Show signed contributions, subtotals, and totals.</span></a>
  <a href="./trail/"><strong>Trail</strong><span>Draw ribbons whose pixel width varies per sample.</span></a>
  <a href="./table/"><strong>Table</strong><span>Draw formatted rows with in-cell bars and sparklines.</span></a>
</div>

## Interaction, animation and live charts

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./live/"><strong>Live charts</strong><span>Attach a chart to a canvas; tooltips, brushing, zoom, and animated updates take one call each.</span></a>
  <a href="./interaction/"><strong>Interaction sessions</strong><span>Hit test, select, brush, link, navigate, and edit charts with undo and redo.</span></a>
  <a href="./animation/"><strong>Animation</strong><span>Plan, play, save, and export transitions between immutable programs.</span></a>
</div>

## Exact action lookup

Use the [complete action reference](../reference/actions.md) when you know an
action name and need its canonical signature. Extension authors should use the
[extension API](../extension/action-authoring.md) rather than depending on
internal trace operations.
