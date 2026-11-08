---
layout: default
title: Dot, Lollipop, and Dumbbell Plots
---

# Dot, Lollipop, and Dumbbell Plots

{% include chart-example.html id="dumbbell-plot" lead=true %}

These three Full entry actions share one categorical endpoint model. Each starts
from immutable rows and produces ordinary point and rule children, so existing
mark, scale, label, guide, and renderer actions continue to work.

```javascript
import { chart, render } from "ggaction";

const values = [
  { category: "A", value: 4, before: 2, after: 5 },
  { category: "B", value: -1, before: 3, after: -1 },
  { category: "C", value: 2, before: 2, after: 2 }
];
const base = chart()
  .createCanvas({ width: 480, height: 320, margin: 50 })
  .createData({ id: "data", values });

const dots = base.createDotPlot({
  category: "category",
  value: "value"
});
const lollipops = base.createLollipopPlot({
  category: "category",
  value: "value",
  baseline: 0
});
const changes = base.createDumbbellPlot({
  id: "dumbbell",
  category: "category",
  start: "before",
  end: "after",
  guides: false
});

render(changes, document.querySelector("#chart").getContext("2d"));
```

The rendered panel is the canonical guide-free dumbbell example. Use the browser
module setup with `<canvas id="chart"></canvas>`. Add `labels: { endpoint: "both" }`
and reserve guide space when those components are desired.

Raw rows remain raw. When categories repeat, set `summary` to `mean`, `median`,
`sum`, `min`, or `max` to request one derived row per category. Ggaction never
chooses an aggregate from the data shape.

Lollipop stems use the same quantitative scale as their value points. The
baseline defaults to zero and may be any finite number. For a log scale, provide
a positive baseline and positive values.

Dumbbell `start` and `end` name semantic roles rather than the lower and higher
number. A reversed or equal pair keeps the same endpoint appearance and label.
Both endpoint fields share one quantitative scale; conflicting scale definitions
are rejected before the caller program changes.

Use `editEndpointPlot` when a source or semantic role changes:

```javascript
const withReplacement = changes.createData({
  id: "replacement",
  values: values.map(row => ({ ...row, after: row.after + 1 }))
});
const revised = withReplacement.editEndpointPlot({
  data: "replacement",
  start: "after",
  end: "before",
  orientation: "vertical",
  summary: false
});
```

The editor replaces every owned point, rule, label, and summary dataset in one
immutable action while retaining the original appearance and guide policy.
Axes removed after construction stay removed when roles change.
Individual point, rule, label, scale, and guide actions remain the lower-level
style editing path.

## Examples with real data

<!-- showcase-program:life-expectancy-dumbbell:start -->

{% include chart-example.html id="life-expectancy-dumbbell" %}

`createLifeExpectancyDumbbell` builds this chart from real data. It receives the rows of `data/gapminder.json` (Gapminder).
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart } from "ggaction";

// Life expectancy in 1955 and 2005 for the twenty largest Gapminder countries.
export function createLifeExpectancyDumbbell(gapminder) {
  const year = (country, value) => gapminder.find(row => row.country === country && row.year === value);
  const largest = gapminder.filter(row => row.year === 2005)
    .sort((a, b) => b.pop - a.pop).slice(0, 20).map(row => row.country);
  const rows = largest.map(country => ({
    country,
    before: year(country, 1955).life_expect,
    after: year(country, 2005).life_expect
  })).sort((a, b) => (b.after - b.before) - (a.after - a.before));

  return chart()
    .createCanvas({ width: 900, height: 620, margin: { top: 80, right: 40, bottom: 60, left: 130 } })
    .createData({ id: "countries", keyField: "country", values: rows })
    .createDumbbellPlot({
      category: { field: "country", scale: { domain: rows.map(row => row.country) } },
      start: { field: "before", scale: { zero: false, domain: [25, 85] } },
      end: "after",
      orientation: "horizontal",
      startPoint: { fill: "#94a3b8", radius: 5 },
      endPoint: { fill: "#0d9488", radius: 5 },
      connector: { stroke: "#cbd5e1", strokeWidth: 3 },
      guides: {
        axes: { x: { title: { text: "Life expectancy (years)" } }, y: { title: false } },
        grid: { horizontal: false, vertical: true }
      }
    })
    .createTitle({
      text: "Life expectancy gained between 1955 (gray) and 2005 (teal)",
      subtitle: "Twenty most populous Gapminder countries · ordered by years gained"
    });
}
```

<!-- showcase-program:life-expectancy-dumbbell:end -->

<!-- showcase-program:fertility-lollipop:start -->

{% include chart-example.html id="fertility-lollipop" %}

`createFertilityLollipop` builds this chart from real data. It receives the rows of `data/gapminder.json` (Gapminder).
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart } from "ggaction";

// Births per woman in 2005, highest fifteen Gapminder countries.
export function createFertilityLollipop(gapminder) {
  const rows = gapminder.filter(row => row.year === 2005)
    .sort((a, b) => b.fertility - a.fertility).slice(0, 15)
    .map(row => ({ country: row.country, fertility: row.fertility }));

  return chart()
    .createCanvas({ width: 900, height: 520, margin: { top: 80, right: 60, bottom: 60, left: 130 } })
    .createData({ id: "countries", keyField: "country", values: rows })
    .createLollipopPlot({
      category: { field: "country", scale: { domain: rows.map(row => row.country) } },
      value: { field: "fertility", scale: { domain: [0, 8] } },
      baseline: 0,
      orientation: "horizontal",
      point: { fill: "#7c3aed", radius: 6 },
      stem: { stroke: "#c4b5fd", strokeWidth: 2 },
      guides: {
        axes: { x: { title: { text: "Births per woman" } }, y: { title: false } },
        grid: { horizontal: false, vertical: true }
      }
    })
    .createTitle({
      text: "Highest fertility rates in 2005",
      subtitle: "Fifteen of 62 Gapminder countries · replacement level is about 2.1"
    });
}
```

<!-- showcase-program:fertility-lollipop:end -->
