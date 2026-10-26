import {colorSizeChannels,colorSizeScaleIds} from "./colorSizeLegend.js";
import { LEGEND_CHANNELS, LEGEND_CONFIG_KINDS } from "../core/vocabulary.js";
import { isEnumeratedSizeScaleType } from "./scales/size.js";

export function validateLegendChannels(channels, operation) {
  if (!Array.isArray(channels)) throw new TypeError(`${operation} channels must be an array.`);
  if (channels.length === 0) throw new Error(`${operation} channels must select at least one channel.`);
  const seen = new Set();
  for (const channel of channels) {
    if (!LEGEND_CHANNELS.includes(channel)) throw new Error(`Unsupported legend channel "${channel}".`);
    if (seen.has(channel)) throw new Error(`${operation} channels contains duplicate "${channel}".`);
    seen.add(channel);
  }
}

const CATEGORICAL_KINDS = Object.freeze(["series", "color", "stroke"]);
const SINGLE_CHANNELS = Object.freeze({
  size: "size",
  opacity: "opacity",
  strokeWidth: "strokeWidth",
  gradient: "color",
  interval: "color",
  strokeGradient: "stroke",
  strokeInterval: "stroke"
});

const asciiCompare = (left, right) => left < right ? -1 : left > right ? 1 : 0;

export function legendBlockChannels(kind, config) {
  const channels = kind === "colorSize" ? colorSizeChannels(config) : CATEGORICAL_KINDS.includes(kind)
    ? config?.channels
    : SINGLE_CHANNELS[kind] === undefined
      ? undefined
      : [SINGLE_CHANNELS[kind]];
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new Error(`Legend block ${kind} requires at least one channel.`);
  }
  validateLegendChannels(channels, `Legend block ${kind}`);
  return Object.freeze([...channels].sort(asciiCompare));
}

export function legendBlockKey(channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new TypeError("Legend block key requires a non-empty channel array.");
  }
  return JSON.stringify([...channels].sort(asciiCompare));
}

export function describeLegendBlock(program, kind, config) {
  if (!LEGEND_CONFIG_KINDS.includes(kind)) {
    throw new Error(`Unknown legend block kind "${kind}".`);
  }
  const channels = legendBlockChannels(kind, config);
  const scaleIds = kind === "colorSize" ? colorSizeScaleIds(config) : CATEGORICAL_KINDS.includes(kind)
    ? config?.scales
    : [config?.scale];
  if (!Array.isArray(scaleIds) || scaleIds.length === 0 ||
    scaleIds.some(id => typeof id !== "string" || program.resolvedScales[id] === undefined)) {
    throw new Error(`Legend block ${kind} requires resolved scales.`);
  }
  const family = CATEGORICAL_KINDS.includes(kind)
    ? "categorical"
    : kind === "colorSize" ? "sampled" : kind === "size"
      ? isEnumeratedSizeScaleType(program.resolvedScales[scaleIds[0]].type)
        ? "discrete-size"
        : "sampled"
      : ["opacity", "strokeWidth"].includes(kind) || kind === "gradient" && config.representation === "symbols"
        ? "sampled"
        : ["gradient", "strokeGradient"].includes(kind)
          ? "gradient"
          : "interval";
  return Object.freeze({
    target: config.target,
    kind,
    family,
    key: legendBlockKey(channels),
    channels,
    scaleIds: Object.freeze([...scaleIds]),
    config
  });
}


export function categoricalLegendSymbolId(config,type){
 const single=config.symbol.layers.length===1&&((config.kind==="series"&&type==="line")||(["color","stroke"].includes(config.kind)&&type==="swatch"));
 return single?`${config.kind}LegendSymbols`:`${config.kind}LegendSymbol${{line:"Lines",point:"Points",swatch:"Swatches"}[type]}`;
}
