import { isOwned } from '../../core/immutable.js';
import { render } from './index.js';

const compiled = new WeakMap();
// Translate only concrete position properties. Path/text child coordinates keep
// their authored relationship; gradients retain their local bounding-box units.
function position(properties, dx, dy) {
  if (!dx && !dy) return properties;
  const result = { ...properties };
  for (const key of ['x', 'x1', 'x2']) if (key in result) result[key] += dx;
  for (const key of ['y', 'y1', 'y2']) if (key in result) result[key] += dy;
  if (result.commands) result.commands = result.commands.map(command => position(command, dx, dy));
  return result;
}
function compile(scene) {
  if (scene?.version !== 2 || ![scene.width, scene.height].every(n => Number.isFinite(n) && n > 0) || !Array.isArray(scene.nodes)) {
    throw new TypeError('renderTransitionScene requires a version 2 Canvas scene.');
  }
  const objects = { canvas: { type: 'canvas', properties: { width: scene.width, height: scene.height }, children: [] } };
  const keys = new Set();
  let clipKey, group, index = 0;
  for (const node of scene.nodes) {
    if (typeof node.key !== 'string' || keys.has(node.key) || !['circle','rect','line','path','text'].includes(node.type) ||
        node.offset?.length !== 2 || node.clip?.length !== 4 || ![...node.offset,...node.clip].every(Number.isFinite) ||
        node.clip[2] < 0 || node.clip[3] < 0 || !node.properties || typeof node.properties !== 'object') {
      throw new TypeError('Canvas scene nodes require unique keys, concrete properties, offsets and clips.');
    }
    keys.add(node.key);
    const key = node.clip.join(':');
    if (key !== clipKey) {
      clipKey = key; const id = `clip-${index++}`;
      group = objects[id] = { type: 'canvas', properties: {
        x: node.clip[0], y: node.clip[1], width: node.clip[2], height: node.clip[3]
      }, children: [] };
      objects.canvas.children.push(id);
    }
    const id = `node-${index++}`;
    objects[id] = { type: node.type, properties: position(node.properties,
      node.offset[0] - node.clip[0], node.offset[1] - node.clip[1]) };
    group.children.push(id);
  }
  return { graphicSpec: { objects, order: ['canvas'] } };
}
/** Paint concrete Canvas scenes with the ordinary renderer; no semantics or DOM. */
export function renderTransitionScene(scene, context, options) {
  // Only immutable producer scenes are cacheable. Intermediate animation frames
  // may be reused/mutated by a caller and must always reflect their current data.
  let program = isOwned(scene) ? compiled.get(scene) : undefined;
  if (!program) {
    program = compile(scene);
    if (isOwned(scene)) compiled.set(scene, program);
  }
  return render(program, context, options);
}
