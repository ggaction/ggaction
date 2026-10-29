import { interactionOptions as options } from "./input.js";
import { resolveInteractionSelection, scopeSelectionKeys } from "./selection.js";
import { normalizeNearestSelection, nearestDataKey, nearestSelectionBudget } from "../grammar/nearestSelection.js";
import { validateUserId } from "../core/identifiers.js";

// Resolve at execution time against the current program and accepted sampled frame.
export function prepareNearestSelection(program, command, bridge) {
  if (command.type !== "select") return command;
  const payload = options(command.payload, ["id"], ["select", "nearest", "mode"], "Selection command payload");
  if (Object.hasOwn(payload, "select") === Object.hasOwn(payload, "nearest")) throw new TypeError("Selection command requires exactly one of select or nearest.");
  if (Object.hasOwn(payload, "select")) return command;
  const query = normalizeNearestSelection(payload.nearest), id = validateUserId(payload.id, "Selection id");
  const { target, resolved } = resolveInteractionSelection(program, command.target, id);
  const spend = nearestSelectionBudget();
  let keys;
  if (query.space === "data") {
    const result = nearestDataKey(resolved.items, query, spend);
    keys = scopeSelectionKeys(program, target, result === null ? [] : [result.key], spend);
  } else {
    if (target.facetSource) throw new Error("Screen nearest cannot infer geometry for a facet source; use data space.");
    const itemKeys = scopeSelectionKeys(program, target, resolved.items.map(item => item.key), spend);
    const result = bridge.nearest(query.point, { ownerId: target.id, childPath: target.childPath, itemKeys,
      maxDistance: query.maxDistance, hitInvisible: query.hitInvisible });
    keys = result.target === null ? [] : [result.target.itemKey];
  }
  return { ...command, payload: { id, select: { items: keys, empty: "none", grain: resolved.definition.grain },
    ...(payload.mode === undefined ? {} : { mode: payload.mode }) } };
}
