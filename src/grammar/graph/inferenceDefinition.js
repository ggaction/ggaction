import { normalizeGraphSourceOptions, INFERRED_GRAPH_FIELDS } from "./input.js";
import { validateUserId } from "../../core/identifiers.js";
import { ownRecord } from "../../core/ownData.js";
import { graphFeatureFields, graphFields, graphKeyField } from "./fields.js";
import { normalizeGraphNeighborOptions } from "./neighbors.js";
import { normalizeGraphStructuralOptions } from "./structural.js";
import { normalizeGraphSpanningOptions } from "./spanning.js";
import { prepareGraphMetricVectors } from "./preprocess.js";
import { normalizeGraphSearch } from "./search.js";
import { normalizeSortTransform } from "../sort.js";

const select = (object, names) => Object.fromEntries(names.filter(key => Object.hasOwn(object, key)).map(key => [key, object[key]]));

export function inferenceDefinitionPolicy(definition, candidate) {
  const normalized = normalizeGraphSourceOptions(definition, INFERRED_GRAPH_FIELDS);
  validateUserId(normalized.ruleId, "Graph ruleId");
  if (!["knn", "radius", "similarity", "mst", "group", "sequence"].includes(normalized.rule)) throw new TypeError("Unsupported graph inference rule.");
  ownRecord(normalized.options, "Graph inference options");
  if (Object.values(normalized.options).some(value => value === undefined)) throw new TypeError("Graph inference options cannot contain undefined.");
  for (const field of ["ruleId", "rule", "metric", "features", "preprocess"]) if (Object.hasOwn(normalized.options, field)) throw new TypeError("Graph inference source fields must belong to the definition.");
  const structural = ["group", "sequence"].includes(normalized.rule), metric = !candidate && !structural;
  if (candidate && normalized.rule !== "mst") throw new TypeError("Graph candidates require MST inference.");
  for (const field of ["features", "metric", "preprocess"]) if (!metric && Object.hasOwn(normalized, field)) throw new TypeError("This graph rule does not use metric features.");
  let options, preparation;
  if (metric) {
    normalized.features = graphFeatureFields(normalized.features, normalized.metric);
    preparation = prepareGraphMetricVectors([], { ...select(normalized, ["metric", "preprocess"]), ...select(normalized.options, ["missing", "zeroVector"]) });
  }
  if (structural) {
    const sequence = normalized.rule === "sequence";
    const fields = sequence ? ["groupBy", "orderField"] : ["fields"];
    if (sequence) {
      graphFields(normalized.options.groupBy ?? [], "Graph sequence groups", { empty: true });
      if (Array.isArray(graphKeyField(normalized.options.orderField, "Graph sequence orderField"))) throw new TypeError("Graph sequence orderField requires one field.");
      normalizeSortTransform({ sortBy: [{ field: "value", ...select(normalized.options, ["temporalUnit"]) }] });
    } else graphFields(normalized.options.fields, "Graph group fields");
    options = normalizeGraphStructuralOptions({ ...Object.fromEntries(Object.entries(normalized.options).filter(([key]) => !fields.includes(key))), ruleId: normalized.ruleId }, sequence);
  } else if (normalized.rule === "mst") {
    const policy = normalizeGraphSpanningOptions({ ...normalized.options, ruleId: normalized.ruleId,
      ...(metric ? select(normalized, ["metric", "preprocess"]) : {}) }, metric);
    options = { ruleId: policy.ruleId, forest: policy.forest };
  } else {
    options = normalizeGraphNeighborOptions({ ...normalized.options, ruleId: normalized.ruleId, rule: normalized.rule, ...select(normalized, ["metric", "preprocess"]) });
    normalizeGraphSearch(normalized.options.search, options, preparation);
  }
  if (metric) options = { ...options, ...select(preparation, ["metric", "zeroVector", "preprocess", "missing"]) };
  return { normalized, options, metric, structural };
}

