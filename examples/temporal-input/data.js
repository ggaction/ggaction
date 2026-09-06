export const layout = Object.freeze({ width: 760, height: 420,
  margin: { top: 88, right: 100, bottom: 85, left: 100 }, yDomain: [0, 3], color: "#2563eb" });
export const rows = Object.freeze([Object.freeze({ time: 1000, value: 1 }), Object.freeze({ time: 2000, value: 2 })]);
export const cases = Object.freeze([
  { id: "timestamp", unit: "timestamp", title: "1000 and 2000 as Unix milliseconds", subtitle: "1970-01-01 UTC · one second apart" },
  { id: "year", unit: "year", title: "1000 and 2000 as calendar years", subtitle: "UTC January 1 · one thousand years apart" },
  { id: "auto", unit: "auto", title: "Automatic input keeps the existing year interpretation", subtitle: "Explicit auto preserves the current numeric year default" }
]);
