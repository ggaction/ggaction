export const canvas = Object.freeze({ width: 360, height: 220, margin: 20, background: "#ffffff" });
export const observations = Object.freeze([
  { id: "a", name: "Alpha", amount: 4, trend: [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 2 }] },
  { id: "b", name: "Beta", amount: 8, trend: [{ x: 0, y: 3 }, { x: 1, y: 1 }, { x: 2, y: 2 }] }
]);
export const columns = Object.freeze([
  { field: "name", label: "Name", width: 100 },
  { field: "amount", label: "Amount", width: 100, align: "right", cell: "bar", footer: "sum" },
  { field: "trend", label: "Trend", width: 120, cell: { type: "sparkline", x: "x", y: "y" } }
]);
export function tableOptions() {
  return { canvas, data: { id: "observations", keyField: "id", values: observations }, plot: { id: "table", columns } };
}
