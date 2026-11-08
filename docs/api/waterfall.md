---
layout: default
title: Waterfall Plots
---

# Waterfall plots

Show ordered contributions, subtotals and totals as one bar per source row.
Connectors show the running balance between stages. These Full entry actions
use the same concrete graphics in Canvas, SVG, PNG and PDF.

{% include chart-example.html id="waterfall" %}

## Example with real data

<!-- showcase-program:temperature-waterfall:start -->

{% include chart-example.html id="temperature-waterfall" %}

`createTemperatureWaterfall` builds this chart from real data. It receives the rows of `data/showcase/global-temperatures.csv` (NASA GISTEMP, public domain) with numeric fields parsed.
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart } from "ggaction";

// NASA GISTEMP annual (J-D) anomalies: the 2013 level plus each later year's change.
export function createTemperatureWaterfall(temperatures) {
  const years = temperatures
    .filter(row => row.Year >= 2013 && row.Year <= 2022 && Number.isFinite(row["J-D"]))
    .map(row => ({ year: row.Year, anomaly: row["J-D"] }));
  const steps = years.map((row, index) => ({
    id: String(row.year),
    stage: index === 0 ? "2013 level" : String(row.year),
    role: "delta",
    value: index === 0 ? row.anomaly : Number((row.anomaly - years[index - 1].anomaly).toFixed(2))
  }));
  steps.push({ id: "total", stage: "2022 level", role: "total" });

  return chart()
    .createCanvas({ width: 900, height: 460, margin: { top: 80, right: 40, bottom: 60, left: 70 } })
    .createData({ id: "steps", keyField: "id", values: steps })
    .createWaterfallPlot({
      x: "stage",
      role: "role",
      value: "value",
      width: { band: 0.65 },
      // Leave room above the highest running total for its label.
      yScale: { domain: [0, 1.2] },
      labels: { content: "value", format: ".2f", fontSize: 12 },
      guides: {
        axes: { x: { title: false }, y: { title: { text: "Temperature anomaly (°C)" } } },
        legend: false,
        grid: { horizontal: true, vertical: false }
      }
    })
    .createTitle({
      text: "How the global temperature anomaly moved, 2013–2022",
      subtitle: "Green bars warm the running total, red bars cool it · NASA GISTEMP annual means"
    });
}
```

<!-- showcase-program:temperature-waterfall:end -->

## `createWaterfallPlot`

**Chart authoring.**

```typescript
createWaterfallPlot(options: TargetedOptions<CreateWaterfallPlotOptions>): ChartProgram;
```

Pass `x`, `role` and `value` field names. X is categorical, in source order by
default; `{field,fieldType?:"nominal"|"ordinal",scale?}` specifies its scale.
The role column determines the arithmetic:

| Role | Value and running balance |
| --- | --- |
| `delta` | Requires a finite value; starts at the running balance and adds that value |
| `subtotal` | Requires the value field to be absent; draws the current balance from zero |
| `total` | Draws an explicit finite value, or the current balance when the field is absent, from zero |

Totals and subtotals do not change the balance unless their optional `reset`
field is `true`. Pass `reset: "fieldName"` to bind it. A delta row must omit that
field, even when other rows use it. Null, undefined, unknown roles and numeric
overflow are errors. Roles are never inferred from labels.

Options are `{id?,data?,coordinate?,x,role,value,reset?,yScale?,width?,bars?,
connectors?,labels?,color?,clip?,guides?}`. The default ID is `waterfall`.
Data and coordinate references must be explicit when no current or unique
eligible resource exists. `yScale` supports `linear`, `pow`, `sqrt` and `symlog`;
its default domain includes zero and the actual cumulative endpoints. Log position
scales are rejected because contributions and totals use a zero origin. Log color
scales remain available for eligible color values. Default
scale IDs are `<id>-x` and `<id>-y`.

| Option | Behavior |
| --- | --- |
| `width` | `{band:.72}` by default, or `{pixels}`; band width uses the band bandwidth, or the point scale step; policies are mutually exclusive |
| `bars` | `positiveFill`, `negativeFill`, `totalFill`, `subtotalFill`, `stroke`, `strokeWidth`, `opacity`, `outline`, `shadow` |
| `connectors` | Enabled by default; `{stroke?,strokeWidth?,opacity?,outline?,shadow?}` or `false` |
| `labels` | `false` by default, or `{content?,format?,fill?,fontFamily?,fontSize?,fontWeight?,offset?,outline?,shadow?}` |
| `color` | Field string or `{field,fieldType?,scale?,palette?}`; replaces bar fills through an ordinary color scale |
| `clip` | `true` by default; clips to the plot viewport |
| `guides` | Ordinary axes/grid/legend options, or `false` |

Positive, negative, total and subtotal fills default to `#16a34a`, `#dc2626`,
`#2563eb` and `#64748b`. Bar stroke is `#334155`; connector stroke is `#64748b`.
Both use width 1 and opacity 1. Fills accept structured paints; effects use the
ordinary outline and shadow options.

Each incoming connector belongs to its current stage. It joins the previous
bar's right edge to the current bar's left edge at the balance **before** the
current stage. An explicit total can differ from that balance. A reset makes
the next connector start at zero.

Labels show `value` by default, or `end` or `category`. They use the ordinary
Text formatter and font preparation, 6 logical pixels above the screen top of
the bar. Defaults are sans-serif, size 12, normal weight and fill `#0f172a`.
Allow space above the data domain or change clipping when labels need room.

Overlays in one Cartesian frame must share one Y scale: pass the existing X and Y
scale IDs, for example `x: { field, scale: { id: "x" } }` and `yScale: { id: "y" }`.
Otherwise the action fails before changing the chart.

A plot may generate at most 10,000 graphics: a bar per row, a connector between
rows, and an optional label. Larger inputs fail before changing the chart.

## `editWaterfallPlot`

**Chart authoring.**

```typescript
editWaterfallPlot(options: TargetedOptions<EditWaterfallPlotOptions>): ChartProgram;
```

Patch fields, scales or appearance on an existing plot. Targets may name a mark
or an explicit child path. Omitted options stay unchanged; null, undefined and
an empty patch are errors. `reset:false` removes the reset binding. Set
`connectors`, `labels` or `color` to `false` to remove that choice. Omitting
`guides` while editing preserves current guide presence.

Typed row keys identify stages across revisions and reordering. Bar, connector
and label share one logical selection and hit item. Implicit totals also expose
the source contributions they summarize. Filtering recalculates from retained
rows; facets calculate within each panel. Duplicate X labels remain distinct
rows and may overlap at the same position.

Themes change stroke and label typography while preserving role fill colors.
Editable and graphic snapshots support offline rendering. See the
[Waterfall tutorial](../tutorials/waterfall.md) for a complete call chain.
