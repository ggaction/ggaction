export const canvas = Object.freeze({ width: 420, height: 240, margin: 40, background: "#ffffff" });
export const observations = Object.freeze([
  { id: "a0", time: 0, signal: 7, width: 8, channel: "A" },
  { id: "a1", time: 10, signal: 7, width: 32, channel: "A" },
  { id: "b0", time: 0, signal: 3, width: 28, channel: "B" },
  { id: "b1", time: 10, signal: 3, width: 12, channel: "B" }
]);
export const variants = [
  { id: "sample-width", chart: "trail", title: "Changing width along each series", plot: {} },
  { id: "constant-width", chart: "trail-constant-width", title: "An explicit constant ribbon width", plot: { width: 18 } }
];
export function trailOptions(id = "sample-width") {
  const variant = variants.find(value => value.id === id); if (!variant) throw new Error(`Unknown Trail variant ${id}.`);
  return { variant, canvas, data: { id: "signals", keyField: "id", values: observations },
    plot: { id: "trail", x: { field: "time", scale: { domain: [0, 10] } }, y: { field: "signal", scale: { domain: [0, 10] } },
      width: "width", groupBy: "channel", color: { field: "channel", scale: { domain: ["A", "B"], range: ["#2563eb", "#0d9488"] } }, guides: false, ...variant.plot } };
}
