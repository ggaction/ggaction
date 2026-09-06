const TRANSFORM_TOPOLOGY = Object.freeze({
  bin2d: Object.freeze({ facetTopology: "statistical" }),
  boxOutlier: Object.freeze({ facetTopology: "statistical" }),
  boxSummary: Object.freeze({ facetTopology: "statistical" }),
  density: Object.freeze({ facetTopology: "statistical" }),
  filter: Object.freeze({ facetTopology: "rowPreserving" }),
  gradientProfile: Object.freeze({ facetTopology: "statistical" }),
  horizon: Object.freeze({ facetTopology: "statistical" }),
  interval: Object.freeze({ facetTopology: "statistical" }),
  markFilter: Object.freeze({ provenanceTransparent: true }),
  regression: Object.freeze({ facetTopology: "statistical" }),
  summary: Object.freeze({ facetTopology: "statistical" }),
  timeUnit: Object.freeze({ facetTopology: "rowPreserving" }),
  window: Object.freeze({ facetTopology: "statistical" })
});

export function findTransformTopology(type) {
  return TRANSFORM_TOPOLOGY[type];
}
