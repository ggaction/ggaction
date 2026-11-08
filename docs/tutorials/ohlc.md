---
layout: default
title: Show open, high, low and close
---

# Show open, high, low and close

Keep each observation's four prices together. A high-low stem and an open-close
body are one chart item, so selecting either part selects the same source row.

## Example with real data

<!-- showcase-program:ibm-candlesticks:start -->

{% include chart-example.html id="ibm-candlesticks" %}

`createIbmCandlesticks` builds this chart from real data. It receives the parsed JSON response in `data/showcase/ibm-daily.json` (Alpha Vantage demo endpoint).
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart, vconcat } from "ggaction";

// Alpha Vantage demo response: IBM daily open, high, low, close and volume.
export function createIbmCandlesticks(response) {
  const sessions = Object.entries(response["Time Series (Daily)"])
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-60)
    .map(([date, day]) => ({
      date,
      open: Number(day["1. open"]),
      high: Number(day["2. high"]),
      low: Number(day["3. low"]),
      close: Number(day["4. close"]),
      volume: Number(day["5. volume"]) / 1e6
    }));
  const ticks = sessions.filter((_, index) => index % 10 === 0).map(day => day.date);
  const x = { field: "date", fieldType: "ordinal" };
  const xAxis = { ticksAndLabels: { values: ticks }, title: false };

  const prices = chart()
    .createCanvas({ width: 960, height: 400, margin: { top: 80, right: 40, bottom: 40, left: 70 } })
    .createData({ id: "sessions", keyField: "date", values: sessions })
    .createOHLCPlot({
      x,
      low: "low",
      high: "high",
      open: "open",
      close: "close",
      yScale: { zero: false, nice: true },
      width: { band: 0.6 },
      body: { upFill: "#0d9488", downFill: "#e11d48", strokeWidth: 0 },
      stem: { stroke: "#475569", strokeWidth: 1 },
      guides: {
        axes: { x: xAxis, y: { title: { text: "Price (USD)" } } },
        legend: false,
        grid: { horizontal: true, vertical: false }
      }
    })
    .createTitle({
      text: "IBM daily prices, last 60 trading sessions",
      subtitle: "Teal: closed above the open · red: closed below the open"
    });

  const volume = chart()
    .createCanvas({ width: 960, height: 160, margin: { top: 10, right: 40, bottom: 50, left: 70 } })
    .createData({ id: "sessions", keyField: "date", values: sessions })
    .createBarPlot({
      x,
      y: { field: "volume", aggregate: "sum" },
      bar: { fill: "#94a3b8" },
      guides: {
        axes: { x: { ...xAxis, title: { text: "Trading session" } }, y: { title: { text: "Volume (M)" } } },
        legend: false
      }
    });

  return vconcat({ programs: [{ id: "prices", program: prices }, { id: "volume", program: volume }], gap: 0 });
}
```

<!-- showcase-program:ibm-candlesticks:end -->

## A small worked example

{% include chart-example.html id="ohlc" %}

<!-- snippet-context:start -->

> **Runnable complete example.** Import the Full ggaction package; this example declares four prices per source observation.

<!-- snippet-context:end -->

```js
import { chart } from "ggaction";

const prices = chart()
  .createCanvas({ width: 420, height: 320, margin: { left: 60, right: 60, top: 60, bottom: 60 }, background: "#ffffff" })
  .createData({ id: "observations", keyField: "id", values: [
    { id: "a", date: "Monday", low: 1, high: 9, open: 3, close: 7 },
    { id: "b", date: "Tuesday", low: 2, high: 8, open: 6, close: 4 },
    { id: "c", date: "Wednesday", low: 4, high: 6, open: 5, close: 5 }
  ] })
  .createOHLCPlot({ id: "ohlc", x: "date", low: "low", high: "high",
    open: "open", close: "close", width: { pixels: 32 },
    yScale: { domain: [0, 10] }, guides: false });

const labeled = prices.editOHLCPlot({ target: "ohlc",
  labels: { content: "close", format: ".1f" } });
const selected = labeled.selectMarks({ id: "chosen", target: "ohlc",
  field: "id", op: "eq", value: "b" })
  .highlightMarks({ selection: "chosen", stroke: "#1d4ed8", strokeWidth: 2 });
```

Green bodies close above their opening price; red bodies close below it. The
third observation has equal open and close, so it uses a horizontal doji line.
Its numerical value and range stay unchanged.

With real date columns, pass `{field:"date",fieldType:"temporal"}` as X.
Use keyed source revisions to update prices; the source rows, scales, bodies,
labels and selections are rematerialized together. See [OHLC options](../api/ohlc.md)
for invalid rows, color scales, effects, temporal widths and scoped edits.

The facade records the price meaning, then calls the wrapped
`materializeOHLCPlot` and ordinary graphic primitives. Renderers consume those
concrete graphics without deriving prices or fetching data.
