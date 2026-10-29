import { validateWorkLimit } from "../../core/validation.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateBlendWeights } from "../weightedBlend.js";
import { validateGraphicClip, translateGraphicClip } from "./graphicClip.js";

const SOURCE_TYPES = new Set(["circle", "rect", "line", "text", "path", "image"]);
const KEYS = ["weight", "type", "properties", "offset", "clip", "clips"];
export function translateWeightedBlendSources(sources, dx, dy) {
  return sources.map(source => ({ ...source,
    offset: [source.offset[0] + dx, source.offset[1] + dy],
    clip: translateGraphicClip(source.clip, dx, dy),
    clips: source.clips.map(clip => translateGraphicClip(clip, dx, dy)) }));
}
function ownSourceData(sources) {
  const active = new WeakSet(), complete = new WeakSet(), pending = [{ value: sources, leave: false }];
  let work = 0;
  while (pending.length) {
    const { value, leave } = pending.pop();
    if (leave) { active.delete(value);complete.add(value);continue; }
    validateWorkLimit(++work, "Weighted blend validation work");
    if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw new TypeError("Weighted blend sources require plain serializable data.");
    if (value === null || typeof value !== "object" || complete.has(value)) continue;
    if (active.has(value)) throw new TypeError("Weighted blend sources cannot contain cycles.");
    if (Array.isArray(value)) ownArray(value, "Weighted blend source data");else ownRecord(value, "Weighted blend source data");
    active.add(value);pending.push({ value, leave: true });
    for (const child of Object.values(value)) pending.push({ value: child, leave: false });
  }
}
export function validateWeightedBlendSources(sources, validateProperties) {
  ownArray(sources, "Weighted blend sources");
  if (sources.length < 2 || sources.length > 64) throw new RangeError("Weighted blend requires 2..64 sources.");
  ownSourceData(sources);
  let clipCount = 0;
  for (const source of sources) {
    ownRecord(source, "Weighted blend source");
    if (Object.keys(source).length !== KEYS.length || KEYS.some(key => !Object.hasOwn(source, key))) throw new TypeError("Weighted blend source requires weight, type, properties, offset, clip and clips.");
    if (!SOURCE_TYPES.has(source.type)) throw new TypeError("Weighted blend sources must be ordinary primitive graphics; nested blends are not supported.");
    ownRecord(source.properties, "Weighted blend source properties");
    if (source.properties.blend !== undefined && source.properties.blend !== "normal") throw new TypeError("Weighted blend source backdrop mode belongs to the group.");
    validateProperties(source.type, source.properties);
    const required = source.type === "image" ? ["image", "x", "y", "width", "height"]
      : source.type === "text" ? ["x", "y", "text", "fontSize", "fontFamily", "textAlign", "textBaseline", "fill"]
        : source.type === "line" ? ["x1", "y1", "x2", "y2", "stroke", "strokeWidth"]
          : source.type === "path" ? ["commands", "fill", "stroke", "strokeWidth"]
            : [...(source.type === "circle" ? ["x", "y", "radius"] : ["x", "y", "width", "height"]), "fill", "stroke", "strokeWidth"];
    if (required.some(key => !Object.hasOwn(source.properties, key))) throw new TypeError("Weighted blend sources require fully materialized primitive properties.");
    ownArray(source.offset, "Weighted blend offset");
    if (source.offset.length !== 2 || !source.offset.every(Number.isFinite)) throw new TypeError("Weighted blend offset requires two finite numbers.");
    validateGraphicClip(source.clip, source.type);
    if (source.clip.type !== undefined) throw new TypeError("Weighted blend source requires a rectangular clip.");
    ownArray(source.clips, "Weighted blend clips");
    if (source.clips.length > 64 || (clipCount += source.clips.length) > 1024) throw new RangeError("Weighted blend clips exceed their budget.");
    for (const clip of source.clips) validateGraphicClip(clip, source.type);
  }
  validateBlendWeights(sources.map(source => source.weight));
  return sources;
}
