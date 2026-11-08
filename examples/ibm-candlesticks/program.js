import { chart, vconcat } from "../../src/index.js";

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
