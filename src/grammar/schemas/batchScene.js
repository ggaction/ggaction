import { ownArray, ownRecord } from '../../core/ownData.js';
import { rejectUnknownProperties, validateGeneratedItemLimit } from '../../core/validation.js';

function closed(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every declared field.`);
}

// Structural checks precede compiler geometry validation and retained semantic
// checks. All arrays are own dense data, including the embedded decision table.
export function validateBatchSceneStructure(scene, positions, maximum = 10000) {
  closed(scene, ['version', 'width', 'height', 'entries'], 'Batched scene');
  if (scene.version !== 3) throw new TypeError('Batched scenes require version 3.');
  ownArray(scene.entries, 'Batched scene entries');
  if (positions !== undefined) { ownArray(positions, 'Batched positions'); if (positions.length !== scene.entries.length) throw new TypeError('Batched positions must follow entries.'); }
  let count = 0;
  for (let index = 0; index < scene.entries.length; index++) {
    const entry = scene.entries[index]; ownRecord(entry, 'Batched entry');
    const position = positions?.[index];
    if (entry.kind === 'single') {
      closed(entry, ['kind', 'node', 'decision'], 'Batched single');
      if (entry.decision !== null) ownRecord(entry.decision, 'Batched single decision');
      if (position !== undefined) { closed(position, ['kind', 'value'], 'Batched single position'); if (position.kind !== 'single') throw new TypeError('Single entries require single positions.'); }
      count++;
    } else if (entry.kind === 'circle-run') {
      closed(entry, ['kind', 'keys', 'topology', 'offset', 'clip', 'clips', 'properties', 'decisions'], 'Circle run');
      ownArray(entry.keys, 'Circle run keys');
      if (!entry.keys.length || entry.keys.length > 10000 || entry.keys.some(key => typeof key !== 'string')) throw new TypeError('Circle runs require 1..10000 string keys.');
      if (entry.decisions !== null) {
        closed(entry.decisions, ['kind', 'kernel', 'ownerKey', 'role', 'sourceIndices', 'targetIndices', 'itemKeys'], 'Circle run decisions');
        if (entry.decisions.kind !== 'semantic-kernel' || entry.decisions.kernel !== 'cartesian-point' || typeof entry.decisions.ownerKey !== 'string' || typeof entry.decisions.role !== 'string') throw new TypeError('Circle runs require point decisions.');
        for (const key of ['sourceIndices', 'targetIndices', 'itemKeys']) {
          ownArray(entry.decisions[key], `Circle run ${key}`);
          if (entry.decisions[key].length !== entry.keys.length) throw new TypeError('Circle run decisions must follow every row.');
        }
      }
      if (position !== undefined) {
        closed(position, ['kind', 'x', 'y'], 'Point run position');
        if (position.kind !== 'point-run') throw new TypeError('Circle runs require point positions.');
        for (const key of ['x', 'y']) { closed(position[key], ['values', 'scale'], 'Point run channel'); ownArray(position[key].values, 'Point run values');
          if (position[key].values.length !== entry.keys.length || !position[key].values.every(Number.isFinite)) throw new TypeError('Point run values must follow every finite row.'); }
      }
      count += entry.keys.length;
    } else throw new TypeError('Unknown batched scene entry.');
    validateGeneratedItemLimit(count, 'Animation sampled nodes', maximum);
  }
  return count;
}

