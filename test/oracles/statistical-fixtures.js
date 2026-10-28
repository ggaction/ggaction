// Literal reference cases. No production imports or roadmap dependencies.
// Numerical comparisons use absTol + relTol * max(abs(expected), abs(actual)).
export const statisticalTolerance = Object.freeze({ absolute: 1e-9, relative: 1e-9 });
export const statisticalFixtures = [
  {
    id: "summary-variance", values: [{ v: 1 }, { v: 2 }, { v: 3 }],
    calls: [["createSummaryData", { id: "result", aggregates: [
      { op: "mean", field: "v", as: "mean" }, { op: "variance", field: "v", as: "sample" },
      { op: "varianceP", field: "v", as: "population" }
    ] }]], fields: ["mean", "sample", "population"], expected: [[2, 1, 2 / 3]], contributors: [[0, 1, 2]]
  },
  {
    id: "linear-quantiles", values: [1, 2, 3, 4].map(v => ({ v })),
    calls: [["createSummaryData", { id: "result", aggregates: [0, 0.25, 0.5, 1].map((probability, index) =>
      ({ op: { op: "quantile", probability }, field: "v", as: `q${index}` })) }]],
    fields: ["q0", "q1", "q2", "q3"], expected: [[1, 1.75, 2.5, 4]], contributors: [[0, 1, 2, 3]]
  },
  {
    id: "histogram-final-boundary", values: [0, 1, 2, 3].map(v => ({ v })),
    calls: [["createBinData", { id: "result", field: "v", boundaries: [0, 1, 2, 3], includeEmpty: true,
      as: { lower: "lo", upper: "hi", count: "count" } }]],
    fields: ["lo", "hi", "count"], expected: [[0, 1, 1], [1, 2, 1], [2, 3, 2]], contributors: [[0], [1], [2, 3]]
  },
  {
    id: "bin2d-corners", values: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 2, y: 2 }],
    calls: [["createBin2DData", { id: "result", x: "x", y: "y", bins: { x: 2, y: 2 }, extent: { x: [0, 2], y: [0, 2] },
      includeEmpty: true, as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count" } }]],
    fields: ["x0", "y0", "count"], expected: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], contributors: [[0], [1], [2], [3]]
  },
  {
    id: "diverging-stack", values: [{ c: "A", g: "one", v: 2 }, { c: "A", g: "two", v: 3 }, { c: "A", g: "negative", v: -2 }],
    calls: [["createStackData", { id: "result", category: "c", group: "g", value: "v", mode: "diverging",
      as: { start: "start", end: "end", value: "value", share: "share" } }]],
    fields: ["start", "end"], expected: [[0, 2], [2, 5], [0, -2]], contributors: [[0, 1, 2], [0, 1, 2], [0, 1, 2]]
  },
  {
    id: "trailing-window", values: [{ t: 0, v: 1 }, { t: 1, v: 2 }, { t: 2, v: 3 }],
    calls: [["createWindowData", { id: "result", sortBy: [{ field: "t" }], operations: [
      { op: "movingMean", field: "v", as: "mean", frame: { preceding: 1, following: 0 } }
    ] }]], fields: ["t", "mean"], expected: [[0, 1], [1, 1.5], [2, 2.5]], contributors: [[0], [0, 1], [1, 2]]
  },
  {
    id: "pivot-duplicates", values: [{ g: "A", key: "x", v: 1 }, { g: "A", key: "x", v: 2 }],
    calls: [["createPivotData", { id: "result", groupBy: "g", field: "key", value: "v", op: "sum",
      columns: [{ value: "x", as: "x" }, { value: "y", as: "y" }] }]],
    fields: ["x", "y"], expected: [[3, null]], contributors: [[0, 1]]
  },
  {
    id: "fold-row-order", values: [{ a: 2, b: 3 }, { a: 0, b: 4 }],
    calls: [["createFoldData", { id: "result", fields: ["b", "a"], as: { key: "key", value: "value" } }]],
    fields: ["value", "key"], expected: [[3, "b"], [2, "a"], [4, "b"], [0, "a"]], contributors: [[0], [0], [1], [1]]
  },
  {
    id: "flatten-aligned-arrays", values: [{ a: [1, 2], b: ["x"] }, { a: [], b: [] }, { a: [0], b: ["y"] }],
    calls: [["createFlattenData", { id: "result", fields: ["a", "b"], as: ["value", "label"] }]],
    fields: ["value", "label"], expected: [[1, "x"], [2, null], [0, "y"]], contributors: [[0], [0], [2]]
  },
  {
    id: "lookup-left-multiplicity", values: [{ key: 1 }, { key: 1 }, { key: 2 }],
    secondary: { id: "right", values: [{ key: 1, value: 5 }] },
    calls: [["createLookupData", { id: "result", source: "raw", field: "key", lookup: { data: "right", key: "key", fields: ["value"] } }]],
    fields: ["key", "value"], expected: [[1, 5], [1, 5], [2, null]], contributors: [[0], [1], [2]], secondaryContributors: [[0], [0], []]
  },
  {
    id: "linear-imputation", values: [{ t: 0, v: 2 }, { t: 1, v: null }, { t: 4, v: 10 }],
    calls: [["createImputedData", { id: "result", fields: "v", sortBy: [{ field: "t" }], method: "linear" }]],
    fields: ["t", "v"], expected: [[0, 2], [1, 4], [4, 10]], contributors: [[0], [0, 1, 2], [2]]
  },
  {
    id: "linear-regression-coefficients", values: [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }],
    calls: [["createRegressionData", { id: "fit", x: "x", y: "y", method: "linear", interval: false }],
      ["createRegressionStatisticsData", { id: "result", source: "fit" }]],
    fields: ["count", "slope", "intercept", "rSquared"], expected: [[3, 2, 1, 1]], contributors: [[0, 1, 2]]
  },
  ...[1, 2].map(degree => ({
    id: `loess-degree-${degree}`, values: Array.from({ length: 9 }, (_, x) => ({ x, y: 2 * x + 1 })),
    calls: [["createRegressionData", { id: "result", x: "x", y: "y", method: "loess", degree, span: 1, robustIterations: 2 }]],
    fields: ["x", "y"], expected: [[0, 1], [1, 3], [2, 5], [3, 7], [4, 9], [5, 11], [6, 13], [7, 15], [8, 17]],
    contributors: Array.from({ length: 9 }, () => [0, 1, 2, 3, 4, 5, 6, 7, 8])
  })),
  {
    id: "gaussian-unit-density", values: [{ v: 0 }],
    calls: [["createDensityData", { id: "result", field: "v", kernel: "gaussian", bandwidth: 1, normalization: "unit", extent: [-1, 1], steps: 3, as: ["x", "density"] }]],
    fields: ["x", "density"], expected: [[-1, 0.24197072451914337], [0, 0.3989422804014327], [1, 0.24197072451914337]], contributors: [[0], [0], [0]]
  },
  {
    id: "ecdf-right-continuity", values: [{ v: 1 }, { v: 1 }, { v: 3 }],
    calls: [["createECDFData", { id: "result", field: "v", as: { value: "x", cumulative: "n", probability: "p" } }]],
    fields: ["x", "n", "p"], expected: [[1, 0, 0], [1, 2, 2 / 3], [3, 3, 1]], contributors: [[0, 1, 2], [0, 1, 2], [0, 1, 2]]
  },
  {
    id: "time-unit-fold", values: [{ at: "2024-11-03T05:30:00Z" }, { at: "2024-11-03T06:30:00Z" }],
    calls: [["createTimeUnitData", { id: "result", field: "at", unit: "day", as: "day", timeZone: "America/New_York" }]],
    fields: ["day"], expected: [[1730606400000], [1730606400000]], contributors: [[0], [1]]
  },
  {
    id: "calendar-synthetic-day", values: [{ day: 1730606400000, total: 0 }],
    calls: [["createCompleteData", { id: "result", key: "day", calendar: { unit: "day", start: "2024-11-02", end: "2024-11-04", timeZone: "America/New_York" }, fill: { total: null } }]],
    fields: ["day", "total"], expected: [[1730520000000, null], [1730606400000, 0], [1730696400000, null]], contributors: [[], [0], []]
  }
];

export const statisticalRevisions = {
  "summary-variance": { values: [{ v: 2 }, { v: 4 }, { v: 6 }], expected: [[4, 4, 8 / 3]] },
  "linear-quantiles": { values: [{ v: 2 }, { v: 4 }, { v: 6 }, { v: 8 }], expected: [[2, 3.5, 5, 8]] },
  "histogram-final-boundary": { values: [{ v: 0 }, { v: 0 }, { v: 1 }, { v: 3 }], expected: [[0, 1, 2], [1, 2, 1], [2, 3, 1]], contributors: [[0, 1], [2], [3]] },
  "bin2d-corners": { values: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 2 }], expected: [[0, 0, 2], [1, 0, 0], [0, 1, 0], [1, 1, 1]], contributors: [[0, 1], [], [], [2]] },
  "diverging-stack": { values: [{ c: "A", g: "one", v: 4 }, { c: "A", g: "two", v: 6 }, { c: "A", g: "negative", v: -4 }], expected: [[0, 4], [4, 10], [0, -4]] },
  "trailing-window": { values: [{ t: 0, v: 2 }, { t: 1, v: 4 }, { t: 2, v: 6 }], expected: [[0, 2], [1, 3], [2, 5]] },
  "pivot-duplicates": { values: [{ g: "A", key: "x", v: 2 }, { g: "A", key: "x", v: 4 }], expected: [[6, null]] },
  "fold-row-order": { values: [{ a: 4, b: 6 }, { a: 0, b: 8 }], expected: [[6, "b"], [4, "a"], [8, "b"], [0, "a"]] },
  "flatten-aligned-arrays": { values: [{ a: [2, 4], b: ["x"] }, { a: [], b: [] }, { a: [0], b: ["y"] }], expected: [[2, "x"], [4, null], [0, "y"]] },
  "lookup-left-multiplicity": { values: [{ key: 1 }, { key: 2 }, { key: 1 }], expected: [[1, 5], [2, null], [1, 5]], secondaryContributors: [[0], [], [0]] },
  "linear-imputation": { values: [{ t: 0, v: 4 }, { t: 1, v: null }, { t: 4, v: 20 }], expected: [[0, 4], [1, 8], [4, 20]] },
  "linear-regression-coefficients": { values: [{ x: 0, y: 2 }, { x: 1, y: 6 }, { x: 2, y: 10 }], expected: [[3, 4, 2, 1]] },
  "loess-degree-1": { values: Array.from({ length: 9 }, (_, x) => ({ x, y: 4 * x + 2 })), expected: [[0, 2], [1, 6], [2, 10], [3, 14], [4, 18], [5, 22], [6, 26], [7, 30], [8, 34]] },
  "loess-degree-2": { values: Array.from({ length: 9 }, (_, x) => ({ x, y: 4 * x + 2 })), expected: [[0, 2], [1, 6], [2, 10], [3, 14], [4, 18], [5, 22], [6, 26], [7, 30], [8, 34]] },
  "gaussian-unit-density": { values: [{ v: 1 }], expected: [[-1, 0.05399096651318806], [0, 0.24197072451914337], [1, 0.3989422804014327]] },
  "ecdf-right-continuity": { values: [{ v: 1 }, { v: 3 }, { v: 3 }], expected: [[1, 0, 0], [1, 1, 1 / 3], [3, 3, 1]] },
  "time-unit-fold": { values: [{ at: "2024-11-04T12:00:00Z" }, { at: "2024-11-03T06:30:00Z" }], expected: [[1730696400000], [1730606400000]] },
  "calendar-synthetic-day": { values: [{ day: 1730606400000, total: 7 }], expected: [[1730520000000, null], [1730606400000, 7], [1730696400000, null]] }
};
