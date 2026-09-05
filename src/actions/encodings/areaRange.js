import { normalizeAreaBound, validateAreaEndpointPair, readAreaEndpoint } from "../../grammar/areaEndpoints.js";
import { deriveAreaSeries } from "../../grammar/areaSeries.js";
import { resolvePositionEncoding } from "./position/resolve.js";
import { resolveScalePreview } from "../scales/preview.js";
import { canMaterializeArea } from "../../materialization/marks/index.js";
import { findUpstreamTransform } from "../../materialization/dataProvenance.js";

export function prepareAreaRange(program, layer, dataset, channel, args, common) {
  const lower = normalizeAreaBound(args.lower), upper = normalizeAreaBound(args.upper);
  validateAreaEndpointPair(lower, upper);
  if (common.fieldType !== "quantitative") throw new Error("Area range requires quantitative endpoints.");
  readAreaEndpoint(dataset.values, { ...upper, fieldType: "quantitative" }, layer.mark.missing);
  const resolved = resolvePositionEncoding(program, channel, { ...common, ...lower,
    ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
    ...(args.scale === undefined ? {} : { scale: args.scale }) }, `encode${channel.toUpperCase()}Range`);
  const secondary = { ...upper, fieldType: "quantitative", scale: resolved.scale.id };
  const primary = { ...lower, fieldType: "quantitative", scale: resolved.scale.id };
  const updated = { ...layer, coordinate: resolved.coordinate.id,
    encoding: { ...layer.encoding, [channel]: primary, [`${channel}2`]: secondary } };
  const scales = program.semanticSpec.scales.filter(scale => scale.id !== resolved.scale.id);
  const preview = { ...program, markConfigs: program.markConfigs, canvasConfig: program.canvasConfig,
    semanticSpec: { ...program.semanticSpec,
      layers: program.semanticSpec.layers.map(item => item.id === layer.id ? updated : item),
      scales: [...scales, resolved.scale] } };
  resolveScalePreview(preview, resolved.scale.id);
  if (canMaterializeArea(preview, updated) && !findUpstreamTransform(program, dataset, "density")) {
    deriveAreaSeries(dataset.values, updated);
  }
  return { lower, upper, secondary };
}
