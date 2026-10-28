import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { inspectPredicateExpression } from "../../grammar/expressionAst.js";
import { normalizeFilterTransform } from "../../grammar/filter.js";
import { expressionEnvironment } from "../../materialization/expressionInputs.js";
import { requireStoredResource } from "../../selectors/resources.js";

export function bindFilterTransform(program, source, transform) {
  ownRecord(transform, "Filter transform");
  if (transform.where === undefined) return transform;
  if (Object.keys(transform).some(key => !["type", "where"].includes(key))) {
    throw new TypeError("Filter authoring accepts only type and where.");
  }
  const inspected = inspectPredicateExpression(transform.where);
  const resources = inspected.parameters.map(id => requireStoredResource(program, { kind: "parameter", id }));
  const inputs = resources.map(({ id, revision }) => ({ kind: "parameter", id, revision }));
  const normalized = normalizeFilterTransform(transform, expressionEnvironment(program, source, inputs));
  return cloneAndFreeze({ ...normalized, parameterInputs: inputs });
}
