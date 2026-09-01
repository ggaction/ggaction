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
