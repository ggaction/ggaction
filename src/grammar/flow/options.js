import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { graphLimits } from "../graph/model.js";

export function normalizeFlowLayout(method, input = {}) {
  if (!["dag", "cyclic"].includes(method)) throw new TypeError("Flow layout method must be dag or cyclic.");
  ownRecord(input, "Flow layout options");
  rejectUnknownProperties(input, ["width", "height", "nodeWidth", "nodePadding", "align", "order", "iterations", "laneGap", "orientation", "maxNodes", "maxEdges"], "flow layout");
  if (Object.values(input).some(value => value === undefined || value === null)) throw new TypeError("Flow layout options cannot contain null or undefined.");
  const options = { width: 600, height: 400, nodeWidth: 16, nodePadding: 8, align: "justify", order: "input", iterations: 6,
    laneGap: 8, orientation: "horizontal", ...input, ...graphLimits(Object.fromEntries(["maxNodes", "maxEdges"]
      .filter(key => Object.hasOwn(input, key)).map(key => [key, input[key]]))) };
  for (const field of ["width", "height", "nodeWidth"]) {
    if (!Number.isFinite(options[field]) || options[field] <= 0) throw new RangeError(`Flow ${field} must be positive and finite.`);
  }
  for (const field of ["nodePadding", "laneGap"]) {
    if (!Number.isFinite(options[field]) || options[field] < 0) throw new RangeError(`Flow ${field} must be nonnegative and finite.`);
  }
  if (!["horizontal", "vertical"].includes(options.orientation)) throw new TypeError("Flow orientation must be horizontal or vertical.");
  if (options.nodeWidth > options[options.orientation === "horizontal" ? "width" : "height"]) throw new RangeError("Flow nodeWidth cannot exceed its layout extent.");
  if (!["left", "right", "center", "justify"].includes(options.align)) throw new TypeError("Flow align must be left, right, center or justify.");
  if (Array.isArray(options.order)) {
    validateGeneratedItemLimit(options.order.length, "Flow node order", options.maxNodes);
    ownArray(options.order, "Flow node order");
    let work = options.order.length * 8;
    validateWorkLimit(work, "Flow order work");
    const keys = options.order.map(key => { const token = encodeRowKey(key); validateWorkLimit(work += token.length, "Flow order work"); return token; });
    if (new Set(keys).size !== keys.length) throw new TypeError("Flow node order requires unique typed keys.");
  } else if (!["input", "barycentric"].includes(options.order)) throw new TypeError("Flow order must be input, barycentric or an explicit typed key array.");
  if (!Number.isSafeInteger(options.iterations) || options.iterations < 0 || options.iterations > 1000) throw new RangeError("Flow iterations must be an integer from 0 through 1000.");
  return cloneAndFreeze({ method, options });
}
