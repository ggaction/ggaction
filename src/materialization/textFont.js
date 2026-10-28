import { cloneAndFreeze } from "../core/immutable.js";
import { fontMetricBinding, measureTextWidth } from "../core/textMetrics.js";
import { requireStoredResource } from "../selectors/resources.js";
import { concreteFontValue } from "./fontState.js";
import { withActionArgumentSummary } from "../core/action.js";

export function bindTextFontProperties(program, properties) {
  const profile = program.materializationConfigs.textMetrics;
  const binding = fontMetricBinding(profile, properties);
  if (binding === undefined) {
    if (!Object.hasOwn(properties, "font")) return properties;
    const { font: _font, ...plain } = properties;
    return plain;
  }
  // Even text without a label-placement policy participates in exact queries.
  for (const text of properties.lines?.map(line => line.text) ?? [properties.text]) measureTextWidth(text, properties, profile);
  const font = concreteFontValue(requireStoredResource(program, binding.resource));
  return { ...properties, font };
}

// Domain owners call this after their text/line geometry is complete. It never
// scans unrelated graphics or acts as a semantic-to-graphic compiler.
export function materializeTextFont(program, id) {
  const graphic = program.graphicSpec.objects[id];
  const update = item => {
    if ((item.type ?? graphic.type) !== "text") return item;
    const properties = bindTextFontProperties(program, item.properties);
    return properties === item.properties ? item : { ...item, properties };
  };
  if (graphic.items !== undefined) {
    const items = graphic.items.map(update);
    return items.every((item, index) => item === graphic.items[index]) ? program
      : program.editGraphics({ target: id, property: "items", value: items.map(({ id: _id, ...item }) => ({ ...item, type: item.type ?? graphic.type })) });
  }
  const next = update(graphic);
  if (next === graphic) return program;
  if (next.properties.font !== undefined) {
    const font = next.properties.font, args = { target: id, property: "font", value: font };
    return withActionArgumentSummary(args, { target: id, property: "font", value: {
      contentHash: font.contentHash, family: font.family, style: font.style, weight: font.weight,
      metricsProviderVersion: font.metricsProviderVersion, byteLength: font.byteLength
    } }, value => program.editGraphics(value));
  }
  return program._clone({ graphicSpec: cloneAndFreeze({ ...program.graphicSpec,
    objects: { ...program.graphicSpec.objects, [id]: next } }) });
}
