import { ownArray, ownRecord } from "../core/ownData.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";
import { normalizeScreenPolygon } from "./selectionRegion.js";
import { buildLinearPathCommands } from "./pathCommands.js";
import { pathFillContains, segmentDistance } from "./pathGeometry.js";
import { transformHitPoint } from "./hitCoordinates.js";

const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);

// The caller supplies current-frame anchors in the same CSS-local coordinate
// space as the polygon. Only keys acquire persistent selection meaning.
export function selectScreenPolygonKeys(items, input) {
  const polygon = normalizeScreenPolygon(input);
  let work = polygon.length;
  const spend = count => validateWorkLimit(work += count, "Screen polygon work");
  if (!Array.isArray(items)) throw new TypeError("Screen polygon items require an array.");
  validateGeneratedItemLimit(items.length, "Screen polygon items", 50_000);
  ownArray(items, "Screen polygon items");
  for (let index = 0; index < polygon.length; index++) segmentDistance(polygon[index], polygon[index], polygon[(index + 1) % polygon.length]);
  spend(items.length * (polygon.length + 1));
  const commands = polygon.length < 3 ? null : buildLinearPathCommands(polygon, { close: true });
  const keys = new Set(), selected = [];
  for (const item of items) {
    ownRecord(item, "Screen polygon item");
    if (!Object.hasOwn(item, "key") || typeof item.key !== "string" || !item.key.length || keys.has(item.key) || !Object.hasOwn(item, "point")) {
      throw new TypeError("Screen polygon items require unique logical keys and explicit points.");
    }
    spend(item.key.length); keys.add(item.key);
    const point = transformHitPoint(IDENTITY, item.point);
    if (commands && pathFillContains(commands, point, { fillRule: "evenodd" })) selected.push(item.key);
  }
  return cloneAndFreeze({ polygon, keys: selected });
}
