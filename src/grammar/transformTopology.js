const TRANSFORM_TOPOLOGY = Object.freeze({
  bin: Object.freeze({ facetTopology: "statistical" }),
  bin2d: Object.freeze({ facetTopology: "statistical" }),
  computed: Object.freeze({ facetTopology: "rowPreserving" }),
  complete: Object.freeze({ facetTopology: "statistical" }),
  boxOutlier: Object.freeze({ facetTopology: "statistical" }),
  boxSummary: Object.freeze({ facetTopology: "statistical" }),
  density: Object.freeze({ facetTopology: "statistical" }),
  ecdf: Object.freeze({ facetTopology: "statistical" }),
  filter: Object.freeze({ facetTopology: "rowPreserving" }),
  fold: Object.freeze({ facetTopology: "statistical" }),
  gradientProfile: Object.freeze({ facetTopology: "statistical" }),
  horizon: Object.freeze({ facetTopology: "statistical" }),
  interval: Object.freeze({ facetTopology: "statistical" }),
  impute: Object.freeze({ facetTopology: "statistical" }),
  markFilter: Object.freeze({ provenanceTransparent: true }),
  normalize: Object.freeze({ facetTopology: "statistical" }),
  regression: Object.freeze({ facetTopology: "statistical" }),
  summary: Object.freeze({ facetTopology: "statistical" }),
  stack: Object.freeze({ facetTopology: "statistical" }),
  timeUnit: Object.freeze({ facetTopology: "rowPreserving" }),
  window: Object.freeze({ facetTopology: "statistical" })
});

export function findTransformTopology(type) {
  return TRANSFORM_TOPOLOGY[type];
}
