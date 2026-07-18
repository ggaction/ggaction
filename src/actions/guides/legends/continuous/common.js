import { isPlainObject } from "../../../../core/immutable.js";
import {
  validateKeys,
  validateOptionObject,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite
} from "../../../../core/validation.js";
import { formatTimeTick } from "../../../../grammar/ticks.js";
import { resolveGraphicBounds } from "../../../../layout/canvas.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../../theme/defaults.js";
import { findLayer } from "../../../../selectors/layers.js";
import { findCanvasGraphic } from
  "../../../../materialization/graphicHierarchy.js";

const OPTIONS = Object.freeze([
  "target", "channels", "position", "align", "offset", "title", "count",
  "gradient", "symbol", "labels", "titleStyle", "itemGap", "border",
  "direction", "columns", "titlePosition"
]);
const TEXT_OPTIONS = Object.freeze([
  "offset", "color", "fontSize", "fontFamily", "fontWeight"
]);
const BORDER_OPTIONS = Object.freeze([
  "color", "lineWidth", "padding", "background"
]);
const POSITIONS = Object.freeze(["right", "left", "top", "bottom"]);
const DEFAULT_LABELS = Object.freeze({
  offset: 12,
  color: DEFAULT_COLORS.text,
  fontSize: 12,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: "normal"
});
const DEFAULT_TITLE = Object.freeze({
  color: DEFAULT_COLORS.text,
  fontSize: 13,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: 600
});
const DEFAULT_BORDER = Object.freeze({
  color: DEFAULT_COLORS.border,
  lineWidth: 1,
  padding: 12,
  background: "transparent"
});

export const validatePositive = validatePositiveFinite;
export const validateNonNegative = validateNonNegativeFinite;

function validateTextOptions(value, label, defaults) {
  if (value === undefined) return { ...defaults };
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  validateKeys(value, TEXT_OPTIONS, label);
  const result = { ...defaults, ...value };
  if (Object.hasOwn(result, "offset")) {
    validateNonNegative(result.offset, `${label} offset`);
  }
  validatePositive(result.fontSize, `${label} fontSize`);
  for (const key of ["color", "fontFamily"]) {
    validateNonEmptyString(result[key], `${label} ${key}`);
  }
  if (
    typeof result.fontWeight !== "string" &&
    !Number.isFinite(result.fontWeight)
  ) {
    throw new TypeError(`${label} fontWeight must be a string or finite number.`);
  }
  return result;
}

function normalizeBorder(value) {
  if (value === undefined || value === false) return false;
  if (value !== true && !isPlainObject(value)) {
    throw new TypeError("createLegend.border must be a boolean or plain object.");
  }
  if (value !== true) validateKeys(value, BORDER_OPTIONS, "createLegend.border");
  const border = { ...DEFAULT_BORDER, ...(value === true ? {} : value) };
  for (const key of ["color", "background"]) {
    validateNonEmptyString(border[key], `Legend border ${key}`);
  }
  validateNonNegative(border.lineWidth, "Legend border lineWidth");
  validateNonNegative(border.padding, "Legend border padding");
  return border;
}

export function normalizeContinuousLegend(args, kind) {
  validateOptionObject(args, OPTIONS, "createLegend");
  const position = args.position ?? "right";
  if (!POSITIONS.includes(position)) {
    throw new Error(`Unsupported legend position "${position}".`);
  }
  const align = args.align ?? "center";
  if (!["left", "center", "right"].includes(align)) {
    throw new Error(`Unsupported legend alignment "${align}".`);
  }
  const count = args.count ?? 5;
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError(
      "Continuous legend count must be an integer of at least 2."
    );
  }
  const offset = args.offset ?? 30;
  validateNonNegative(offset, "Legend offset");
  const itemGap = args.itemGap ?? 28;
  validatePositive(itemGap, "Legend itemGap");
  if (args.title !== undefined) validateNonEmptyString(args.title, "Legend title");
  if (args.titlePosition !== undefined && args.titlePosition !== "top") {
    throw new Error("Continuous legends currently require top titlePosition.");
  }
  if (kind === "gradient") {
    for (const key of ["symbol", "columns", "direction", "itemGap"]) {
      if (Object.hasOwn(args, key)) {
        throw new Error(`Gradient legend does not accept ${key}.`);
      }
    }
  } else {
    for (const key of ["columns", "direction", "gradient"]) {
      if (Object.hasOwn(args, key)) {
        throw new Error(`Opacity legend does not accept ${key}.`);
      }
    }
  }
  return {
    target: args.target,
    position,
    align,
    offset,
    count,
    title: args.title,
    inferredTitle: args.title === undefined,
    labels: validateTextOptions(
      args.labels,
      "createLegend.labels",
      DEFAULT_LABELS
    ),
    titleStyle: validateTextOptions(
      args.titleStyle,
      "createLegend.titleStyle",
      DEFAULT_TITLE
    ),
    itemGap,
    border: normalizeBorder(args.border)
  };
}

export function resolveContinuousPoint(program, requested, channel) {
  const candidates = program.semanticSpec.layers.filter(layer =>
    layer.mark?.type === "point" &&
    layer.encoding?.[channel]?.scale !== undefined
  );
  const layer = requested === undefined
    ? candidates.length === 1 ? candidates[0] : undefined
    : (() => {
        const candidate = findLayer(program, requested);
        return candidates.includes(candidate) ? candidate : undefined;
      })();
  if (layer === undefined) {
    throw new Error(
      requested === undefined
        ? `${channel} legend requires one eligible point mark.`
        : `Unknown ${channel} legend target "${requested}".`
    );
  }
  return layer;
}

export function resolveContinuousColorLayer(program, requested) {
  const candidates = program.semanticSpec.layers.filter(layer =>
    ["point", "bar", "rect"].includes(layer.mark?.type) &&
    layer.encoding?.color?.scale !== undefined
  );
  const layer = requested === undefined
    ? candidates.length === 1 ? candidates[0] : undefined
    : (() => {
        const candidate = findLayer(program, requested);
        return candidates.includes(candidate) ? candidate : undefined;
      })();
  if (layer === undefined) {
    throw new Error(
      requested === undefined
        ? "color legend requires one eligible point, bar, or rect mark."
        : `Unknown color legend target "${requested}".`
    );
  }
  return layer;
}

export function requireResolvedLegendScale(program, id, type) {
  const scale = program.resolvedScales[id];
  if (scale?.type !== type) {
    throw new Error(`Legend requires resolved ${type} scale "${id}".`);
  }
  return scale;
}

export function resolveContinuousBounds(program) {
  const plot = resolveGraphicBounds(program);
  const canvas = findCanvasGraphic(program);
  if (
    plot === undefined ||
    ![plot.x, plot.y, plot.width, plot.height].every(Number.isFinite) ||
    canvas?.type !== "canvas" ||
    !Number.isFinite(canvas.properties.width) ||
    !Number.isFinite(canvas.properties.height)
  ) {
    throw new Error("Continuous legend layout requires Canvas bounds.");
  }
  return { plot, canvas: canvas.properties };
}

export function sampleContinuousValues(domain, count) {
  return Array.from({ length: count }, (_, index) =>
    domain[0] + index / (count - 1) * (domain[1] - domain[0])
  );
}

export function formatContinuousValues(values, domain, fieldType) {
  return values.map(value => fieldType === "temporal"
    ? formatTimeTick(value, domain)
    : String(+value.toPrecision(3))
  );
}

export function styleContinuousText(
  program,
  id,
  style,
  { align = "left" } = {}
) {
  return program
    .editGraphics({ target: id, property: "fill", value: style.color })
    .editGraphics({ target: id, property: "fontSize", value: style.fontSize })
    .editGraphics({ target: id, property: "fontFamily", value: style.fontFamily })
    .editGraphics({ target: id, property: "fontWeight", value: style.fontWeight })
    .editGraphics({ target: id, property: "textAlign", value: align })
    .editGraphics({ target: id, property: "textBaseline", value: "middle" });
}

export function assertLegendInsideCanvas(items, canvas, label) {
  if (items.some(item =>
    item.x < 0 || item.y < 0 || item.x > canvas.width || item.y > canvas.height
  )) {
    throw new Error(`${label} requires more Canvas margin space.`);
  }
}

export function resolveLegendBackgroundBounds(points, border, canvas, label) {
  if (border === false) return undefined;
  const x = Math.min(...points.map(point => point.x)) - border.padding;
  const y = Math.min(...points.map(point => point.y)) - border.padding;
  const right = Math.max(...points.map(point => point.x)) + border.padding;
  const bottom = Math.max(...points.map(point => point.y)) + border.padding;
  if (x < 0 || y < 0 || right > canvas.width || bottom > canvas.height) {
    throw new Error(`${label} background requires more Canvas margin space.`);
  }
  return { x, y, width: right - x, height: bottom - y };
}

export function editLegendBackground(program, id, bounds, border) {
  if (bounds === undefined) return program;
  return program
    .editGraphics({ target: id, property: "x", value: bounds.x })
    .editGraphics({ target: id, property: "y", value: bounds.y })
    .editGraphics({ target: id, property: "width", value: bounds.width })
    .editGraphics({ target: id, property: "height", value: bounds.height })
    .editGraphics({ target: id, property: "fill", value: border.background })
    .editGraphics({ target: id, property: "stroke", value: border.color })
    .editGraphics({ target: id, property: "strokeWidth", value: border.lineWidth });
}
