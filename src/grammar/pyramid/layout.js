import { cloneAndFreeze } from "../../core/immutable.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";

export function normalizePyramidOptions(input) {
  ownRecord(input, "Pyramid options");
  rejectUnknownProperties(input, ["width", "height", "gap", "orientation", "encoding", "lastStage", "taperRatio", "percentBase"], "pyramid");
  if (Object.values(input).some(value => value === undefined || value === null)) throw new TypeError("Pyramid options cannot contain null or undefined.");
  const options = { gap: 0, orientation: "down", encoding: "width", ...input };
  for (const field of ["width", "height"]) {
    if (!Number.isFinite(options[field]) || options[field] <= 0) throw new RangeError(`Pyramid ${field} must be positive and finite.`);
  }
  if (!Number.isFinite(options.gap) || options.gap < 0) throw new RangeError("Pyramid gap must be nonnegative and finite.");
  if (!["down", "up", "right", "left"].includes(options.orientation)) throw new TypeError("Pyramid orientation must be down, up, right or left.");
  if (!["width", "area"].includes(options.encoding)) throw new TypeError("Pyramid encoding must be width or area.");
  if (options.encoding === "width") {
    if (Object.hasOwn(input, "taperRatio")) throw new TypeError("Pyramid width encoding cannot specify taperRatio.");
    options.lastStage ??= "flat";
    if (!["flat", "point"].includes(options.lastStage)) throw new TypeError("Pyramid lastStage must be flat or point.");
  } else {
    if (Object.hasOwn(input, "lastStage")) throw new TypeError("Pyramid area encoding cannot specify lastStage.");
    options.taperRatio ??= .8;
    if (!Number.isFinite(options.taperRatio) || options.taperRatio < 0 || options.taperRatio > 1) throw new RangeError("Pyramid taperRatio must be between zero and one.");
  }
  if (options.percentBase !== undefined && !["first", "total", "previous"].includes(options.percentBase)) throw new TypeError("Pyramid percentBase must be first, total or previous.");
  return cloneAndFreeze(options);
}

function orient(cross, progress, options) {
  if (options.orientation === "down") return [cross, progress];
  if (options.orientation === "up") return [cross, options.height - progress];
  if (options.orientation === "right") return [progress, cross];
  return [options.width - progress, cross];
}

export function layoutPyramidStages(input, intent) {
  const options = normalizePyramidOptions(intent);
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, "Pyramid stage count");
  ownArray(input, "Pyramid stages");
  let work = input.length * 64;
  validateWorkLimit(work, "Pyramid layout work");
  const keys = new Set();
  const items = input.map(item => {
    ownRecord(item, "Pyramid stage");
    rejectUnknownProperties(item, ["key", "value"], "pyramid stage");
    const key = encodeRowKey(item.key);
    validateWorkLimit(work += key.length, "Pyramid layout work");
    if (keys.has(key)) throw new TypeError("Pyramid stage keys must be unique.");
    keys.add(key);
    if (!Number.isFinite(item.value) || item.value < 0) throw new RangeError("Pyramid stage values must be nonnegative and finite.");
    return item;
  });
  const horizontal = options.orientation === "left" || options.orientation === "right";
  const breadth = horizontal ? options.height : options.width, length = horizontal ? options.width : options.height;
  const gaps = options.gap * Math.max(0, items.length - 1);
  if (!Number.isFinite(gaps) || gaps > length) throw new RangeError("Pyramid gaps exceed the available stage extent.");
  const stageLength = items.length ? (length - gaps) / items.length : 0;
  const maximum = items.reduce((value, item) => Math.max(value, item.value), 0);
  const scaledTotal = maximum ? items.reduce((sum, item) => sum + item.value / maximum, 0) : 0;
  const stages = items.map((item, index) => {
    const topWidth = maximum ? breadth * (item.value / maximum) : 0;
    const bottomWidth = options.encoding === "area" ? topWidth * options.taperRatio :
      index + 1 < items.length ? (maximum ? breadth * (items[index + 1].value / maximum) : 0) : options.lastStage === "point" ? 0 : topWidth;
    const start = index * (stageLength + options.gap), end = index === items.length - 1 ? length : start + stageLength;
    const points = [[breadth / 2 - topWidth / 2, start], [breadth / 2 + topWidth / 2, start],
      [breadth / 2 + bottomWidth / 2, end], [breadth / 2 - bottomWidth / 2, end]].map(([cross, progress]) => orient(cross, progress, options));
    const denominator = options.percentBase === "total" ? scaledTotal : options.percentBase === "first" ? items[0].value : index ? items[index - 1].value : null;
    const percent = options.percentBase === undefined || !denominator ? null : options.percentBase === "total" ? (item.value / maximum) / denominator : item.value / denominator;
    const area = (topWidth / 2 + bottomWidth / 2) * stageLength;
    if (!Number.isFinite(area) || (percent !== null && !Number.isFinite(percent)) || points.some(point => point.some(value => !Number.isFinite(value)))) throw new RangeError("Pyramid geometry and ratios must remain finite.");
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    return { key: item.key, value: item.value, sourceIndex: index, topWidth, bottomWidth, stageLength, area, percent, points,
      bounds: { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) } };
  });
  return cloneAndFreeze({ algorithm: "stage-trapezoids@1", options, stages });
}
