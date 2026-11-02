import { cloneAndFreeze } from '../core/immutable.js';
import { animationSceneRows } from '../core/sceneRows.js';

export function equalBatchValue(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a), other = Object.keys(b);
  return keys.length === other.length && keys.every((key, index) => key === other[index] && equalBatchValue(a[key], b[key]));
}
const style = node => Object.fromEntries(Object.entries(node.properties).filter(([key]) => !['x', 'y', 'radius'].includes(key)));
const placement = node => ({ topology: node.topology, offset: node.offset, clip: node.clip, clips: node.clips });

// This builder consumes already sampled concrete rows. It never merges across a
// different paint, placement, exact scale, decision owner, or intervening node.
export function createBatchSceneBuilder(width, height) {
  const entries = [], positions = [];
  let current, currentPosition;
  function append(node, decision, position) {
    const eligible = node.type === 'circle' && position != null && !Object.hasOwn(position, 'reason') &&
      (decision === null || decision.kind === 'semantic-kernel' && decision.kernel === 'cartesian-point' && typeof decision.ownerKey === 'string');
    if (!eligible) {
      current = undefined; currentPosition = undefined;
      entries.push({ kind: 'single', node, decision }); positions.push({ kind: 'single', value: position }); return;
    }
    const appearance = style(node), frame = placement(node);
    if (current === undefined || current.keys.length === 10000 || !equalBatchValue(placement(current), frame) ||
        !equalBatchValue(current.properties.appearance, appearance) || !equalBatchValue(currentPosition.x.scale, position.x.scale) ||
        !equalBatchValue(currentPosition.y.scale, position.y.scale) || (current.decisions === null) !== (decision === null) ||
        decision !== null && (current.decisions.ownerKey !== decision.ownerKey || current.decisions.role !== decision.role)) {
      current = { kind: 'circle-run', keys: [], ...frame, properties: { x: [], y: [], radius: [], appearance },
        decisions: decision === null ? null : { kind: 'semantic-kernel', kernel: 'cartesian-point', ownerKey: decision.ownerKey,
          role: decision.role, sourceIndices: [], targetIndices: [], itemKeys: [] } };
      currentPosition = { kind: 'point-run', x: { values: [], scale: position.x.scale }, y: { values: [], scale: position.y.scale } };
      entries.push(current); positions.push(currentPosition);
    }
    current.keys.push(node.key); current.properties.x.push(node.properties.x); current.properties.y.push(node.properties.y); current.properties.radius.push(node.properties.radius);
    currentPosition.x.values.push(position.x.value); currentPosition.y.values.push(position.y.value);
    if (decision !== null) { current.decisions.sourceIndices.push(decision.sourceIndex); current.decisions.targetIndices.push(decision.targetIndex); current.decisions.itemKeys.push(decision.itemKey); }
  }
  return { append, finish() { return { scene: cloneAndFreeze({ version: 3, width, height, entries }), positions: cloneAndFreeze(positions) }; } };
}

// Private preparation may read completed rows into the existing track kernels.
// The public scene and graphicSpec remain complete batch representations.
export function projectBatchSceneRows(scene, positions) {
  const nodes = [], decisions = [], values = [];
  for (const row of animationSceneRows(scene)) {
    nodes.push(row.node);
    if (row.decision !== null) decisions.push(row.decision);
    const position = positions[row.entryIndex];
    values.push(position.kind === 'single' ? position.value : {
      x: { value: position.x.values[row.rowIndex], scale: position.x.scale },
      y: { value: position.y.values[row.rowIndex], scale: position.y.scale } });
  }
  return cloneAndFreeze({ scene: { version: 2, width: scene.width, height: scene.height, nodes }, decisions, positions: values });
}

export function batchPositionsForScene(scene, rows) {
  let index = 0;
  return cloneAndFreeze(scene.entries.map(entry => {
    if (entry.kind === 'single') return { kind: 'single', value: rows[index++] };
    const first = rows[index], x = [], y = [];
    for (let row = 0; row < entry.keys.length; row++) { const value = rows[index++];
      if (value == null || value.reason || !equalBatchValue(value.x.scale, first.x.scale) || !equalBatchValue(value.y.scale, first.y.scale)) throw new TypeError('Circle run positions require exact shared scales.');
      x.push(value.x.value); y.push(value.y.value);
    }
    return { kind: 'point-run', x: { values: x, scale: first.x.scale }, y: { values: y, scale: first.y.scale } };
  }));
}
