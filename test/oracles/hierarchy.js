// Independent literal topology and aggregate expectations. No production imports.
export const hierarchyRows = [
  { key: "root", parentKey: null, value: 10 },
  { key: "A", parentKey: "root", value: 6 },
  { key: "B", parentKey: "root", value: 4 },
  { key: "A1", parentKey: "A", value: 2 },
  { key: "A2", parentKey: "A", value: 4 }
];

export const hierarchyExpected = {
  order: ["root", "A", "A1", "A2", "B"],
  depth: [0, 1, 2, 2, 1],
  sourceRows: [[0], [1], [3], [4], [2]],
  "leaf-sum": { total: [10, 6, 2, 4, 4], own: [0, 0, 2, 4, 4] },
  inclusive: { total: [10, 6, 2, 4, 4], own: [0, 0, 2, 4, 4] },
  "own-plus-children": { total: [26, 12, 2, 4, 4], own: [10, 6, 2, 4, 4] }
};
