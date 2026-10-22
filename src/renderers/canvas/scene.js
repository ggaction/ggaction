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
  let index = 0, activeClips = [];
  const groups = [objects.canvas], origins = [[0, 0]];
  const validClip = clip => Array.isArray(clip) && clip.length === 4 &&
    clip.every(Number.isFinite) && clip[2] >= 0 && clip[3] >= 0;
  for (const node of scene.nodes) {
    const clips = node.clips ?? [node.clip];
    if (typeof node.key !== 'string' || keys.has(node.key) || !['circle','rect','line','path','text'].includes(node.type) ||
        node.offset?.length !== 2 || !node.offset.every(Number.isFinite) || !validClip(node.clip) ||
        !Array.isArray(clips) || !clips.every(validClip) || !node.properties || typeof node.properties !== 'object') {
      throw new TypeError('Canvas scene nodes require unique keys, concrete properties, offsets and clips.');
    }
    keys.add(node.key);
    let common = 0;
    while (common < Math.min(clips.length, activeClips.length) &&
        clips[common].every((value, i) => value === activeClips[common][i])) common++;
    groups.length = common + 1; origins.length = common + 1;
    // Retain shared concrete clip ancestors across adjacent nodes. Rebuilding
    // a fractional ancestor between its children can change raster coverage.
    for (let i = common; i < clips.length; i++) {
      const clip = clips[i], origin = origins.at(-1), parent = groups.at(-1);
      const id = `clip-${index++}`;
      const nested = objects[id] = { type: 'canvas', properties: {
        x: clip[0] - origin[0], y: clip[1] - origin[1], width: clip[2], height: clip[3]
      }, children: [] };
      parent.children.push(id); groups.push(nested); origins.push([clip[0], clip[1]]);
    }
    activeClips = clips;
    const group = groups.at(-1), origin = origins.at(-1);
    const id = `node-${index++}`;
    objects[id] = { type: node.type, properties: position(node.properties,
      node.offset[0] - origin[0], node.offset[1] - origin[1]) };
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
