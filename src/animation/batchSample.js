import { cloneAndFreeze, freezeOwned } from '../core/immutable.js';
import { createCircleBatchColumn } from '../grammar/schemas/circleBatch.js';
import { createPathBatchColumn } from '../grammar/schemas/pathBatch.js';
import { partitionAnimationGroupWork, partitionAnimationOutlineColumns } from '../materialization/animation/partitionGeometry.js';
import { partitionAnimationPaint, samplePartitionPairGroup } from './partitionTracks.js';
import { preparePositionBatch, samplePositionBatch } from '../grammar/animation/positions.js';
import { interpolateNumber } from '../grammar/animation/values.js';
import { validateConcreteGraphicProperties } from '../grammar/schemas/concreteGraphic.js';
import { validateGeneratedItemLimit, validateWorkLimit } from '../core/validation.js';
import { animationResourceLimits } from './resources.js';
import { sampleAnimationAppearance } from './appearance.js';
import { equalBatchValue } from './batchScene.js';
import { interpolateNodeFrame, blendAnimationNodes } from './concrete.js';
import { prepareBatchEndpointMapping, projectSampledAnimationEndpoint } from './endpoints.js';
import { animationPlanProvenance, registerAnimationFrame } from './frameProvenance.js';
import { sampleTransitionTimeline } from './timelineSample.js';
import { canvasSceneProgram } from '../renderers/canvasScene.js';

const prepared = new WeakMap();
const style = node => Object.fromEntries(Object.entries(node.properties).filter(([key]) => !['x', 'y', 'radius'].includes(key)));
const frame = node => ({ offset: node.offset, clip: node.clip, clips: node.clips });

// Prepared runs are only an execution form of the already admitted scalar
// point tracks and partition body tracks. Every other family uses the
// existing kernel and concrete fallback.
export function prepareBatchSampling(plan, state) {
  if (plan.version !== 6 || plan.exits.length || state.timeline?.tracks.some(track => track.property !== 'geometry')) return;
  const updates = new Map([...plan.tracks, ...plan.frameTracks].map(track => [track.targetIndex, track]));
  if (updates.size !== plan.to.scene.nodes.length) return;
  const fromPositions = state.positions.from, toPositions = state.positions.to, partitions = state.partitions;
  const groups = []; let current;
  for (let index = 0; index < plan.to.scene.nodes.length; index++) {
    const track = updates.get(index), to = plan.to.scene.nodes[index], from = plan.from.scene.nodes[track.sourceIndex];
    if (track.role === 'canvas-background' && ['exact', 'crossfade'].includes(track.kind)) {
      if (partitions.to.items[index] !== null) return;
      current = undefined; groups.push({ kind: 'single', keys: [to.key], track, from, to }); continue;
    }
    if (track.kind === 'semantic-partition') {
      // Partition bodies are complete closed outlines of one sampled group.
      const item = partitions.to.items[index];
      if (typeof track.ownerKey !== 'string' || typeof track.key !== 'string' || item === null || item.role !== 'body') return;
      const appearance = partitionAnimationPaint(to.properties);
      if (current?.kind !== 'path-run' || current.keys.length === 10000 || current.track.pair !== track.pair || current.track.ownerKey !== track.ownerKey ||
          current.track.role !== track.role || current.to.topology !== to.topology || !equalBatchValue(current.appearance, appearance) ||
          !equalBatchValue(current.track.appearance, track.appearance) || !equalBatchValue(frame(current.from), frame(from)) || !equalBatchValue(frame(current.to), frame(to))) {
        current = { kind: 'path-run', keys: [], track, from, to, appearance, tracks: [], items: [] }; groups.push(current);
      }
      current.keys.push(to.key); current.tracks.push(track); current.items.push(item); continue;
    }
    if (track.kind !== 'semantic-point' || typeof track.ownerKey !== 'string' || fromPositions[track.sourceIndex]?.reason || toPositions[index]?.reason) return;
    const appearance = style(to);
    if (current?.kind !== 'circle-run' || current.keys.length === 10000 || current.track.ownerKey !== track.ownerKey || current.track.role !== track.role || current.to.topology !== to.topology ||
        !equalBatchValue(current.appearance, appearance) || !equalBatchValue(current.track.appearance, track.appearance) ||
        !equalBatchValue(frame(current.from), frame(from)) || !equalBatchValue(frame(current.to), frame(to)) ||
        current.track.x.from.scale !== track.x.from.scale || current.track.x.to.scale !== track.x.to.scale ||
        current.track.y.from.scale !== track.y.from.scale || current.track.y.to.scale !== track.y.to.scale) {
      current = { kind: 'circle-run', keys: [], track, from, to, appearance, tracks: [] }; groups.push(current);
    }
    current.keys.push(to.key); current.tracks.push(track);
  }
  if (!groups.some(group => group.kind !== 'single')) return;
  // Sampled partition groups follow their first row, as in the per-node frame.
  const pairs = [], logicalItems = [];
  for (const group of groups) {
    group.keys = freezeOwned(group.keys);
    if (group.kind === 'path-run') {
      let slot = pairs.indexOf(group.track.pair);
      if (slot < 0) slot = pairs.push(group.track.pair) - 1;
      for (const item of group.items) logicalItems.push({ ...item, group: slot });
      group.slot = slot; group.itemKeys = freezeOwned(group.items.map(item => item.key));
      group.decisions = cloneAndFreeze({ kind: 'semantic-kernel', kernel: 'partition', ownerKey: group.track.ownerKey, role: group.track.role,
        sourceIndices: group.tracks.map(track => track.sourceIndex), targetIndices: group.tracks.map(track => track.targetIndex), itemKeys: group.tracks.map(track => track.key) });
      group.appearance = cloneAndFreeze(group.appearance); delete group.items; Object.freeze(group.tracks);
    } else if (group.kind === 'circle-run') {
      logicalItems.push(...group.keys.map(() => null));
      group.x = preparePositionBatch(group.tracks.map(track => track.x)); group.y = preparePositionBatch(group.tracks.map(track => track.y));
      group.decisions = cloneAndFreeze({ kind: 'semantic-kernel', kernel: 'cartesian-point', ownerKey: group.track.ownerKey, role: group.track.role,
        sourceIndices: group.tracks.map(track => track.sourceIndex), targetIndices: group.tracks.map(track => track.targetIndex), itemKeys: group.tracks.map(track => track.key) });
      group.appearance = cloneAndFreeze(group.appearance); Object.freeze(group.tracks);
    } else {
      logicalItems.push(null);
      const track = group.track;
      group.decision = cloneAndFreeze({ sourceIndex: track.sourceIndex, targetIndex: track.targetIndex, owner: track.owner, role: track.role,
        kind: track.kind, ...(track.kind === 'crossfade' ? { reason: track.reason } : {}) });
    }
    Object.freeze(group);
  }
  const correspondence = prepareBatchEndpointMapping(plan.to, freezeOwned(groups.map(group => freezeOwned({ kind: group.kind, keys: group.keys }))));
  const proof = animationPlanProvenance(plan); let native;
  if (proof.from !== undefined && proof.to !== undefined) {
    const nodes = plan.to.scene.nodes.map((_, index) => {
      const track = updates.get(index), origin = proof.to.nodes[index];
      if (origin === undefined) throw new TypeError('Batched native rows require exact endpoint origins.');
      return track.kind === 'crossfade' ? Object.freeze({ origin: origin.origin, metrics: Object.freeze([...proof.from.nodes[track.sourceIndex].metrics, ...origin.metrics]) }) : origin;
    });
    const owners = new Set([...proof.directOwners, proof.to.placement]);
    for (const node of nodes) { owners.add(node.origin.program); for (const origin of node.metrics) owners.add(origin.program); }
    native = Object.freeze({ nodes: Object.freeze(nodes), owners: Object.freeze([...owners]), placement: proof.to.placement });
  }
  const sampling = Object.freeze({ timeline: state.timeline, resources: state.resources,
    graphs: state.graphs.to, partitions: state.partitions.to, geos: state.geos.to,
    geoTexts: state.geoTexts.to, axisLabels: state.axisLabels.to });
  prepared.set(plan, Object.freeze({ state: sampling, groups: Object.freeze(groups), correspondence, native, empty: freezeOwned(Array(plan.to.scene.nodes.length).fill(null)),
    partitions: pairs.length ? Object.freeze({ state: partitions, pairs: freezeOwned(pairs), items: cloneAndFreeze(logicalItems) }) : undefined }));
}

export function samplePreparedBatch(plan, timeMs, progress) {
  const preparation = prepared.get(plan); if (preparation === undefined) return undefined;
  const state = preparation.state;
  const timeline = sampleTransitionTimeline(state.timeline, timeMs, progress), entries = [], positions = [];
  const width = interpolateNumber(plan.from.scene.width, plan.to.scene.width, progress), height = interpolateNumber(plan.from.scene.height, plan.to.scene.height, progress);
  let logical = 0;
  const partitionPairs = preparation.partitions === undefined ? undefined : [];
  for (const group of preparation.groups) {
    if (group.kind === 'path-run') {
      const at = timeline.progress(group.track.ownerKey), source = preparation.partitions;
      const sampled = partitionPairs[group.slot] ??= samplePartitionPairGroup(source.state, group.track.pair, progress, timeline.progress);
      const columns = { x: [], y: [], starts: [] };
      if (sampled.reason || !partitionAnimationOutlineColumns(sampled.group, group.itemKeys, columns)) return undefined;
      for (let row = 0; row < group.keys.length; row++) {
        const track = group.tracks[row], target = plan.to.scene.nodes[track.targetIndex], identity = plan.to.identities[track.targetIndex];
        // Current sampled rows retain their exact correspondence and native origin.
        if (track.targetIndex !== logical + row || target.key !== group.keys[row] || identity?.key !== group.decisions.itemKeys[row] || identity.role !== group.decisions.role ||
            preparation.native !== undefined && preparation.native.nodes[logical + row] === undefined) throw new TypeError('Batched sampled row differs from its exact native correspondence.');
      }
      logical += group.keys.length;
      const properties = freezeOwned({ x: createPathBatchColumn(columns.x, 'x'), y: createPathBatchColumn(columns.y, 'y'), starts: createPathBatchColumn(columns.starts, 'starts'),
        closed: true, appearance: freezeOwned({ ...group.appearance, ...sampleAnimationAppearance(group.track.appearance, at) }) });
      validateConcreteGraphicProperties('path-batch', properties);
      const placement = cloneAndFreeze(interpolateNodeFrame(group.from, group.to, at));
      entries.push(freezeOwned({ kind: 'path-run', keys: group.keys, topology: group.to.topology, ...placement, properties, decisions: group.decisions }));
      positions.push(freezeOwned({ kind: 'path-run' })); continue;
    }
    if (group.kind === 'single') {
      const node = group.track.kind === 'exact' ? group.to : blendAnimationNodes(group.from, group.to, progress, width, height);
      entries.push(freezeOwned({ kind: 'single', node, decision: group.decision }));
      positions.push(freezeOwned({ kind: 'single', value: freezeOwned({ reason: 'anonymous' }) })); logical++; continue;
    }
    const at = timeline.progress(group.track.ownerKey), x = samplePositionBatch(group.x, at), y = samplePositionBatch(group.y, at);
    if (x.kind !== 'position-batch' || y.kind !== 'position-batch') return undefined;
    const radius = createCircleBatchColumn(group.keys.length, row => {
      const track = group.tracks[row], target = plan.to.scene.nodes[track.targetIndex], source = plan.from.scene.nodes[track.sourceIndex], identity = plan.to.identities[track.targetIndex];
      // Current sampled rows retain their exact correspondence and native origin.
      if (track.targetIndex !== logical + row || target.key !== group.keys[row] || identity?.key !== group.decisions.itemKeys[row] || identity.role !== group.decisions.role ||
          preparation.native !== undefined && preparation.native.nodes[logical + row] === undefined) throw new TypeError('Batched sampled row differs from its exact native correspondence.');
      return interpolateNumber(source.properties.radius, target.properties.radius, at);
    });
    logical += radius.length;
    const properties = freezeOwned({ x: x.positions, y: y.positions, radius: freezeOwned(radius), appearance: freezeOwned({ ...group.appearance, ...sampleAnimationAppearance(group.track.appearance, at) }) });
    validateConcreteGraphicProperties('circle-batch', properties);
    const placement = cloneAndFreeze(interpolateNodeFrame(group.from, group.to, at));
    entries.push(freezeOwned({ kind: 'circle-run', keys: group.keys, topology: group.to.topology, ...placement, properties, decisions: group.decisions }));
    positions.push(freezeOwned({ kind: 'point-run', x: freezeOwned({ values: x.values, scale: x.scale }), y: freezeOwned({ values: y.values, scale: y.scale }) }));
  }
  validateGeneratedItemLimit(logical, 'Animation sampled nodes', animationResourceLimits(state.resources)?.maxOutputNodes);
  let partitions = state.partitions;
  if (partitionPairs !== undefined) {
    let work = 0;
    const groups = partitionPairs.map(sample => (validateWorkLimit(work += partitionAnimationGroupWork(sample.group), 'Partition animation frame work'), sample.group));
    partitions = freezeOwned({ groups: freezeOwned(groups), items: preparation.partitions.items });
  }
  const scene = freezeOwned({ version: 3, width, height, entries: freezeOwned(entries) });
  const sampled = freezeOwned({ graphicSpec: canvasSceneProgram(scene).graphicSpec, scene, progress });
  const endpoint = projectSampledAnimationEndpoint(sampled, plan.to.identities, plan.to.backgrounds, preparation.correspondence);
  return registerAnimationFrame(sampled, { plan, timeMs, positions: freezeOwned(positions),
    graphs: state.graphs, cartesian: preparation.empty, partitions, polars: preparation.empty,
    geos: state.geos, guides: preparation.empty, geotexts: state.geoTexts, axislabels: state.axisLabels,
    meaning: Object.freeze({ endpoint, native: preparation.native }) });
}
