---
layout: default
title: Combine Values and Small Charts in a Table
---

# Combine values and small charts in a table

Keep a source row's name, value and ordered observations together. The amount uses
both an exact number and a bar. Each trend uses the same x and y scales, and the
footer sums both source amounts.

## Example with real data

<!-- showcase-program:gapminder-country-table:start -->

{% include chart-example.html id="gapminder-country-table" %}

`createGapminderCountryTable` builds this chart from real data. It receives the rows of `data/gapminder.json` (Gapminder).
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart } from "ggaction";

// One row per Gapminder country: 2005 values plus its 1955–2005 history.
export function createGapminderCountryTable(gapminder) {
  const histories = new Map();
  for (const row of gapminder) {
    if (!histories.has(row.country)) histories.set(row.country, []);
    histories.get(row.country).push({ year: row.year, lifeExpectancy: row.life_expect });
  }
  const countries = [...histories].map(([country, history]) => {
    history.sort((a, b) => a.year - b.year);
    const latest = gapminder.find(row => row.country === country && row.year === 2005);
    return {
      country,
      lifeExpectancy: latest.life_expect,
      fertility: latest.fertility,
      populationMillions: latest.pop / 1e6,
      history
    };
  });

  return chart()
    .createCanvas({ width: 960, height: 700, margin: { top: 80, right: 30, bottom: 30, left: 30 } })
    .createData({ id: "countries", keyField: "country", values: countries })
    .createTablePlot({
      rowLimit: 12,
      rowHeight: 36,
      padding: 7,
      sortBy: [{ field: "populationMillions", order: "descending" }],
      columns: [
        { field: "country", label: "Country", width: 170, footer: "count" },
        { field: "populationMillions", label: "Population (M)", width: 190, cell: "bar", format: ".0f",
          align: "right", footer: { op: "sum", format: ".0f" } },
        { field: "lifeExpectancy", label: "Life expectancy", width: 170,
          cell: { type: "bar", domain: [0, 90] }, format: ".1f", align: "right" },
        { field: "fertility", label: "Births per woman", width: 140, format: ".2f", align: "right" },
        { field: "history", label: "Life expectancy, 1955–2005", width: 230,
          cell: { type: "sparkline", x: "year", y: "lifeExpectancy", xDomain: [1955, 2005], yDomain: [30, 85],
            resolveY: "shared" } }
      ],
      labels: { fontSize: 12 },
      cells: { stroke: "#e2e8f0", strokeWidth: 0.6 },
      bars: { fill: "#bfdbfe" },
      sparklines: { stroke: "#0d9488", strokeWidth: 2 },
      headerStyle: { fill: "#f1f5f9", color: "#0f172a" },
      footerStyle: { fill: "#eff6ff", color: "#0f172a" }
    })
    .createTitle({
      text: "The twelve most populous countries in 2005",
      subtitle: "Bars and sparklines share one scale per column · footer totals all 62 countries"
    });
}
```

<!-- showcase-program:gapminder-country-table:end -->

## A small worked example

{% include chart-example.html id="table" %}

<!-- snippet-context:start -->

> **Runnable complete example.** Import the Full ggaction package; the example declares source rows, typed columns and whole-source footer aggregation.

<!-- snippet-context:end -->

```js
import { chart } from "ggaction";

const table = chart()
  .createCanvas({ width: 360, height: 220, margin: 20, background: "#ffffff" })
  .createData({ id: "observations", keyField: "id", values: [
    { id: "a", name: "Alpha", amount: 4, trend: [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 2 }] },
    { id: "b", name: "Beta", amount: 8, trend: [{ x: 0, y: 3 }, { x: 1, y: 1 }, { x: 2, y: 2 }] }
  ] })
  .createTablePlot({ id: "table", columns: [
    { field: "name", label: "Name", width: 100 },
    { field: "amount", label: "Amount", width: 100, align: "right", cell: "bar", footer: "sum" },
    { field: "trend", label: "Trend", width: 120, cell: { type: "sparkline", x: "x", y: "y" } }
  ] });

const sorted = table.editTablePlot({ sortBy: [{ field: "amount", order: "descending" }] });
const limited = sorted.editTablePlot({ rowLimit: 1 });
```

The limited table reports one of two rows shown and keeps the footer at 12. Its
source rows and cell identities are unchanged. [Table options](../api/table.md)
cover formatting, wrapping, missing values, independent sparkline y domains,
selection, clipping and exact font preparation.
