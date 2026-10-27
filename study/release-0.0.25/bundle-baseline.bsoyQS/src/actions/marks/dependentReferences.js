import { findLayer } from "../../selectors/layers.js";
import { ownedChildren } from "../../selectors/markOwners.js";
import { findGraphicParent } from "../../grammar/schemas/graphicTree.js";
import { applyLayerDataRematerialization } from "../../materialization/dependencies.js";

export function retainStatisticalDependents(program, ownerId) {
  const references = new Map();
  const visited = new Set();
  const visit = id => {
    if (visited.has(id)) return;
    visited.add(id);
    const config = program.markConfigs[id]?.statisticalReference;
    if (config !== undefined) references.set(id, {
      config, encoding: findLayer(program, id).encoding
    });
    for (const child of ownedChildren(program, id)) visit(child);
  };
  visit(ownerId);
  let next = program;
  // Keep independently authored references and their labels through the
  // component replacement; removeMark otherwise treats them as source-owned.
  for (const id of references.keys()) {
    const { statisticalReference, ...config } = next.markConfigs[id];
    next = next._withMarkConfig(id, config);
    // Detached statistics must not temporarily look like ordinary data marks:
    // their derived value field would pollute axis-title/domain inference while
    // replacement components fulfill their guides.
    const encoding = findLayer(next, id).encoding;
    for (const channel of ["x", "y", "x2", "y2"]) {
      if (encoding[channel] !== undefined) {
        next = next.editSemantic({ property: `layer[${id}].encoding.${channel}`, remove: true });
      }
    }
  }
  return { program: next, references };
}

export function restoreStatisticalDependents(program, references, { fallbackSource, fromAxis, toAxis }) {
  if (references.size === 0) return program;
  let next = program;
  const sources = new Set();
  for (const [id, { config, encoding }] of references) {
    const source = findLayer(next, config.source) === undefined ? fallbackSource : config.source;
    const axis = config.axis === fromAxis ? toAxis : config.axis;
    const channels = fromAxis === toAxis ? [["x", "x"], ["y", "y"], ["x2", "x2"], ["y2", "y2"]]
      : [["x", "y"], ["y", "x"], ["x2", "y2"], ["y2", "x2"]];
    for (const [from, to] of channels) {
      for (const [key, value] of Object.entries(encoding[from] ?? {})) {
        next = next.editSemantic({ property: `layer[${id}].encoding.${to}.${key}`, value });
      }
    }
    next = next._withMarkConfig(id, {
      ...next.markConfigs[id],
      statisticalReference: { ...config, source, axis }
    });
    sources.add(source);
  }
  // Recreate these graphics after the new components, retaining overlays'
  // authored styles while placing them above their source as before.
  const graphics = new Map();
  const removeGraphics = id => {
    if (graphics.has(id)) return;
    graphics.set(id, {
      graphic: next.graphicSpec.objects[id],
      parent: findGraphicParent(next.graphicSpec, id)?.id
    });
    for (const child of ownedChildren(next, id)) removeGraphics(child);
    if (next.graphicSpec.objects[id] !== undefined) {
      next = next.editGraphics({ target: id, remove: true });
    }
  };
  for (const id of references.keys()) removeGraphics(id);
  for (const [id, { graphic, parent }] of graphics) {
    if (graphic !== undefined) {
      next = next.createGraphics({
        id, type: graphic.type, ...(parent === undefined ? {} : { parent }),
        ...(graphic.type === "collection" || graphic.items === undefined ? {} : { length: 0 })
      });
    }
  }
  for (const source of sources) next = applyLayerDataRematerialization(next, source);
  for (const id of references.keys()) {
    if (ownedChildren(next, id).length > 0) next = applyLayerDataRematerialization(next, id);
  }
  return next._withContext(program.context);
}

