export const layout = Object.freeze({ width: 1000, height: 700, margin: 150 });
export const rows = Object.freeze([
  Object.freeze({ value: 1, group: "A" }), Object.freeze({ value: 2, group: "A" }),
  Object.freeze({ value: 3, group: "B" }), Object.freeze({ value: 5, group: "B" })
]);
export const statistics = Object.freeze({ bandwidth: 1, extent: Object.freeze([0, 6]), steps: 61 });
export const targets = Object.freeze({
  vertical: Object.freeze({ id: "density", field: "value", ...statistics }),
  grouped: Object.freeze({ id: "density", field: "value", groupBy: "group", color: "group", ...statistics }),
  horizontal: Object.freeze({ id: "density", field: "value", groupBy: "group", color: "group", densityChannel: "x", ...statistics })
});

