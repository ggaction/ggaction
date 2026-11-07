---
layout: default
title: Performance and Large Charts
---

# Performance and Large Charts

Performance depends on source-row count, derived transforms, final graphic
item count, text measurement, output dimensions, and renderer choice. ggaction
does not publish a universal “maximum rows” number: two datasets with the same
length can materialize very different graphics. Measure the complete program
and final output used by the product.

## Choose the output deliberately

| Target | Main cost | Prefer when |
| --- | --- | --- |
| Browser Canvas | Drawing every concrete item on each render | A page needs fast static raster presentation |
| SVG | String size plus browser DOM parsing after insertion | Scalable output and moderate graphic counts matter |
| PNG | Native raster allocation and file encoding | A fixed artifact is consumed repeatedly |
| PDF | Vector page construction and file output | Print or document workflows need one vector page |

SVG is not automatically faster because it is vector. A chart with many
concrete items can create a large string and a large DOM after insertion.
Canvas avoids that DOM cost but redraws pixels. Compare the actual outputs.

## Measure authoring and rendering separately

This timing fragment assumes the host application's `buildChart`, `rows`, and
Canvas `context`, plus ggaction's imported `render` function.

```javascript
const authorStart = performance.now();
const program = buildChart(rows);
const authorMilliseconds = performance.now() - authorStart;

const renderStart = performance.now();
render(program, context);
const renderMilliseconds = performance.now() - renderStart;

console.table({ authorMilliseconds, renderMilliseconds });
```

Run warm and cold samples, retain row and graphic counts with the result, and
profile the slowest supported environment. Avoid timing network fetches in the
same measurement unless the product question is end-to-end latency.

## Reduce work at the right boundary

- Filter or aggregate source rows before chart construction when individual
  rows are not part of the intended visual grain.
- Prefer a complete chart facade for initial construction. Repeated edit
  actions intentionally rematerialize affected resources and are best used for
  meaningful revisions, not as a row-by-row builder.
- Keep source data immutable and rebuild once per accepted update. Coalesce
  resize, filter, and refresh events in the host application.
- Treat text as layout work. Dense labels, wrapped titles, collision layout,
  and large legends require measurement and can dominate a small mark layer.
- Use facets and compositions only when every child view is necessary. Each
  child is a complete program snapshot with its own concrete graphics.
- Reuse a completed program for multiple renderers when semantics and logical
  dimensions are unchanged; renderers consume the same `graphicSpec`.

## Generated-work limits

Many expansion operations cap generated items at 10,000 per operation. This
applies to grid values, symbols, aggregate layout cells and each concrete mark
collection. Point layers default to 50,000 items and accept `maxItems` up to
100,000; graph plots accept `maxItems` up to 100,000. Because the limits apply
to final graphic items, aggregate before drawing bars, rects or text for very
large tables. Paths have a separate 30,000-command bound, counting interpolation
expansion and area closure; it is not a universal source-row limit. Geo shape,
point, line and graticule marks can raise their own projected-point and
path-command budgets up to 200,000 with `capacity`; see
[Projected output limits](./api/geometry.md#projected-output-limits). Work-intensive calculations such as
label collision planning also have a 10,000,000-work-item budget. The shared
validator reports `resource-limit` with the named quantity, `limit`, and
`actual` through `getErrorDetails` from `ggaction/diagnostics`. Reduce the
expansion (for example, fewer bins or labels) while preserving chart meaning.

## Keep large updates responsive

`reviseDataInSlices` (from `ggaction`) and `loadProgramInSlices` (from
`ggaction/persistence`) return the same result as `reviseData` and
`deserializeProgram` but yield to the host between slices. They do not reduce
total work: a 100,000-row revision still takes about two seconds. A slice ends
at the first 1,024-row batch boundary after `sliceMs`, so a pause can exceed
`sliceMs` by one batch plus any garbage-collection pause. For interactive pages,
prefer `sliceMs` of 10–20 over the default 40. Prepare graph edge routes and
inferred graphs in a worker through [`ggaction/graph`](./api/edge-routes.md#prepare-in-a-worker).

## Geographic camera cost

Camera frames reproject every source vertex; no vertex is dropped or simplified.
In the release benchmark (Chromium, one line with the given number of vertices,
P95 per sampled camera frame) 1,000 vertices take about 2 ms, 10,000 about
13 ms and 100,000 about 145 ms, roughly three times a 50 ms interactive budget.
Hit queries on the same 100,000-vertex path stay near 3 ms. Native pan and zoom
previews also re-run the projection edit, so very large sources respond slowly
to drags. For smooth navigation, simplify with `createGeoLODData` level
`tolerance`, or show a coarser level while zoomed out.

## Known limits

This release records these measured limits (Chromium, P95 of 30 runs, device
pixel ratio 1 / 2):

- **100,000 data rows.** The longest host pause of `loadProgramInSlices` is about
  55 / 58 ms and of `reviseDataInSlices` about 112 / 78 ms against a 50 ms target,
  because of browser garbage collection. 1,000 and 10,000 rows stay under about
  25 ms.
- **100,000-vertex geographic camera preview.** About 145 / 148 ms per frame
  against a 50 ms target; see [Geographic camera cost](#geographic-camera-cost).
- **Edge bundling.** Density bundling takes about 4.5 seconds at 100 edges and
  exceeds the 30-second deadline at 1,000; force-directed bundling takes about
  2.5 seconds at 1,000 edges with an explicit work budget and exceeds the deadline
  at 10,000. Cancellation can take longer than 100 ms for density bundling at 100
  edges (about 125 ms), force-directed bundling at 1,000 edges (up to about
  105 ms) and any method at 10,000 edges (several hundred milliseconds). See
  [Edge routes](./api/edge-routes.md#known-performance-limits).

## Allocation limits

Canvas and PNG reject a physical side above 32,767 pixels or a complete raster
allocation above 16,777,216 pixels. Physical dimensions are logical Canvas
dimensions multiplied by `pixelRatio` and rounded. PDF page dimensions must
be positive integers no larger than 16,777,216, although practical document
and viewer limits are usually much lower.

These checks happen before the renderer changes the Canvas backing store or
writes the output. Catch the error, reduce logical dimensions or pixel ratio,
and retry from the unchanged program.

## Large-chart review

1. Record source rows, derived rows, and final graphic item counts.
2. Confirm the chart still communicates at that density; aggregation can be a
   semantic improvement, not merely an optimization.
3. Measure authoring, rendering, output bytes, and browser insertion
   separately.
4. Test the slowest supported device and the largest approved output.
5. Add a regression budget based on that named workload rather than an
   unqualified global row limit.

## Related

[Rendering](./api/rendering.md) · [Responsive charts](./responsive-charts.md) ·
[Data updates](./data-updates.md) · [Supported features](./supported-features.md)
