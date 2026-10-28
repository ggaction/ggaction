// Independent literal cases: duplicate cells aggregate only with an explicit op.
export const pivotRows = [
  { group: "B", key: "x", value: 1 },
  { group: "A", key: "y", value: 4 },
  { group: "B", key: "x", value: 2 },
  { group: "B", key: "y", value: null },
  { group: "A", key: "y", value: 8 }
];

export const pivotExpectations = {
  sum: [{ group: "B", x: 3, y: 0 }, { group: "A", x: null, y: 12 }],
  mean: [{ group: "B", x: 1.5, y: null }, { group: "A", x: null, y: 6 }],
  min: [{ group: "B", x: 1, y: null }, { group: "A", x: null, y: 4 }],
  max: [{ group: "B", x: 2, y: null }, { group: "A", x: null, y: 8 }],
  count: [{ group: "B", x: 2, y: 1 }, { group: "A", x: null, y: 2 }]
};
