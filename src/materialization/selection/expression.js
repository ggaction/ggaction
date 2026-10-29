import { inspectPredicateExpression } from "../../grammar/expressionAst.js";
import { parameterEnvironment } from "../../grammar/parameter.js";
import { selectExpressionItemKeys } from "../../grammar/selectionExpression.js";
import { requireStoredResource } from "../../selectors/resources.js";

const resolvers = new WeakMap();

// Full assembly installs its existing final-item resolver once. Basic imports
// parameter lifecycle without importing Full mark policies or adding actions.
export function registerSelectionExpressionResolver(ProgramClass, resolveSelection) {
  if (typeof ProgramClass !== "function" || ProgramClass.prototype === undefined || typeof resolveSelection !== "function") {
    throw new TypeError("Selection expression validation requires a constructor and resolver.");
  }
  if (resolvers.has(ProgramClass)) throw new Error("Selection expression resolver is already registered.");
  resolvers.set(ProgramClass, Object.freeze({ resolveSelection }));
}

export function validateSelectionExpressionConsumers(program, resourceIds) {
  const changed = new Set(resourceIds);
  for (const [id, definition] of Object.entries(program.materializationConfigs.selections ?? {})) {
    if (!changed.has(definition.resource.id)) continue;
    const resolver = resolvers.get(program.constructor);
    if (resolver === undefined) throw new Error("Expression selections require the Full selection owner.");
    resolver.resolveSelection(program, id);
  }
}

export function selectionExpressionInputs(program, selector) {
  if (!Object.hasOwn(selector, "where")) return [];
  return inspectPredicateExpression(selector.where).parameters.map(id => {
    const resource = requireStoredResource(program, { kind: "parameter", id });
    return { kind: resource.kind, id: resource.id, revision: resource.revision };
  });
}

export function selectProgramItemKeys(program, items, selector) {
  const resources = selectionExpressionInputs(program, selector).map(ref => requireStoredResource(program, ref));
  return selectExpressionItemKeys(items, selector, parameterEnvironment(resources));
}
