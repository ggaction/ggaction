import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { inspectExpressionV2 } from "../../grammar/expressionAst.js";
import { isExpressionV2, normalizeComputedTransform } from "../../grammar/computed.js";
import { parameterEnvironment } from "../../grammar/parameter.js";
import { expressionFieldEnvironment } from "../../materialization/expressionInputs.js";
import { requireStoredResource } from "../../selectors/resources.js";

export function bindComputedTransform(program, source, transform) {
  ownRecord(transform, "Computed transform");
  if (!isExpressionV2(transform.expression)) return transform;
  if (Object.hasOwn(transform, "parameterInputs")) {
    throw new TypeError("Computed authoring does not accept parameterInputs.");
  }
  if (Object.keys(transform).some(key => !["type", "as", "expression"].includes(key))) {
    throw new TypeError("Computed transform has unknown properties.");
  }
  const inspected = inspectExpressionV2(transform.expression);
  const resources = inspected.parameters.map(id => requireStoredResource(program, { kind: "parameter", id }));
  const normalized = normalizeComputedTransform(transform, {
    fields: expressionFieldEnvironment(source), parameters: parameterEnvironment(resources)
  });
  return cloneAndFreeze({
    ...normalized,
    parameterInputs: resources.map(({ id, revision }) => ({ kind: "parameter", id, revision }))
  });
}
