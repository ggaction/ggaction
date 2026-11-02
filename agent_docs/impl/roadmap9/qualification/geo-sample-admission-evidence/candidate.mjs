// Read-only candidate transform. No repository product file is modified.
import assert from 'node:assert/strict';
export const paths=['src/grammar/animation/geoState.js','src/materialization/animation/geoPresentation.js','src/animation/geoTracks.js'];
function replace(source,before,after){assert.equal(source.split(before).length,2,`Expected one candidate anchor: ${before}`);return source.replace(before,after);}
export function candidate(path,source){
 if(path===paths[0]){
  source=replace(source,'  const group = normalizeAnimationGeoGroup(input), features = [];',`  return resolveNormalizedAnimationGeoGeometry(normalizeAnimationGeoGroup(input), capacityEnabled);
}

// Internal synchronous preparation always admits the complete input. Only this
// closure can reach the calculation with that exact normalized immutable group.
export function prepareAnimationGeoGeometry(input) {
  const group = normalizeAnimationGeoGroup(input);
  return capacityEnabled => resolveNormalizedAnimationGeoGeometry(group, capacityEnabled);
}

function resolveNormalizedAnimationGeoGeometry(group, capacityEnabled) {
  const features = [];`);
 }
 if(path===paths[1]){
  source=replace(source,'normalizeAnimationGeoGroup, resolveAnimationGeoGeometry }','normalizeAnimationGeoGroup, resolveAnimationGeoGeometry, prepareAnimationGeoGeometry }');
  source=replace(source,'export function normalizeGeoAnimationPresentation(input) {',`export function normalizeGeoAnimationPresentation(input) {
  return admitGeoAnimationPresentation(input, false);
}

function admitGeoAnimationPresentation(input, prepareGeometry) {`);
  source=replace(source,'  normalizeAnimationGeoGroup(value.geometry);','  const geometry = prepareGeometry ? prepareAnimationGeoGeometry(value.geometry) : normalizeAnimationGeoGroup(value.geometry);');
  source=replace(source,'  return value;\n}\n\nexport function resolveGeoAnimationPresentation','  return prepareGeometry ? { presentation: value, resolveGeometry: geometry } : value;\n}\n\nexport function resolveGeoAnimationPresentation');
  source=replace(source,`  const presentation = normalizeGeoAnimationPresentation(input), { geometry, styles, plotOrigin } = presentation;
  const projected = resolveAnimationGeoGeometry(geometry, capacityEnabled), graphics = [];`, `  const presentation = normalizeGeoAnimationPresentation(input);
  return materializeGeoAnimationPresentation(presentation, resolveAnimationGeoGeometry(presentation.geometry, capacityEnabled), capacityEnabled);
}

// Admit all presentation fields before any native stream. The prepared closure
// stays within this call; generic wrappers and restored-state admission remain.
export function resolveSampledGeoPresentation(input, capacityEnabled = false) {
  const { presentation, resolveGeometry } = admitGeoAnimationPresentation(input, true);
  return { presentation, resolved: materializeGeoAnimationPresentation(presentation, resolveGeometry(capacityEnabled), capacityEnabled) };
}

function materializeGeoAnimationPresentation(presentation, projected, capacityEnabled) {
  const { geometry, styles, plotOrigin } = presentation, graphics = [];`);
 }
 if(path===paths[2]){
  source=replace(source,'normalizeGeoAnimationPresentation, resolveGeoAnimationPresentation, geoAnimationItemKey','normalizeGeoAnimationPresentation, resolveSampledGeoPresentation, geoAnimationItemKey');
  source=replace(source,'const presentation=normalizeGeoAnimationPresentation({...group.to,geometry,','const {presentation,resolved}=resolveSampledGeoPresentation({...group.to,geometry,');
  source=replace(source,`frame:interpolateNodeFrame(group.from.frame,group.to.frame,current)});
    const resolved=resolveGeoAnimationPresentation(presentation,capacityTracks.has(state));`,`frame:interpolateNodeFrame(group.from.frame,group.to.frame,current)},capacityTracks.has(state));`);
 }
 return source;
}
