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

export const hierarchyOrderFixtures = [
  { options: { by: "input" }, expectedSourceRows: [0, 1, 3, 4, 2] },
  { options: { by: "value", direction: "ascending" }, expectedSourceRows: [0, 2, 1, 3, 4] },
  { options: { by: "key", direction: "descending" }, values: ["root", "A", "A1", "A2", "B"], expectedSourceRows: [0, 2, 1, 4, 3] },
  { options: { by: "field", direction: "ascending" }, values: [0, 3, 4, 1, 2], expectedSourceRows: [0, 2, 1, 4, 3] }
];

export const hierarchyInputFixtures = [
  { id: "flat", input: hierarchyRows.map(({ key, parentKey, value }) => ({ id: key, parent: parentKey, v: value })),
    options: { format: "flat", key: "id", parent: "parent", value: "v" },
    expected: { depth: [0, 1, 2, 2, 1], sourceRows: [[0], [1], [3], [4], [2]], total: [10, 6, 2, 4, 4], own: [0, 0, 2, 4, 4] } },
  { id: "nested", input: [{ id: "root", children: [{ id: "A", children: [{ id: "A1", v: 2 }, { id: "A2", v: 4 }] }, { id: "B", v: 4 }] }],
    options: { format: "nested", key: "id", children: "children", value: "v" },
    expected: { depth: [0, 1, 2, 2, 1], sourceRows: [[0], [0], [0], [0], [0]], total: [10, 6, 2, 4, 4], own: [0, 0, 2, 4, 4] } },
  { id: "groups", input: [{ continent: "E", country: "A", v: 2 }, { continent: "E", country: "A", v: 4 },
    { continent: "E", country: "B", v: 0 }, { continent: "N", country: "C", v: 3 }],
    options: { format: "groups", groupFields: ["continent", "country"], value: "v" },
    expected: { depth: [0, 1, 2, 2, 1, 2], sourceRows: [[], [0, 1, 2], [0, 1], [2], [3], [3]], total: [9, 6, 6, 0, 3, 3], own: [0, 0, 6, 0, 0, 3] } }
];
