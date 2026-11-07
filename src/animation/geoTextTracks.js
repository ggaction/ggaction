import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit, validateUnitInterval } from "../core/validation.js";
import { prepareGeoCameraInterpolation, sampleGeoCameraInterpolation } from "../grammar/geo/cameraInterpolation.js";
import { interpolateNumber } from "../grammar/animation/values.js";
import { normalizeGeoTextPresentation, resolveGeoTextPresentation, geoTextSourceToken, sameGeoTextValue as same } from "../materialization/animation/geoTextGeometry.js";
import { geoTextExpressionOrigins } from "../materialization/animation/geoText.js";
import { prepareGeoTextExpressions, sampleGeoTextExpressions } from "./geoTextExpressionTracks.js";
import { clipInterpolationCompatible, interpolateNodeFrame } from "./concrete.js";

const prepared = new WeakMap();
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
    const previous = new Map(a.entries.map((entry, index) => [entry.identity.key, { entry, index }]));
    let reason = source.reason ?? target.reason ?? (a.coordinateKind !== b.coordinateKind || a.projection.id !== b.projection.id ? "geo-binding" : camera.reason);
    if (!clipInterpolationCompatible(source.frame, target.frame) || !clipInterpolationCompatible(source.leaderFrame, target.leaderFrame)) reason ??= "clip-topology";
    if (a.entries.length !== b.entries.length) reason ??= "geo-text-membership";
    for (const entry of b.entries) {
      validateWorkLimit(++work, "Geographic Text track work"); const old = previous.get(entry.identity.key);
      if (old === undefined) { reason ??= "geo-text-membership"; continue; }
      if (geoTextSourceToken(old.entry) !== geoTextSourceToken(entry)) reason ??= "geo-feature-geometry";
    }
    const expressions = reason === undefined ? prepareGeoTextExpressions(a, b, b.entries.map(entry => previous.get(entry.identity.key).index)) : undefined;
    reason ??= expressions?.reason;
    if (reason !== undefined) { failures.set(targetGroup, reason); continue; }
    for (const index of fromIndices[sourceGroup]) skipFrom.add(index);
    for (const index of toIndices[targetGroup]) skipTo.add(index);
    groups.push({ sourceGroup, targetGroup, from: source, to: target, camera, expressions });
  }
  const state = cloneAndFreeze({ groups }); prepared.set(state, { from, to });
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
    const expressionState = sampleGeoTextExpressions(group.expressions, b.entries, current, key => timeline?.textStyle(group.targetGroup, key));
    const presentation = normalizeGeoTextPresentation({ ...b, parameters: sampleGeoCameraInterpolation(group.camera, current).parameters,
      plotOrigin: b.plotOrigin.map((value, index) => interpolateNumber(a.plotOrigin[index], value, current)),
      bounds: Object.fromEntries(Object.entries(b.bounds).map(([key, value]) => [key, interpolateNumber(a.bounds[key], value, current)])),
      expressions: expressionState.expressions });
    const frame = interpolateNodeFrame(group.from.frame, group.to.frame, current);
    // Even an absent leader has its exact native parent collection frame.
    const leaderFrame = interpolateNodeFrame(group.from.leaderFrame, group.to.leaderFrame, current);
    const endpoints = prepared.get(state);
    const origins = expressionState.origins.map(origin => geoTextExpressionOrigins(endpoints[origin.side], origin.side === "from" ? group.sourceGroup : group.targetGroup)?.[origin.index]);
    return { sourceGroup: group.sourceGroup, targetGroup: group.targetGroup, presentation, frame, leaderFrame, origins,
      graphics: resolveGeoTextPresentation(presentation, account, { frame, leaderFrame }) };
  });
}
