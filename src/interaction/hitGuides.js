import { axisGuideItems } from "../materialization/guides/axisItems.js";
import { bindLegendHitMetadata } from "./hitLegends.js";
import { encodeValue } from "../core/valueEncoding.js";
import { axisGraphicIds } from "../selectors/axes.js";
import { facetHeaderGraphicId, facetHeaderTextEntries } from "../materialization/facetHeaders.js";


import { requireParallelAxisLayer, resolveStyledParallelAxes } from "../actions/guides/axes/parallel/resolve.js";

export function guideHitToken(ownerId, role, value) { return { ownerId, role, value: encodeValue(value) }; }
export function guideHitItemKey(namespaces, guide) {
  return JSON.stringify(["guide", namespaces, guide.ownerId, guide.role, guide.value]);
}

// Read-only semantic associations. Geometry always comes from the current scene.
export function guideHitMetadata(program, spend) {
  const result = new Map(), objects = program.graphicSpec.objects;
  const token = guideHitToken;
  const direct = (id, entry) => { spend(1 + id.length); result.set(id, entry); };
  const bind = (id, entries) => {
    const object = objects[id];
    if (object === undefined) return;
    const items = object.items ?? [{ id }];
    if (items.length !== entries.length) throw new Error(`Hit guide "${id}" has stale semantic item correspondence.`);
    for (let index = 0; index < items.length; index++) {
      direct(items[index].id, entries[index]);
    }
  };
  const single = (id, entry) => {
    if (objects[id] !== undefined) bind(id, (objects[id].items ?? [objects[id]]).map(() => entry));
  };
  for (const item of axisGuideItems(program, spend)) {
    direct(item.graphicId, token(item.ownerId, item.role, item.value));
  }
  const parallel = program.materializationConfigs.guides?.axis?.parallel?.axes;
  if (parallel !== undefined) {
    const { dimensions } = requireParallelAxisLayer(program, parallel.target);
    spend(dimensions.length);
    const { axes } = resolveStyledParallelAxes(program, dimensions);
    const [, ticks, labels, title] = axisGraphicIds("parallel");
    for (const [part, id] of [["ticks", ticks], ["labels", labels]]) {
      if (objects[id] === undefined) continue;
      const entries = axes.flatMap(axis => (axis[part]?.values ?? []).map(value => {
        spend(); return token("parallel", "axis-tick", ["axis", axis.field, value]);
      }));
      bind(id, entries);
    }
    bind(title, axes.filter(axis => axis.config.title !== undefined)
      .map(axis => token("parallel", "axis-title", ["axis-title", axis.field])));
  }
  if (program.materializationConfigs.title !== undefined) {
    for (const [field, id] of [["text", "chartTitle"], ["subtitle", "chartSubtitle"]]) {
      if (program.semanticSpec.title[field] !== undefined) single(id, token("title", "chart-title", [field]));
    }
  }
  if (program.compositionSpec?.facet !== undefined) {
    const id = facetHeaderGraphicId(program.compositionSpec.id);
    if (objects[id] !== undefined) bind(id, facetHeaderTextEntries(program).map(entry =>
      token(program.compositionSpec.id, "facet-header", [entry.role, entry.title === true ? "title" : "value", entry.ids ?? entry.id, entry.value])));
  }
  bindLegendHitMetadata(program, { bind, single, direct, token, spend });
  return result;
}
