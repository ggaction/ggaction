import { chart, type InferredGraphResource, type CreateInferredGraphDataOptions } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
const request: CreateInferredGraphDataOptions = { id: "g", nodeKey: "id", ruleId: "nearest", rule: "knn", features: ["x"], metric: "euclidean", options: { k: 2, search: { mode: "approximate", seed: 42 } } };
const p = chart().createInferredGraphData(request).editInferredGraphData({ target: { childPath: ["left"], id: "g" }, definition: { options: { k: 3 } } });
p.createInferredGraphData({ id: "mst", nodeKey: "id", ruleId: "backbone", rule: "mst", candidateGraph: "g", options: { forest: true } });
p.createInferredGraphData({ id: "groups", nodeKey: ["family", "id"], ruleId: "groups", rule: "group", options: { fields: ["group"], mode: "star", hubKey: ["a", 1] } });
p.createInferredGraphData({ id: "sequence", nodeKey: "id", ruleId: "ordered", rule: "sequence", options: { orderField: "year", temporalUnit: "year", lag: 2 } });
p.editInferredGraphData({ candidateGraph: null, definition: { rule: "mst", features: ["x"], metric: "manhattan" } });
p.filterMarks({ recompute: true, target: "graphPlot", field: "key", op: "oneOf", values: ["a", "b"] })
  .filterMarks({ target: { childPath: ["left"], id: "graphPlot" }, mode: "replace", rows: { data: "nodes", indices: [0] } })
  .removeMarkFilter({ target: "graphPlot" });
const r = p.semanticSpec.resources.find((value): value is InferredGraphResource => value.kind === "graph" && value.provenance.origin === "inferred");
if (r) {
  const origin: "inferred" = r.result.model.edges[0].origin;
  const rule: string = r.result.model.edges[0].ruleId;
  const first: "data" = r.inputs[0].kind;
  const k: number | undefined = r.result.diagnostics.effectiveK;
  // @ts-expect-error stored results are immutable
  r.result.diagnostics.effectiveK = 1;
}
// @ts-expect-error Basic does not expose graph inference
basicChart().createInferredGraphData(request);
// @ts-expect-error approximate search requires an explicit seed
chart().createInferredGraphData({ ...request, options: { search: { mode: "approximate" } } });
// @ts-expect-error numeric neighbor inference requires feature fields
chart().createInferredGraphData({ id: "g", nodeKey: "id", ruleId: "r", rule: "knn", metric: "euclidean" });
// @ts-expect-error structural rules do not use metric features
chart().createInferredGraphData({ id: "g", nodeKey: "id", ruleId: "r", rule: "group", metric: "euclidean", options: { fields: ["group"] } });
// @ts-expect-error metric-free MST requires a named candidate graph
chart().createInferredGraphData({ id: "g", nodeKey: "id", ruleId: "r", rule: "mst" });
// @ts-expect-error source removal is explicit null, never undefined
p.editInferredGraphData({ candidateGraph: undefined });
// @ts-expect-error similarity requires cosine or Jaccard
chart().createInferredGraphData({ id: "g", nodeKey: "id", ruleId: "r", rule: "similarity", metric: "euclidean", features: ["x"], options: { threshold: 1 } });
// @ts-expect-error numeric metrics require a feature column array
chart().createInferredGraphData({ ...request, features: { set: "tags" } });
// @ts-expect-error geographic coordinates cannot use numeric preprocessing
chart().createInferredGraphData({ id: "g", nodeKey: "id", ruleId: "r", rule: "radius", metric: "great-circle", features: { longitude: "lon", latitude: "lat" }, preprocess: "minmax", options: { radius: 100 } });


// @ts-expect-error Recompute is a boolean, not a truthy value.
p.filterMarks({ field: "key", op: "eq", value: "a", recompute: "true" });
