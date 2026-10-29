export const canvas = Object.freeze({ width: 500, height: 320, margin: 40, background: "#ffffff" });
export const observations = Object.freeze([
  { id: "a", stage: "Revenue", role: "delta", value: 5 },
  { id: "b", stage: "Cost", role: "delta", value: -2 },
  { id: "c", stage: "Subtotal", role: "subtotal" },
  { id: "d", stage: "Other", role: "delta", value: 4 },
  { id: "e", stage: "Total", role: "total" }
]);
export const variants = [{ id: "contributions", chart: "waterfall", title: "Ordered contributions and totals", options: {} }, { id: "labels", chart: "waterfall-labels", title: "Explicit stage values", options: { labels: {} } }, { id: "no-connectors", chart: "waterfall-no-connectors", title: "Stage bars without connectors", options: { connectors: false } }];
export function waterfallOptions(id = "contributions") {
  const variant = variants.find(item => item.id === id); if (!variant) throw new Error(`Unknown Waterfall variant ${id}.`);
  return { variant, canvas, data: { id: "contributions", keyField: "id", values: observations },
    plot: { id: "waterfall", x: "stage", role: "role", value: "value", yScale: { domain: [0, 10] }, width: { pixels: 48 }, guides: false, ...variant.options } };
}
