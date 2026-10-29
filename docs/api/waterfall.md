---
layout: default
title: Waterfall Plots
---

# Waterfall plots

Show ordered contributions, subtotals and totals as one bar per source row.
Connectors show the running balance between stages. These Full entry actions
use the same concrete graphics in Canvas, SVG, PNG and PDF.

{% include chart-example.html id="waterfall" %}

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
eligible resource exists. `yScale` uses ordinary quantitative position options;
its default domain includes zero and the actual cumulative endpoints. Default
scale IDs are `<id>-x` and `<id>-y`.

| Option | Behavior |
| --- | --- |
| `width` | `{band:.72}` by default, or `{pixels}`; policies are mutually exclusive |
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
