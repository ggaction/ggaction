import { cartesianAxisOwners, axisGraphicIds } from "../../selectors/axes.js";
import { axisLabelTexts, axisLabelLines, axisLabelValues } from "../axisLabelText.js";
import { valuesFromTickConfig, resolvePolarTickValues } from "./tickValues.js";

// Resolve native guide values to their final concrete items once. Values, not
// collection positions or displayed strings, establish cross-state identity.
// A line number identifies a label's existing multiline role, not a tick value.
export function axisGuideItems(program, spend) {
  const result = [], objects = program.graphicSpec.objects;
  const bind = (graphicId, entries) => {
    const object = objects[graphicId];
    if (object === undefined) return;
    const items = object.items ?? [{ id: graphicId }];
    if (items.length !== entries.length) throw new Error(`Guide "${graphicId}" has stale semantic item correspondence.`);
    for (let index = 0; index < items.length; index++) result.push({ ...entries[index], graphicId: items[index].id });
  };
  const title = (ownerId, channel, id, config) => {
    if (config === undefined || objects[id] === undefined) return;
    bind(id, (objects[id].items ?? [objects[id]]).map((_, line) => ({ ownerId, channel, component: "title", role: "axis-title", value: ["axis-title"], config, line })));
  };
  for (const owner of cartesianAxisOwners(program)) {
    const [, ticks, labels, titleId] = axisGraphicIds(owner.channel, owner.id);
    for (const [component, id] of [["ticks", ticks], ["labels", labels]]) {
      const config = owner.config?.[component];
      if (config === undefined || objects[id] === undefined) continue;
      const raw = valuesFromTickConfig(program, config);
      const values = component === "labels" ? axisLabelValues(raw, config) : raw;
      spend(values.length);
      const entry = (value, line = 0, lineCount = 1) => ({ ownerId: owner.id, channel: owner.channel, component, role: "axis-tick", value: ["axis", value], rawValue: value, config, line, lineCount });
      let entries = values.map(value => entry(value));
      if (component === "labels") {
        const texts = axisLabelTexts(values, program.resolvedScales[config.scale], config);
        entries = texts.flatMap((text, index) => {
          spend(text.length);
          if (text === "") return [];
          const lines = axisLabelLines(text, config, program.materializationConfigs.textMetrics);
          return lines.map((_, line) => entry(values[index], line, lines.length));
        });
      }
      bind(id, entries);
    }
    title(owner.id, owner.channel, titleId, owner.config?.title);
  }
  for (const channel of ["theta", "radius"]) {
    const config = program.materializationConfigs.guides?.axis?.[channel];
    if (config === undefined) continue;
    const [, ticks, labels, titleId] = axisGraphicIds(channel);
    for (const [component, id] of [["ticks", ticks], ["labels", labels]]) {
      if (config[component] === undefined || objects[id] === undefined) continue;
      const values = resolvePolarTickValues(program, config[component]);
      spend(values.length);
      bind(id, values.map(value => ({ ownerId: channel, channel, component, role: "axis-tick", value: ["axis", value], rawValue: value, config: config[component], line: 0, lineCount: 1 })));
    }
    title(channel, channel, titleId, config.title);
  }
  return result;
}
