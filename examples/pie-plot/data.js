export const layout = Object.freeze({ width: 1000, height: 700, margin: 150 });
export const rows = Object.freeze([
  Object.freeze({ category: "A", value: 2 }),
  Object.freeze({ category: "A", value: 3 }),
  Object.freeze({ category: "B", value: 5 })
]);
export const targets = Object.freeze({
  count: Object.freeze({ id: "pie", category: "category" }),
  weighted: Object.freeze({ id: "pie", category: "category", value: "value", aggregate: "sum" }),
  donut: Object.freeze({ id: "pie", category: "category", value: "value", aggregate: "sum",
    arc: Object.freeze({ innerRadius: 0.55, padAngle: 2 }) })
});

