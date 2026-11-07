import { resolveSizeLegendLayout, resolveColorSizeLayout } from "./legendSamples.js";
import { resolveGradientLayout } from "./legendGradient.js";
import { legendResourcePolicies } from "./resources.js";
import { legendSampleGraphicGroups } from "../legendClip.js";
import { resolveEffectiveLegendBlockConfig } from "./legendConfig.js";
import { resolveCategoricalLegendConfig as activeConfig, categoricalLegendLabels } from "./legendConfig.js";
import { categoricalLegendView } from "../../grammar/legendOverflow.js";
import { resolveLegendSampleValues } from "../../grammar/legendSampling.js";

const intervals = scale => scale.range.map((_, index) => ["interval", index === 0 ? null : scale.thresholds[index - 1],
  index === scale.range.length - 1 ? null : scale.thresholds[index]]);

// Native typed values and exact concrete item roles are shared by hit and
// animation preparation. Display labels and array indices never name a value.
export function legendGuideItems(program, spend) {
  const result = [], objects = program.graphicSpec.objects;
  const append = (graphicId, entry, component, part = null, line = 0) =>
    result.push({ ...entry, graphicId, component, part, line });
  const bind = (id, entries, component) => {
    const object = objects[id];
    if (object === undefined) return;
    const items = object.items ?? [{ id }];
    if (items.length !== entries.length) throw new Error(`Hit guide "${id}" has stale semantic item correspondence.`);
    for (let index = 0; index < items.length; index++) append(items[index].id, entries[index], component);
  };
  const single = (id, entry, component) => {
    if (objects[id] !== undefined) (objects[id].items ?? [{ id }]).forEach((item, line) => append(item.id, entry, component, null, line));
  };
  for (const policy of legendResourcePolicies()) {
    const { kind, family, graphicIds } = policy, stored = program.materializationConfigs.guides?.legend?.[kind];
    if (stored === undefined) continue;
    const component = role => graphicIds.find(id => id.endsWith(role));
    const config = resolveEffectiveLegendBlockConfig(program, kind, stored);
    const scale = program.resolvedScales[config.scale];
    const sampleCount = config.domain?.length ?? config.sampling?.values?.length ?? config.sampling?.count ?? config.count ?? scale?.range?.length ?? 5;
    // Existing legend layout may compare labels pairwise; account before invoking it.
    spend(sampleCount * sampleCount);
    const entry = value => ({ ownerId: config.target, kind, role: "legend-item", value: [kind, value] });
    const bindSamples = values => {
      const groups = legendSampleGraphicGroups(program, kind, config);
      if (groups.length !== values.length) throw new Error(`Hit legend "${kind}" has stale sample correspondence.`);
      groups.forEach((ids, index) => ids.forEach((id, part) => append(id, values[index], "symbol",
        family === "categorical" ? config.symbol.layers[part].type : "sample")));
    };
    let symbols, labels;
    if (family === "categorical") {
      const effective = activeConfig(program, kind).config, view = categoricalLegendView(effective);
      const keys = view.domain.map(value => entry(["value", value]));
      const summary = entry(["summary"]);
      if (view.hiddenCount > 0 && view.overflow.summarySymbol === "first-hidden") keys[keys.length - 1] = summary;
      const texts = categoricalLegendLabels(effective);
      const labelKeys = view.hiddenCount > 0 ? [...keys.slice(0, view.overflow.maxItems), summary] : keys;
      bindSamples(keys);
      labels = texts.flatMap((text, index) => text === "" ? [] : [labelKeys[index]]);
    } else if (kind === "size") {
      const layout = resolveSizeLegendLayout(program, stored);
      symbols = (layout.values === undefined ? intervals(scale) : layout.values.map(value => ["value", value])).map(entry);
      const keys = layout.hiddenCount > 0 ? [...symbols, entry(["summary"])] : symbols;
      labels = layout.labelItemIndices === undefined ? keys : layout.labelItemIndices.map(index => keys[index]);
      bindSamples(symbols);
    } else if (kind === "colorSize") {
      const layout = resolveColorSizeLayout(program, stored);
      symbols = layout.values.map(value => entry(["value", value]));
      labels = layout.text.flatMap((text, index) => text === "" ? [] : [symbols[index]]);
      bindSamples(symbols);
    } else if (kind === "gradient" || kind === "strokeGradient") {
      const layout = resolveGradientLayout(program, config, scale);
      labels = layout.values.map(value => entry(["value", value]));
      if (config.representation === "symbols") bindSamples(labels);
      else {
        bind(component("Ticks"), labels, "tick");
        single(component("Strips"), entry(["range", scale.domain]), "strip");
      }
    } else if (family === "interval") {
      symbols = intervals(scale).map(entry); labels = symbols;
      bind(component("Symbols"), symbols, "symbol");
    } else {
      symbols = resolveLegendSampleValues(config, scale).map(value => entry(["value", value])); labels = symbols;
      if (kind === "opacity") bindSamples(symbols);
      else bind(component("Symbols"), symbols, "symbol");
    }
    bind(component("Labels"), labels, "label");
    single(component("Title"), entry(["title"]), "title");
  }
  return result;
}
