import { renderTransitionGraphics } from "./renderers/svgSerialization.js";
import { resolveMarkItems, findSelectionPolicy } from "./materialization/selection/policies/index.js";
import { namespaceGraphicId } from "./selectors/graphicCapacity.js";
import { findDataset } from "./selectors/datasets.js";
import { cloneAndFreeze } from "./core/immutable.js";

const scenes = new WeakMap();
function canonical(value) {
  if (value instanceof Date) return `date:${value.toISOString()}`;
  if (typeof value === "number" && !Number.isFinite(value)) return `number:${value}`;
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
// Opaque deterministic keys; public consumers never depend on private graphic paths.
function token(value) {
  const string = canonical(value); let a = 2166136261, b = 5381;
  for (let i = 0; i < string.length; i++) {
    a = Math.imul(a ^ string.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ string.charCodeAt(i);
  }
  return `${(a >>> 0).toString(36)}-${(b >>> 0).toString(36)}`;
}
function identities(program, project = id => id, scope = "", result = new Map()) {
  for (const layer of program.semanticSpec.layers) {
    const dataset = findDataset(program, layer.data);
    if (!dataset || !findSelectionPolicy(layer.mark?.type)) continue;
    let root = dataset; const visited = new Set();
    while (root.source && !visited.has(root.id)) {
      visited.add(root.id); const parent = findDataset(program, root.source);
      if (!parent) break; root = parent;
    }
    // Value+occurrence preserves duplicates, filters and sorting without relying on
    // derived array indexes. Unresolvable derived provenance deliberately fades.
    const rowTokens = new WeakMap();
    const rowToken = row => {
      if (!rowTokens.has(row)) rowTokens.set(row, token(row));
      return rowTokens.get(row);
    };
    let items;
    try { items = resolveMarkItems(program, layer.id); }
    catch { continue; } // Incomplete/unsupported selections keep conservative graphic keys.
    for (const item of items) {
      const members = item.members.map(rowToken);
      const membership = [...members].sort();
      const key = token([scope, root.id, layer.id, membership]);
      const topology = ["line", "area"].includes(layer.mark.type) ? token(members) : "";
      for (const [index, id] of item.graphicIds.entries()) {
        result.set(project(id), { key: `${key}/${index}`, topology });
      }
    }
  }
  // Named guides match by semantic role; text collections match by label value,
  // not tick array index, so domain changes never rename one tick into another.
  for (const [id, object] of Object.entries(program.graphicSpec.objects)) {
    if (!result.has(project(id))) result.set(project(id), { key: token([scope, id]), topology: "" });
    if (object.type === "canvas") result.set(`${project(id)}/background`, { key: token([scope, id, "background"]), topology: "" });
    for (const item of object.items ?? []) if (!result.has(project(item.id))) {
      result.set(project(item.id), { key: token([scope, id, item.properties]), topology: "" });
    }
    const layer = program.semanticSpec.layers.find(value => value.id === id);
    if (!layer && object.type === "text") {
      for (const item of object.items ?? []) result.set(project(item.id), {
        key: token([scope, id, item.properties.text]), topology: ""
      });
    }
  }
  for (const childId of program.compositionSpec?.children ?? []) {
    const child = program.children[childId];
    const facet = program.compositionSpec.type === "facet" || program.compositionSpec.type === "facetGrid";
    identities(child, id => project(namespaceGraphicId(`${program.compositionSpec.id}-${childId}`, id)),
      facet ? scope : `${scope}/${childId}`, result);
  }
  return result;
}

/** Read-only, browser-safe, structured-cloneable scene for animation consumers. */
export function createTransitionScene(program) {
  if (!program?.semanticSpec || !program?.graphicSpec) throw new TypeError("createTransitionScene requires a ChartProgram.");
  if (scenes.has(program)) return scenes.get(program);
  const scene = cloneAndFreeze(renderTransitionGraphics(program.graphicSpec, identities(program)));
  scenes.set(program, scene);
  return scene;
}
