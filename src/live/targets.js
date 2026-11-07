import { findLayer } from "../selectors/layers.js";

// Default owners for live conveniences. Each resolves from the current
// immutable program only and fails with an explicit request when ambiguous.

export function markIds(program) {
  return program.semanticSpec.layers.map(layer => layer.id);
}

export function resolveMarkTarget(program, target, feature) {
  if (target !== undefined) {
    if (typeof target !== "string" || !markIds(program).includes(target)) throw new TypeError(`${feature} target must name an existing mark.`);
    return target;
  }
  const ids = markIds(program);
  if (ids.length !== 1) throw new TypeError(`${feature} requires an explicit target when the chart has ${ids.length} marks.`);
  return ids[0];
}

// Position scales of one mark, for wheel zoom and drag pan on axis charts.
export function positionScales(program, target) {
  const layer = findLayer(program, target);
  const result = {};
  for (const channel of ["x", "y"]) {
    const id = layer?.encoding?.[channel]?.scale;
    const scale = id === undefined ? undefined : program.resolvedScales?.[id];
    if (scale !== undefined && ["linear", "log", "time"].includes(scale.type) && scale.domain.length === 2 && scale.range.length === 2) {
      result[channel] = { id, type: scale.type, domain: scale.domain.map(Number), range: scale.range };
    }
  }
  return result;
}

const forward = (type, value) => type === "log" ? Math.log(value) : value;
const inverse = (type, value) => type === "log" ? Math.exp(value) : value;

// Zoom a continuous domain around one screen coordinate by factor (<1 zooms in).
export function zoomDomain({ type, domain, range }, screen, factor) {
  const [d0, d1] = domain.map(value => forward(type, value)), [r0, r1] = range;
  const anchor = d0 + (screen - r0) / (r1 - r0) * (d1 - d0);
  return [anchor + (d0 - anchor) * factor, anchor + (d1 - anchor) * factor].map(value => inverse(type, value));
}

// Shift a continuous domain by a screen distance.
export function panDomain({ type, domain, range }, delta) {
  const [d0, d1] = domain.map(value => forward(type, value)), [r0, r1] = range;
  const shift = -delta / (r1 - r0) * (d1 - d0);
  return [d0 + shift, d1 + shift].map(value => inverse(type, value));
}

// The original dataset that a mark draws, possibly through earlier live revisions.
export function sourceDataset(program, source) {
  if (source !== undefined) return source;
  const used = new Set(program.semanticSpec.layers.map(layer => layer.data).filter(value => typeof value === "string"));
  const originals = program.semanticSpec.datasets.filter(dataset => dataset.source === undefined && used.has(dataset.id));
  if (originals.length !== 1) throw new TypeError(`setData requires an explicit source when the chart draws ${originals.length} original datasets.`);
  return originals[0].id;
}

export function legendChannel(program, target, channel) {
  const channels = Object.values(program.guideConfigs?.legend ?? {}).filter(config => config.target === target).flatMap(config => config.channels ?? []);
  if (channel !== undefined) {
    if (!channels.includes(channel)) throw new TypeError(`addLegendToggle channel "${channel}" has no legend on this mark.`);
    return channel;
  }
  if (channels.length !== 1) throw new TypeError(`addLegendToggle requires an explicit channel when the mark has ${channels.length} legend channels.`);
  return channels[0];
}
