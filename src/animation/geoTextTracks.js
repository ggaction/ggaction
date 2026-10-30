import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit, validateUnitInterval } from "../core/validation.js";
import { prepareGeoCameraInterpolation, sampleGeoCameraInterpolation } from "../grammar/geo/cameraInterpolation.js";
import { interpolateNumber } from "../grammar/animation/values.js";
import { normalizeGeoTextPresentation, resolveGeoTextPresentation, geoTextSourceToken, sameGeoTextValue as same } from "../materialization/animation/geoTextGeometry.js";
import { prepareAnimationAppearance, sampleAnimationAppearance } from "./appearance.js";
import { clipInterpolationCompatible, interpolateNodeFrame } from "./concrete.js";

const prepared = new WeakSet();
const style = properties => Object.fromEntries(Object.entries(properties).filter(([key]) => !["x", "y"].includes(key)));
export function prepareGeoTextTracks(from, to) {
  const groups = [], skipFrom = new Set(), skipTo = new Set(), failures = new Map();
  const indices = state => {
    const result = state.groups.map(() => []);
    state.items.forEach((item, index) => { if (item !== null) result[item.group].push(index); });
    return result;
  };
  const fromIndices = indices(from), toIndices = indices(to);
  const sourceGroups = new Map(from.groups.map((group, index) => [group.presentation.key, index]));
  // A consistency token never authenticates history, but it cannot claim two raw values.
  const sources = new Map(); let work = 0;
  for (const state of [from, to]) for (const group of state.groups) for (const entry of group.presentation.entries) {
    validateWorkLimit(++work, "Geographic Text track work"); const token = geoTextSourceToken(entry);
    if (sources.has(token) && !same(sources.get(token), entry.anchor)) throw new TypeError("One geographic source cannot have contradictory raw anchors.");
    sources.set(token, entry.anchor);
  }
  for (const [targetGroup, target] of to.groups.entries()) {
    const sourceGroup = sourceGroups.get(target.presentation.key);
    if (sourceGroup === undefined) continue;
    const source = from.groups[sourceGroup], a = source.presentation, b = target.presentation;
    const camera = prepareGeoCameraInterpolation(a.parameters, b.parameters);
    const previous = new Map(a.entries.map(entry => [entry.identity.key, entry])), appearances = [];
    let reason = source.reason ?? target.reason ?? (a.coordinateKind !== b.coordinateKind || a.projection.id !== b.projection.id ? "geo-binding" : camera.reason);
    if (!clipInterpolationCompatible(source.frame, target.frame) || (source.leaderFrame === null) !== (target.leaderFrame === null) || source.leaderFrame !== null && !clipInterpolationCompatible(source.leaderFrame, target.leaderFrame)) reason ??= "clip-topology";
    if (!same(a.layout, b.layout) || !same(a.leader, b.leader)) reason ??= "geo-text-layout";
    if (a.entries.length !== b.entries.length) reason ??= "geo-text-membership";
    for (const entry of b.entries) {
      validateWorkLimit(++work, "Geographic Text track work"); const old = previous.get(entry.identity.key);
      if (old === undefined) { reason ??= "geo-text-membership"; continue; }
      if (geoTextSourceToken(old) !== geoTextSourceToken(entry)) reason ??= "geo-feature-geometry";
      const appearance = same(style(old.properties), style(entry.properties)) ? null : prepareAnimationAppearance(style(old.properties), style(entry.properties));
      if (appearance?.kind === "crossfade") reason ??= appearance.reason;
      appearances.push(appearance);
    }
    if (reason !== undefined) { failures.set(targetGroup, reason); continue; }
    for (const index of fromIndices[sourceGroup]) skipFrom.add(index);
    for (const index of toIndices[targetGroup]) skipTo.add(index);
    groups.push({ sourceGroup, targetGroup, from: source, to: target, camera, appearances,
      entries: b.entries.map(entry => previous.get(entry.identity.key)) });
  }
  const state = cloneAndFreeze({ groups }); prepared.add(state);
  return { state, skipFrom, skipTo, fallbackTrack(match) {
    const a = from.items[match.sourceIndex], b = to.items[match.targetIndex];
    if (a === null && b === null) return undefined;
    return { ...match, kind: "crossfade", reason: b === null ? "geo-identity" : failures.get(b.group) ?? "geo-identity" };
  } };
}
export function sampleGeoTextTracks(state, progress, accountWork, timeline) {
  if (!prepared.has(state)) throw new TypeError("Geographic Text sampling requires authentic tracks.");
  validateUnitInterval(progress, "Geographic Text progress");
  let work = 0;
  const account = amount => { validateWorkLimit(work += amount, "Geographic Text sampled work"); accountWork?.(amount); };
  return state.groups.map(group => {
    const a = group.from.presentation, b = group.to.presentation;
    const current = timeline?.progress(b.key) ?? progress;
    const presentation = normalizeGeoTextPresentation({ ...b, parameters: sampleGeoCameraInterpolation(group.camera, current).parameters,
      plotOrigin: b.plotOrigin.map((value, index) => interpolateNumber(a.plotOrigin[index], value, current)),
      bounds: Object.fromEntries(Object.entries(b.bounds).map(([key, value]) => [key, interpolateNumber(a.bounds[key], value, current)])),
      entries: b.entries.map((entry, index) => ({ ...entry, properties: { ...entry.properties,
        ...(group.appearances[index] === null ? {} : sampleAnimationAppearance(group.appearances[index], current)),
        ...timeline?.textStyle(group.targetGroup,entry.identity.key),
        x: interpolateNumber(group.entries[index].properties.x, entry.properties.x, current),
        y: interpolateNumber(group.entries[index].properties.y, entry.properties.y, current) } })) });
    return { sourceGroup: group.sourceGroup, targetGroup: group.targetGroup, presentation,
      frame: interpolateNodeFrame(group.from.frame, group.to.frame, current),
      leaderFrame: group.to.leaderFrame === null ? null : interpolateNodeFrame(group.from.leaderFrame, group.to.leaderFrame, current),
      graphics: resolveGeoTextPresentation(presentation, account) };
  });
}
