import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateOptionObject } from "../../core/validation.js";
import { findLayer } from "../../selectors/layers.js";
import { resolveFacadeId, validateFacadeOptions } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "x", "y", "color", "size", "shape",
  "point", "packing", "guides"
]);
const PACKING_OPTIONS = Object.freeze(["maxOffset", "padding", "key", "overflow"]);

function ownerScale(value, id, label) {
  if (typeof value === "string") return { field: value, scale: { id } };
  if (!isPlainObject(value)) return value;
  if (value.scale !== undefined && !isPlainObject(value.scale)) {
    throw new TypeError(`${label}.scale must be a plain object.`);
  }
  return {
    ...value,
    scale: { ...(value.scale ?? {}), id: value.scale?.id ?? id }
  };
}

function normalizePacking(value, operation) {
  if (value === false) return false;
  const packing = value ?? {};
  validateOptionObject(packing, PACKING_OPTIONS, `${operation} packing`);
  return { ...packing };
}

export const createBeeswarmPlot = action(
  {
    op: "createBeeswarmPlot",
    description: "Create a Point plot packed within categorical slots."
  },
  function (args = {}) {
    const operation = "createBeeswarmPlot";
    validateFacadeOptions(args, OPTIONS, operation);
    if (args.x === undefined || args.y === undefined) {
      throw new Error(`${operation} requires x and y.`);
    }
    const id = resolveFacadeId(this, args.id, {
      defaultId: "beeswarmPlot",
      operation
    });
    const packing = normalizePacking(args.packing, operation);
    let next = this.createStripPlot({
      id,
      ...(args.data === undefined ? {} : { data: args.data }),
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
      x: ownerScale(args.x, `${id}X`, `${operation} x`),
      y: ownerScale(args.y, `${id}Y`, `${operation} y`),
      ...(args.color === undefined ? {} : { color: args.color }),
      ...(args.size === undefined ? {} : { size: args.size }),
      ...(args.shape === undefined ? {} : { shape: args.shape }),
      ...(args.point === undefined ? {} : { point: args.point }),
      ...(args.guides === undefined ? {} : { guides: args.guides })
    });
    if (packing === false) return next;
    const layer = findLayer(next, id);
    const categoryChannel = ["x", "y"].find(channel =>
      ["nominal", "ordinal"].includes(layer?.encoding?.[channel]?.fieldType)
    );
    if (categoryChannel === undefined) {
      throw new Error(`${operation} requires exactly one categorical position.`);
    }
    return next.packPoints({ target: id, channel: categoryChannel, ...packing });
  }
);
