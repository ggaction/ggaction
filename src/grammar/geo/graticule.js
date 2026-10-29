import { cloneAndFreeze } from "../../core/immutable.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { normalizeGraticule } from "./mark.js";

export function graticuleFeatures(input) {
  const { stepDeg, extentDeg: [minimum, maximum], precisionDeg } = normalizeGraticule(input);
  const features = []; let points = 0;
  for (const axis of [0, 1]) {
    const first = Math.ceil(minimum[axis] / stepDeg[axis]), last = Math.floor(maximum[axis] / stepDeg[axis]);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) throw new RangeError("Graticule tick indices must be safe integers.");
    validateGeneratedItemLimit(last - first + 1, "Graticule line count");
    const other = 1 - axis, count = Math.ceil((maximum[other] - minimum[other]) / precisionDeg);
    validateWorkLimit((last - first + 1) * (count + 1), "Graticule point work");
    for (let tick = first; tick <= last; tick++) {
      const value = tick * stepDeg[axis];
      if (axis === 0 && value === 180 && minimum[0] === -180) continue;
      const coordinates = Array.from({ length: count + 1 }, (_, index) => {
        const point = []; point[axis] = value; point[other] = minimum[other] + (maximum[other] - minimum[other]) * index / count; return point;
      });
      validateGeneratedItemLimit(points += coordinates.length, "Graticule point count");
      const name = axis === 0 ? "longitude" : "latitude";
      features.push({ key: encodeRowKey([name, value]), properties: { axis: name, value }, geometry: { type: "LineString", coordinates } });
    }
  }
  return cloneAndFreeze(features);
}
