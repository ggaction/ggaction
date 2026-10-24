import { isPlainObject } from "../core/immutable.js";
import { normalizeActionTargets } from "../grammar/actionTargets.js";
import { resolveEligibleLayer } from "../selectors/layers.js";
import { ownership } from "../selectors/markOwners.js";

// Creation and inspection share the same explicit source ownership contract.
export function resolveAdjacentSource(program, source) {
  const grouped = program.compositionSpec && program.compositionSpec.type !== "facet";
  const scoped = isPlainObject(source);
  if (grouped && !scoped) throw new Error("Adding beside a concat requires source: { childPath, id }.");
  let view = program, id = source;
  if (scoped) {
    const selector = normalizeActionTargets(source)[0];
    if (selector.id === undefined) throw new Error("Adjacent source requires an explicit mark id.");
    id = selector.id;
    for (const child of selector.childPath) {
      if (view.compositionSpec?.type === "facet") throw new Error("Select the facet source view, not a generated facet cell.");
      if (!Object.hasOwn(view.children, child)) throw new Error(`Unknown adjacent source child "${child}".`);
      view = view.children[child];
    }
  }
  if (view.compositionSpec && view.compositionSpec.type !== "facet") throw new Error("Adjacent source must identify a unit or facet view.");
  const owners = ownership(view);
  const layer = resolveEligibleLayer(view, { target: id, targetOption: "source", label: "adjacent chart source",
    predicate: layer => !owners.has(layer.id) && !layer.derivedBindings?.overlay && layer.data !== undefined });
  return { view, layer };
}
