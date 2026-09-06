import { action } from "../../core/action.js";
import { validateColorLayout } from "../../grammar/seriesLayout.js";
import { deriveAreaSeries, deriveDensityAreaSeries, layoutDensityAreaSeries } from "../../grammar/areaSeries.js";
import { readSeriesIdentity } from "../../grammar/pathSeries.js";
import { BAR_GRAINS, resolveBarChannels, resolveBarGrain } from "../../grammar/bars/policy.js";
import { deriveBarAggregates } from "../../grammar/bars/aggregate.js";
import { findSemanticScale, hasSemanticScaleReferences } from "../../selectors/scales.js";
import { findUpstreamTransform } from "../../materialization/dataProvenance.js";
import { resolveOffsetScaleDefinition } from "../scales/definitions.js";
import { resolveScalePreview } from "../scales/preview.js";
import { getPositionEncodingMaterializationSteps } from "../../materialization/marks/index.js";
import { resolveTarget, setEncodingProperties, validateOptions } from "./shared.js";

export function stackLayoutMode(stack) {
  return stack === "normalize" ? "fill" : stack === "center" ? "center" : stack === null ? "overlay" : "stack";
}

export const layoutSeries = action({ op: "layoutSeries", description: "Assign series placement independently of color." }, function (args = {}) {
  validateOptions(args, ["target", "mode"], "layoutSeries");
  const mode = validateColorLayout(args.mode);
  const { id: target, layer, dataset } = resolveTarget(this, args.target, ["bar", "area"], "series mark");
  const encoding = Object.fromEntries(Object.entries(layer.encoding ?? {}).map(([key, value]) => [key, { ...value }]));
  const group = encoding.group;
  const color = encoding.color;
  if (group === undefined && color?.field !== undefined && ["nominal", "ordinal"].includes(color.fieldType)) {
    encoding.group = { field: color.field, fieldType: "nominal", inferredFrom: "color" };
  }
  for (const channel of ["x", "y"]) if (encoding[channel]) delete encoding[channel].stack;
  if (color) delete color.layout;
  const updated = { ...layer, layout: { mode }, encoding };
  const density = findUpstreamTransform(this, dataset, "density");
  const horizon = findUpstreamTransform(this, dataset, "horizon");
  let endpoint, offset, offsetScale, offsetChannel;
  if (layer.mark.type === "area") {
    if (horizon !== undefined) throw new Error("Horizon owns its layout; layoutSeries is not supported.");
    if (mode === "group") throw new Error("Area does not support group layout.");
    if (density !== undefined) layoutDensityAreaSeries(deriveDensityAreaSeries(dataset.values, updated, density), mode);
    else {
      if (mode !== "overlay" && encoding.x2 === undefined && encoding.y2 === undefined && encoding.y?.fieldType === "quantitative") {
        endpoint = { channel: "y2", datum: 0, fieldType: "quantitative", scale: encoding.y.scale };
        encoding.y2 = { datum: 0, fieldType: "quantitative", scale: encoding.y.scale };
      }
      if (encoding.x?.scale === undefined || encoding.y?.scale === undefined) throw new Error("Area layout requires complete positions.");
      deriveAreaSeries(dataset.values, updated);
    }
  } else {
    const channels = resolveBarChannels(updated), grain = resolveBarGrain(updated);
    if (grain === undefined || encoding.x?.scale === undefined || encoding.y?.scale === undefined) throw new Error("Series layout requires a complete bar.");
    if (mode === "center") throw new Error("Centered bars are not supported.");
    if (grain === BAR_GRAINS.ranged && mode !== "overlay") throw new Error("Ranged bars support only overlay layout.");
    if (grain === BAR_GRAINS.aggregate) deriveBarAggregates(dataset.values, updated);
    if (mode === "group" && grain === BAR_GRAINS.aggregate) {
      if (encoding.group === undefined) throw new Error("Grouped bars require a group encoding.");
      readSeriesIdentity(dataset.values, updated);
      offsetChannel = `${channels.category}Offset`;
      offsetScale = resolveOffsetScaleDefinition(this, { id: encoding[offsetChannel]?.scale ?? offsetChannel }, offsetChannel);
      offset = { ...(encoding.group.field === undefined ? {} : { field: encoding.group.field }), fieldType: encoding[offsetChannel]?.fieldType ?? "nominal", scale: offsetScale.id };
      encoding[offsetChannel] = offset;
    } else for (const channel of ["xOffset", "yOffset"]) delete encoding[channel];
  }
  const scales = offsetScale === undefined ? this.semanticSpec.scales
    : [...this.semanticSpec.scales.filter(scale => scale.id !== offsetScale.id), offsetScale];
  const preview = { ...this, markConfigs: this.markConfigs, canvasConfig: this.canvasConfig,
    resolvedScales: { ...this.resolvedScales },
    semanticSpec: { ...this.semanticSpec, scales,
      layers: this.semanticSpec.layers.map(item => item.id === target ? updated : item) } };
  for (const id of new Set([encoding.x?.scale, encoding.y?.scale, offset?.scale].filter(Boolean))) {
    preview.resolvedScales[id] = resolveScalePreview(preview, id).resolvedScale;
  }
  let next = this.editSemantic({ property: `layer[${target}].layout.mode`, value: mode });
  if (group === undefined && encoding.group !== undefined) next = setEncodingProperties(next, target, "group", encoding.group);
  for (const channel of ["x", "y"]) if (Object.hasOwn(layer.encoding?.[channel] ?? {}, "stack")) {
    next = next.editSemantic({ property: `layer[${target}].encoding.${channel}.stack`, remove: true });
  }
  if (color && Object.hasOwn(layer.encoding.color, "layout")) next = next.editSemantic({ property: `layer[${target}].encoding.color.layout`, remove: true });
  if (endpoint !== undefined) {
    next = next[endpoint.channel === "y2" ? "encodeY2" : "encodeX2"]({ target, datum: 0 });
  }
  if (layer.mark.type === "bar") {
    for (const channel of ["xOffset", "yOffset"]) {
      if (layer.encoding?.[channel] !== undefined) next = next.editSemantic({ property: `layer[${target}].encoding.${channel}`, remove: true });
      if (channel !== offsetChannel) next = next._withoutMaterializationConfig(["marks", target, channel]);
    }
    if (offset !== undefined) {
      next = offset.field === undefined
        ? setEncodingProperties(next, target, offsetChannel, offset).createScale(offsetScale)
        : next[offsetChannel === "xOffset" ? "encodeXOffset" : "encodeYOffset"]({ target, field: offset.field, fieldType: offset.fieldType, scale: offsetScale });
      if (findSemanticScale(this, offsetScale.id) === undefined) next = next._withMarkConfig(target, { ...next.markConfigs[target], seriesOffsetScale: offsetScale.id });
    } else {
      const owned = next.markConfigs[target]?.seriesOffsetScale;
      if (owned !== undefined) {
        const referenced = hasSemanticScaleReferences(next.semanticSpec, owned);
        if (!referenced) next = next.editSemantic({ property: `scale[${owned}]`, remove: true });
        next = next._withoutMaterializationConfig(["marks", target, "seriesOffsetScale"]);
      }
    }
  }
  for (const step of getPositionEncodingMaterializationSteps(next, updated, encoding.y.scale)) next = next[step.op](step.args);
  return next;
});

export function registerSeriesLayoutAction(ProgramClass) {
  ProgramClass.prototype.layoutSeries = layoutSeries;
}
