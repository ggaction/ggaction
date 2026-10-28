import { validateGraphicClip, translateGraphicClip } from "../grammar/schemas/graphicClip.js";
import { isOwned, cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { contentDigest } from "../core/contentDigest.js";

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
  const validFrame = clip => {
    if (Array.isArray(clip)) return validClip(clip);
    if (clip?.type !== "path") return false;
    validateGraphicClip(clip, "collection");
    return true;
  };
  const sameClip = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  for (const node of scene.nodes) {
    const clips = node.clips ?? [node.clip];
    if (typeof node.key !== 'string' || keys.has(node.key) || !['circle','rect','line','path','text','image'].includes(node.type) ||
        node.offset?.length !== 2 || !node.offset.every(Number.isFinite) || !validClip(node.clip) ||
        !Array.isArray(clips) || !clips.every(validFrame) || !node.properties || typeof node.properties !== 'object') {
      throw new TypeError('Canvas scene nodes require unique keys, concrete properties, offsets and clips.');
    }
    keys.add(node.key);
    let common = 0;
    while (common < Math.min(clips.length, activeClips.length) &&
        sameClip(clips[common], activeClips[common])) common++;
    groups.length = common + 1; origins.length = common + 1;
    // Retain shared concrete clip ancestors across adjacent nodes. Rebuilding
    // a fractional ancestor between its children can change raster coverage.
    for (let i = common; i < clips.length; i++) {
      const clip = clips[i], origin = origins.at(-1), parent = groups.at(-1);
      const id = `clip-${index++}`;
      const pathClip = clip.type === "path";
      const nested = objects[id] = pathClip ? { type: "collection", items: [],
        clip: translateGraphicClip(clip, -origin[0], -origin[1]), children: [] }
        : { type: 'canvas', properties: {
          x: clip[0] - origin[0], y: clip[1] - origin[1], width: clip[2], height: clip[3]
        }, children: [] };
      parent.children.push(id); groups.push(nested); origins.push(pathClip ? origin : [clip[0], clip[1]]);
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

function snapshotSignature(scene) {
  const pending = [scene], seen = new WeakSet();
  while (pending.length) {
    const value = pending.pop();
    if (value === null || typeof value !== "object") continue;
    if (seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) ownArray(value, "Canvas scene"); else ownRecord(value, "Canvas scene");
    pending.push(...Object.values(value));
  }
  return contentDigest(JSON.stringify(scene));
}

// One concrete compiler is shared by scene preparation and scene drawing.
// Caller-owned mutable frames reuse a prepared instance only while their exact
// content remains unchanged; changing any field creates a distinct graphicSpec.
export function canvasSceneProgram(scene) {
  const signature = isOwned(scene) ? undefined : snapshotSignature(scene);
  const previous = compiled.get(scene);
  if (previous !== undefined && previous.signature === signature) return previous.program;
  const program = cloneAndFreeze(compile(scene));
  compiled.set(scene, { signature, program });
  return program;
}
