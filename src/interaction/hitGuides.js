import { bindLegendHitMetadata } from "./hitLegends.js";
import { encodeValue } from "../core/valueEncoding.js";
import { cartesianAxisOwners, axisGraphicIds } from "../selectors/axes.js";
import { axisLabelTexts, axisLabelLines, axisLabelValues } from "../materialization/axisLabelText.js";
import { facetHeaderGraphicId, facetHeaderTextEntries } from "../materialization/facetHeaders.js";
import { valuesFromTickConfig } from "../actions/guides/tickValues.js";
import { resolvePolarTickValues } from "../actions/guides/polar/resolve.js";
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
  for (const owner of cartesianAxisOwners(program)) {
    const [, ticks, labels, title] = axisGraphicIds(owner.channel, owner.id);
    for (const [part, id] of [["ticks", ticks], ["labels", labels]]) {
      const config = owner.config?.[part];
      if (config === undefined || objects[id] === undefined) continue;
      const raw = valuesFromTickConfig(program, config);
      const values = part === "labels" ? axisLabelValues(raw, config) : raw;
      spend(values.length);
      let entries = values.map(value => token(owner.id, "axis-tick", ["axis", value]));
      if (part === "labels") {
        const texts = axisLabelTexts(values, program.resolvedScales[config.scale], config);
        entries = texts.flatMap((text, index) => {
          spend(text.length);
          return text === "" ? [] : axisLabelLines(text, config, program.materializationConfigs.textMetrics).map(() => entries[index]);
        });
      }
      bind(id, entries);
    }
    if (owner.config?.title !== undefined) single(title, token(owner.id, "axis-title", ["axis-title"]));
  }
  for (const channel of ["theta", "radius"]) {
    const config = program.materializationConfigs.guides?.axis?.[channel];
    if (config === undefined) continue;
    const [, ticks, labels, title] = axisGraphicIds(channel);
    for (const [part, id] of [["ticks", ticks], ["labels", labels]]) {
      if (config[part] === undefined || objects[id] === undefined) continue;
      const values = resolvePolarTickValues(program, config[part]);
      spend(values.length);
      bind(id, values.map(value => token(channel, "axis-tick", ["axis", value])));
    }
    if (config.title !== undefined) single(title, token(channel, "axis-title", ["axis-title"]));
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
