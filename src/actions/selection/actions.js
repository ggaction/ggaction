import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import { validatePointShape } from "../../grammar/pointShapes.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { transformPointHighlightChild } from "../../materialization/selection/point.js";
import {
  resolveMarkSelection,
  resolveSelectionCreationId,
  resolveStoredSelection
} from "../../materialization/selection/state.js";

const SELECTOR_KEYS = Object.freeze([
  "grain", "field", "channel", "property", "op", "value", "values", "min", "max",
  "inclusive", "count", "groupBy", "ties"
]);
const SELECT_OPTIONS = Object.freeze(["id", "target", ...SELECTOR_KEYS]);
const HIGHLIGHT_OPTIONS = Object.freeze([
  "id", "target", "select", "selection", "color", "opacity", "fill",
  "stroke", "strokeWidth", "strokeDash", "shape", "size", "offset",
  "dimOthers", "bringToFront"
]);
const INTERNAL_SELECTION_OPTIONS = Object.freeze(["selection", "style", "keys"]);
const INTERNAL_DIM_OPTIONS = Object.freeze(["selection", "opacity", "keys"]);
const INTERNAL_ORDER_OPTIONS = Object.freeze(["selection", "keys"]);
const REMATERIALIZE_OPTIONS = Object.freeze(["target", "highlights"]);
const SUPPORTED_MARKS = new Set(["point", "bar", "line", "area", "rule"]);
const DEFAULT_POINT_SIZE = 2;
const DEFAULT_DIM_OPACITY = 0.25;

function selectorFrom(args) {
  return Object.fromEntries(
    SELECTOR_KEYS.flatMap(key => Object.hasOwn(args, key) ? [[key, args[key]]] : [])
  );
}

function resolveTarget(program, target, label = "mark selection") {
  const requested = target === undefined
    ? undefined
    : validateUserId(target, "Mark id");
  return resolveEligibleLayer(program, {
    target: requested,
    label,
    predicate: layer => SUPPORTED_MARKS.has(layer.mark?.type)
  });
}

function validateUnitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be between 0 and 1.`);
  }
  return value;
}

function validatePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
  return value;
}

function validateNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
  return value;
}

function validateColor(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function normalizeOffset(offset) {
  if (offset === undefined) return { x: 0, y: 0 };
  if (!isPlainObject(offset)) {
    throw new TypeError("Highlight offset must be a plain object.");
  }
  validateKeys(offset, ["x", "y"], "highlight offset");
  const x = offset.x ?? 0;
  const y = offset.y ?? 0;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError("Highlight offset x and y must be finite numbers.");
  }
  return { x, y };
}

function normalizeDimOthers(dimOthers) {
  if (dimOthers === undefined || dimOthers === false) return false;
  if (dimOthers === true) return { opacity: DEFAULT_DIM_OPACITY };
  if (!isPlainObject(dimOthers)) {
    throw new TypeError("Highlight dimOthers must be a boolean or plain object.");
  }
  validateKeys(dimOthers, ["opacity"], "highlight dimOthers");
  return {
    opacity: validateUnitInterval(
      dimOthers.opacity ?? DEFAULT_DIM_OPACITY,
      "Highlight dim opacity"
    )
  };
}

function normalizePointStyle(args) {
  if (args.color !== undefined && args.fill !== undefined) {
    throw new Error("Point highlight accepts color or fill, not both.");
  }
  if (args.strokeDash !== undefined) {
    throw new Error("Point highlight does not support strokeDash.");
  }
  const fill = validateColor(
    args.fill ?? args.color ?? DEFAULT_COLORS.highlight,
    "Point highlight fill"
  );
  const opacity = args.opacity === undefined
    ? undefined
    : validateUnitInterval(args.opacity, "Point highlight opacity");
  const stroke = args.stroke === undefined
    ? undefined
    : validateColor(args.stroke, "Point highlight stroke");
  const strokeWidth = args.strokeWidth === undefined
    ? undefined
    : validateNonNegative(args.strokeWidth, "Point highlight strokeWidth");
  if (strokeWidth !== undefined && stroke === undefined) {
    throw new Error("Point highlight strokeWidth requires stroke.");
  }
  return {
    fill,
    ...(opacity === undefined ? {} : { opacity }),
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth }),
    ...(args.shape === undefined ? {} : { shape: validatePointShape(args.shape) }),
    size: args.size === undefined
      ? DEFAULT_POINT_SIZE
      : validatePositive(args.size, "Point highlight size"),
    offset: normalizeOffset(args.offset)
  };
}

function normalizeBarStyle(args) {
  for (const option of ["shape", "size", "offset", "strokeDash"]) {
    if (args[option] !== undefined) {
      throw new Error(`Bar highlight does not support ${option}.`);
    }
  }
  if (args.color !== undefined && args.fill !== undefined) {
    throw new Error("Bar highlight accepts color or fill, not both.");
  }
  const fill = validateColor(
    args.fill ?? args.color ?? DEFAULT_COLORS.highlight,
    "Bar highlight fill"
  );
  const opacity = args.opacity === undefined
    ? undefined
    : validateUnitInterval(args.opacity, "Bar highlight opacity");
  const stroke = args.stroke === undefined
    ? undefined
    : validateColor(args.stroke, "Bar highlight stroke");
  const strokeWidth = args.strokeWidth === undefined
    ? undefined
    : validateNonNegative(args.strokeWidth, "Bar highlight strokeWidth");
  if (strokeWidth !== undefined && stroke === undefined) {
    throw new Error("Bar highlight strokeWidth requires stroke.");
  }
  return {
    fill,
    ...(opacity === undefined ? {} : { opacity }),
    ...(stroke === undefined ? {} : { stroke }),
    ...(strokeWidth === undefined ? {} : { strokeWidth })
  };
}

function normalizeHighlightStyle(args, markType) {
  if (markType === "point") return normalizePointStyle(args);
  if (markType === "bar") return normalizeBarStyle(args);
  throw new Error("highlightMarks currently supports point and bar marks.");
}

function selectedKeys(args, resolved) {
  if (args.keys === undefined) return resolved.keys;
  if (!Array.isArray(args.keys) || !args.keys.every(key =>
    typeof key === "string" && key.length > 0
  )) {
    throw new TypeError("Selected mark item keys must be non-empty strings.");
  }
  return args.keys;
}

export const selectMarks = action(
  { op: "selectMarks", description: "Create one reusable selection over final mark items." },
  function (args = {}) {
    validateKeys(args, SELECT_OPTIONS, "selectMarks");
    const layer = resolveTarget(this, args.target);
    const resolved = resolveMarkSelection(this, layer.id, selectorFrom(args));
    const id = resolveSelectionCreationId(this, args.id, layer.id);
    return this
      ._withSelectionConfig(id, { target: layer.id, selector: resolved.selector })
      ._withContext({ currentSelection: id });
  }
);

export const applyPointHighlight = action(
  { op: "applyPointHighlight", description: "Apply selected point appearance and geometry." },
  function (args = {}) {
    validateKeys(args, INTERNAL_SELECTION_OPTIONS, "applyPointHighlight");
    const resolved = resolveStoredSelection(this, args.selection);
    const keys = selectedKeys(args, resolved);
    if (resolved.items[0]?.markType !== "point" && resolved.items.length > 0) {
      throw new Error("applyPointHighlight requires a point selection.");
    }
    if (keys.length === 0) return this;
    const selected = new Set(keys);
    const graphic = this.graphicSpec.objects[resolved.definition.target];
    const keyByGraphic = new Map(resolved.items.flatMap(item =>
      item.graphicIds.map(id => [id, item.key])
    ));
    const children = graphic.children.map(child =>
      selected.has(keyByGraphic.get(child.id))
        ? transformPointHighlightChild({
            type: child.type ?? graphic.type,
            properties: child.properties
          }, args.style)
        : { type: child.type ?? graphic.type, properties: child.properties }
    );
    return this.editGraphics({
      target: resolved.definition.target,
      property: "children",
      value: children
    });
  }
);

export const applyBarHighlight = action(
  { op: "applyBarHighlight", description: "Apply selected bar appearance." },
  function (args = {}) {
    validateKeys(args, INTERNAL_SELECTION_OPTIONS, "applyBarHighlight");
    const resolved = resolveStoredSelection(this, args.selection);
    const keys = selectedKeys(args, resolved);
    if (resolved.items[0]?.markType !== "bar" && resolved.items.length > 0) {
      throw new Error("applyBarHighlight requires a bar selection.");
    }
    if (keys.length === 0) return this;
    const selected = new Set(keys);
    const graphic = this.graphicSpec.objects[resolved.definition.target];
    const keyByGraphic = new Map(resolved.items.flatMap(item =>
      item.graphicIds.map(id => [id, item.key])
    ));
    return this.editGraphics({
      target: resolved.definition.target,
      property: "children",
      value: graphic.children.map(child => ({
        type: child.type ?? graphic.type,
        properties: selected.has(keyByGraphic.get(child.id))
          ? { ...child.properties, ...args.style }
          : child.properties
      }))
    });
  }
);

export const dimUnselectedMarkItems = action(
  { op: "dimUnselectedMarkItems", description: "Dim the complement of one mark selection." },
  function (args = {}) {
    validateKeys(args, INTERNAL_DIM_OPTIONS, "dimUnselectedMarkItems");
    const opacity = validateUnitInterval(args.opacity, "Dim opacity");
    const resolved = resolveStoredSelection(this, args.selection);
    const selected = new Set(selectedKeys(args, resolved));
    const graphic = this.graphicSpec.objects[resolved.definition.target];
    const keyByGraphic = new Map(resolved.items.flatMap(item =>
      item.graphicIds.map(id => [id, item.key])
    ));
    return this.editGraphics({
      target: resolved.definition.target,
      property: "children",
      value: graphic.children.map(child => ({
        type: child.type ?? graphic.type,
        properties: selected.has(keyByGraphic.get(child.id))
          ? child.properties
          : { ...child.properties, opacity }
      }))
    });
  }
);

export const placeSelectedMarkItemsLast = action(
  { op: "placeSelectedMarkItemsLast", description: "Place selected collection children after their complement." },
  function (args = {}) {
    validateKeys(args, INTERNAL_ORDER_OPTIONS, "placeSelectedMarkItemsLast");
    const resolved = resolveStoredSelection(this, args.selection);
    const keys = selectedKeys(args, resolved);
    if (keys.length === 0 || keys.length === resolved.items.length) {
      return this;
    }
    const selected = new Set(keys);
    const graphic = this.graphicSpec.objects[resolved.definition.target];
    const keyByGraphic = new Map(resolved.items.flatMap(item =>
      item.graphicIds.map(id => [id, item.key])
    ));
    const children = graphic.children.map(child => ({
      key: keyByGraphic.get(child.id),
      child: { type: child.type ?? graphic.type, properties: child.properties }
    }));
    return this.editGraphics({
      target: resolved.definition.target,
      property: "children",
      value: [
        ...children.filter(item => !selected.has(item.key)),
        ...children.filter(item => selected.has(item.key))
      ].map(item => item.child)
    });
  }
);

export const rematerializeMarkHighlights = action(
  { op: "rematerializeMarkHighlights", description: "Reapply stored highlight assignments to one rematerialized mark." },
  function (args = {}) {
    validateKeys(args, REMATERIALIZE_OPTIONS, "rematerializeMarkHighlights");
    validateUserId(args.target, "Highlight target id");
    if (!Array.isArray(args.highlights)) {
      throw new TypeError("rematerializeMarkHighlights requires highlight entries.");
    }
    const prepared = args.highlights.map(([id, config]) => ({
      id,
      config,
      keys: resolveStoredSelection(this, config.selection).keys
    }));
    let next = this;
    for (const { id, config, keys } of prepared) {
      next = config.markType === "bar"
        ? next.applyBarHighlight({
            selection: config.selection,
            style: config.style,
            keys
          })
        : next.applyPointHighlight({
            selection: config.selection,
            style: config.style,
            keys
          });
      if (config.dimOthers !== false) {
        next = next.dimUnselectedMarkItems({
          selection: config.selection,
          opacity: config.dimOthers.opacity,
          keys
        });
      }
      if (config.bringToFront) {
        next = next.placeSelectedMarkItemsLast({
          selection: config.selection,
          keys
        });
      }
      next = next._withHighlightConfig(id, config);
    }
    return next;
  }
);

export const highlightMarks = action(
  { op: "highlightMarks", description: "Select and emphasize final visual mark items." },
  function (args = {}) {
    validateKeys(args, HIGHLIGHT_OPTIONS, "highlightMarks");
    if (args.select !== undefined && args.selection !== undefined) {
      throw new Error("highlightMarks accepts select or selection, not both.");
    }
    if (args.select !== undefined && !isPlainObject(args.select)) {
      throw new TypeError("highlightMarks select must be a plain object.");
    }
    if (args.id !== undefined && args.select === undefined) {
      throw new Error("highlightMarks id is available only with inline select.");
    }
    const dimOthers = normalizeDimOthers(args.dimOthers);
    const bringToFront = args.bringToFront ?? true;
    if (typeof bringToFront !== "boolean") {
      throw new TypeError("highlightMarks bringToFront must be a boolean.");
    }

    let next = this;
    let resolved;
    let layer;
    if (args.select !== undefined) {
      layer = resolveTarget(this, args.target, "highlight mark");
      resolveMarkSelection(this, layer.id, args.select);
      const style = normalizeHighlightStyle(args, layer.mark.type);
      next = next.selectMarks({
        ...(args.id === undefined ? {} : { id: args.id }),
        target: layer.id,
        ...args.select
      });
      resolved = resolveStoredSelection(next);
      resolved = { ...resolved, style };
    } else {
      resolved = resolveStoredSelection(next, args.selection);
      if (args.target !== undefined && args.target !== resolved.definition.target) {
        throw new Error("highlightMarks target must match its selection target.");
      }
      layer = resolveTarget(next, resolved.definition.target, "highlight mark");
      resolved = {
        ...resolved,
        style: normalizeHighlightStyle(args, layer.mark.type)
      };
    }

    const selection = resolved.id;
    const keys = resolved.keys;
    const style = resolved.style;
    const existing = next.materializationConfigs.highlights?.[selection];
    if (existing !== undefined) {
      next = next._withoutMaterializationConfig(["highlights", selection]);
      next = layer.mark.type === "bar"
        ? next.rematerializeBarMark({ id: resolved.definition.target })
        : next.rematerializePointMark({ id: resolved.definition.target });
    }
    next = layer.mark.type === "bar"
      ? next.applyBarHighlight({ selection, style, keys })
      : next.applyPointHighlight({ selection, style, keys });
    if (dimOthers !== false) {
      next = next.dimUnselectedMarkItems({
        selection,
        opacity: dimOthers.opacity,
        keys
      });
    }
    if (bringToFront) {
      next = next.placeSelectedMarkItemsLast({ selection, keys });
    }
    return next._withHighlightConfig(selection, {
      target: resolved.definition.target,
      selection,
      markType: layer.mark.type,
      style,
      dimOthers,
      bringToFront
    });
  }
);
