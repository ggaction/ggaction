export const canvas = { width: 420, height: 320, margin: { left: 60, right: 60, top: 60, bottom: 60 }, background: "#ffffff" };
export const observations = [{ id: "a", date: "Monday", low: 1, high: 9, open: 3, close: 7 }, { id: "b", date: "Tuesday", low: 2, high: 8, open: 6, close: 4 }, { id: "c", date: "Wednesday", low: 4, high: 6, open: 5, close: 5 }];
export const variants = [{ id: "prices", chart: "ohlc", title: "Open, high, low and close", options: {} }, { id: "labels", chart: "ohlc-labels", title: "Explicit closing prices", options: { labels: { fontSize: 12 } } }, { id: "no-doji", chart: "ohlc-no-doji", title: "Doji body explicitly hidden", options: { doji: "none" } }];
export function ohlcOptions(id = "prices") {
  const variant = variants.find(item => item.id === id); if (!variant) throw new Error(`Unknown OHLC variant ${id}.`);
  return { variant, canvas, data: { id: "observations", keyField: "id", values: observations },
    plot: { id: "ohlc", x: "date", low: "low", high: "high", open: "open", close: "close", yScale: { domain: [0, 10] }, width: { pixels: 32 }, guides: false, ...variant.options } };
}
