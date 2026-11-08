---
layout: default
title: Trail Plots
---

# Trail plots

Draw a filled ribbon whose width changes at each sample. A width is measured in
logical screen pixels, independently of the position scales. Trail plots are
available in the Full entry and share Canvas, SVG, PNG and PDF output.

{% include chart-example.html id="trail" %}

## Example with real data

<!-- showcase-program:gapminder-life-trails:start -->

{% include chart-example.html id="gapminder-life-trails" %}

`createGapminderLifeTrails` builds this chart from real data. It receives the rows of `data/gapminder.json` (Gapminder via vega-datasets).
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart } from "ggaction";

const LARGEST = ["China", "India", "United States", "Indonesia", "Brazil", "Pakistan", "Bangladesh", "Nigeria"];

// Gapminder life expectancy for the eight most populous countries in 2005.
export function createGapminderLifeTrails(gapminder) {
  const rows = gapminder
    .filter(row => LARGEST.includes(row.country))
    .map(row => ({
      id: `${row.country}/${row.year}`,
      country: row.country,
      year: row.year,
      lifeExpectancy: row.life_expect,
      // Ribbon width in pixels grows with the square root of population.
      width: 1 + 0.6 * Math.sqrt(row.pop / 1e6)
    }));

  return chart()
    .createCanvas({ width: 900, height: 520, margin: { top: 80, right: 160, bottom: 60, left: 70 } })
    .createData({ id: "trajectories", keyField: "id", values: rows })
    .createTrailPlot({
      x: { field: "year", scale: { zero: false, nice: false } },
      y: { field: "lifeExpectancy", scale: { zero: false, domain: [20, 80] } },
      width: "width",
      groupBy: "country",
      color: {
        field: "country",
        scale: {
          domain: LARGEST,
          range: ["#dc2626", "#ea580c", "#2563eb", "#16a34a", "#0d9488", "#7c3aed", "#db2777", "#ca8a04"]
        }
      },
      body: { opacity: 0.75 },
      guides: {
        axes: {
          x: { title: { text: "Year" }, ticksAndLabels: { labels: { format: ".0f" } } },
          y: { title: { text: "Life expectancy (years)" } }
        },
        legend: { title: "Country" },
        grid: { horizontal: true, vertical: false }
      }
    })
    .createTitle({
      text: "Fifty years of longer lives",
      subtitle: "Life expectancy 1955–2005 · ribbon width follows population · China dips during the 1959–61 famine"
    });
}
```

<!-- showcase-program:gapminder-life-trails:end -->

## `createTrailPlot`

**Chart authoring.**

```typescript
createTrailPlot(options: TargetedOptions<CreateTrailPlotOptions>): ChartProgram;
```

Supply `x`, `y` and `width`, or Polar `theta`, `radius` and `width`.
Positions accept a field string or `{field,fieldType?,scale?,temporalUnit?}`.
One Cartesian position is quantitative; the other may be quantitative, temporal or categorical. Polar radius is
quantitative. Fields refer to actual samples; aggregate, bin, datum and conditional
position bindings are not accepted. Use this action's position and color options
instead of generic encoders for a Trail.

Overlapping Cartesian plots must share one Y scale. Create and edit validate the
complete frame and guides before changing any child resource; independent Y scales
belong in separate panels.

`width` is a nonnegative finite number, or a field containing one such number per
sample. Use `createComputedData` first when the width needs an explicit calculation.
The ribbon's border `body.strokeWidth` is a separate appearance option.

| Option | Behavior |
| --- | --- |
| `id`, `data`, `coordinate` | Default ID `trail`; data and coordinate use explicit/current/unique selection |
| `groupBy` | A field or field tuple; otherwise categorical color groups samples, or one series is used |
| `order` | Cartesian field string or `{field,order?:"ascending"\|"descending"}`; default uses native path position order |
| `missing` | `"error"` by default; `"break"` splits at nullish positions or widths and excludes them from automatic position domains |
| `curve`, `tension` | Existing nine Cartesian line interpolations; tension belongs only to cardinal |
| `closed` | `false` by default; closes an uninterrupted series with a hollow ribbon |
| `lineJoin`, `lineCap` | `miter` and `butt` by default; bevel/round joins and square/round caps are available |
| `miterLimit`, `fillRule` | `4` and `nonzero` by default; `evenodd` uses the same compound path |
| `body` | `fill`, `stroke`, `strokeWidth`, `opacity`, `outline`, `shadow` |
| `color` | Field string or `{field,fieldType?,scale?,palette?}`; each series needs one color value |
| `blend` | Ordinary blend mode; default `normal` |
| `clip`, `guides` | Plot clipping defaults to true; ordinary guide options or `false` |

Body defaults are fill `#2563eb`, stroke `none`, border width `0`, opacity `1`.
Structured fills and common effects apply to the filled ribbon. Polar Trail uses
linear projected segments and theta ordering; it does not accept Cartesian order
or non-linear curves. A gap always stays open, even with `closed:true`.

Adjacent identical screen positions use the last width and retain source membership.
Exactly reversed segments split into capped paths. A single sample with a butt cap
has zero area; round or square caps give it the corresponding local shape. Zero
width is allowed. Self intersections use the selected fill rule.

Position and width interpolation share the same samples. A curve that overshoots
below zero width fails instead of silently clamping. Geometry is bounded by 10,000
samples and 30,000 path commands; overflow or an unsatisfied subdivision tolerance
also fails.

## `editTrailPlot`

**Chart authoring.**

```typescript
editTrailPlot(options: TargetedOptions<EditTrailPlotOptions>): ChartProgram;
```

Patch an existing Trail by explicit/current/unique target, including a scoped
composition target. Omitted values stay unchanged. Null, undefined and an empty
patch are errors. Coordinate families cannot be switched in place.

Use `groupBy:false`, `order:false` or `color:false` to remove that choice. Use
`outline:false`, `shadow:false` or `blend:"normal"` to remove effects. Changing
away from cardinal without a new tension removes the old tension. Omitting guides
on edit preserves existing guide presence.

Selections and hits identify source series using typed row membership. Broken runs
stay one logical item. Revisions, scale and Canvas edits rematerialize the ribbon;
filtering preserves missing boundaries. Facets and nested scoped edits retain local
ownership. `createMarkLabels` with an explicit `field` or `value` places labels at
the last valid endpoint, using the ordinary baseline-before-highlight policy.

See [the Trail tutorial](../tutorials/trail.md) for a complete shared program.
