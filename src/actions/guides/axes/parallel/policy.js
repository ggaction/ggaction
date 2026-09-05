import {
  validateGeneratedItemLimit,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateOptionObject
} from "../../../../core/validation.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../../../../theme/defaults.js";
import { validateAxisTextStyle } from "../labels.js";
import { validateAxisFormat } from "../policy.js";

export const PARALLEL_AXIS_PARTS = Object.freeze(["line", "ticks", "labels", "title"]);
export const PARALLEL_AXIS_GRAPHICS = Object.freeze({
  line: "parallelAxisLines", ticks: "parallelAxisTicks",
  labels: "parallelAxisLabels", title: "parallelAxisTitles"
});
const STYLE_OPTIONS = Object.freeze({
  line: ["color", "lineWidth"],
  ticks: ["count", "values", "length", "color", "lineWidth"],
  labels: ["count", "values", "offset", "format", "color", "fontSize", "fontFamily", "fontWeight"],
  title: ["text", "offset", "color", "fontSize", "fontFamily", "fontWeight"]
});

export function defaultParallelAxis(field) {
  return {
    field,
    line: { color: DEFAULT_COLORS.axis, lineWidth: 1.25 },
    ticks: { mode: "auto", length: 8, color: DEFAULT_COLORS.mutedText, lineWidth: 1 },
    labels: { mode: "auto", offset: 9, format: "auto", color: DEFAULT_COLORS.axis,
      fontSize: 11, fontFamily: DEFAULT_FONT_FAMILY, fontWeight: "normal" },
    title: { offset: 20, color: DEFAULT_COLORS.axisTitle,
      fontSize: 13, fontFamily: DEFAULT_FONT_FAMILY, fontWeight: 600 }
  };
}

function validateMode(options, operation) {
  if (Object.hasOwn(options, "count") && Object.hasOwn(options, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
}

export function validateParallelAxisOptions(args, operation, create) {
  validateOptionObject(args, ["target", "field", "line", "ticksAndLabels", "title", "ticks", "labels"], operation);
  validateNonEmptyString(args.field, "Parallel axis field");
  if (create && args.line === false && args.title === false &&
      (args.ticksAndLabels === false || args.ticks === false && args.labels === false)) {
    throw new Error(`${operation} requires at least one enabled axis component.`);
  }
  if (!create && ![...PARALLEL_AXIS_PARTS, "ticksAndLabels"].some(key => Object.hasOwn(args, key))) {
    throw new Error(`${operation} requires at least one axis change.`);
  }
  if (args.ticksAndLabels !== undefined && (args.ticks !== undefined || args.labels !== undefined)) {
    throw new Error(`${operation} cannot combine ticksAndLabels with ticks or labels.`);
  }
  for (const part of PARALLEL_AXIS_PARTS) {
    if (!Object.hasOwn(args, part) || args[part] === false) continue;
    validateOptionObject(args[part], STYLE_OPTIONS[part], `${operation}.${part}`);
    validateMode(args[part], `${operation}.${part}`);
  }
  if (Object.hasOwn(args, "ticksAndLabels") && args.ticksAndLabels !== false) {
    const group = args.ticksAndLabels;
    validateOptionObject(group, ["count", "values", "ticks", "labels"], `${operation}.ticksAndLabels`);
    validateMode(group, `${operation}.ticksAndLabels`);
    for (const part of ["ticks", "labels"]) {
      if (Object.hasOwn(group, part)) {
        validateOptionObject(group[part], STYLE_OPTIONS[part].filter(key => !["count", "values"].includes(key)),
          `${operation}.ticksAndLabels.${part}`);
      }
    }
  }
}

function patchComponent(previous, defaults, options, part, create, operation) {
  if (create && previous !== undefined) throw new Error(`${operation} requires missing ${part}.`);
  if (!create && previous === undefined) throw new Error(`${operation} requires existing ${part}.`);
  if (options === false) return undefined;
  const next = { ...(create ? defaults : previous), ...options };
  delete next.text;
  if (Object.hasOwn(options, "count")) { next.mode = "count"; delete next.values; }
  if (Object.hasOwn(options, "values")) { next.mode = "values"; delete next.count; }
  validateNonEmptyString(next.color, "Parallel axis color");
  if (part === "line" || part === "ticks") validateNonNegativeFinite(next.lineWidth, "Parallel axis lineWidth");
  if (part === "ticks") validateNonNegativeFinite(next.length, "Parallel tick length");
  if (part === "labels" || part === "title") {
    validateAxisTextStyle(next, "Parallel axis text");
    validateNonNegativeFinite(next.offset, "Parallel text offset");
  }
  if (part === "labels") validateAxisFormat(next.format);
  if (Object.hasOwn(options, "text")) validateNonEmptyString(options.text, "Parallel axis title");
  if (next.mode === "count") {
    if (!Number.isInteger(next.count) || next.count <= 0) throw new RangeError("Parallel tick count must be a positive integer.");
    validateGeneratedItemLimit(next.count, "Parallel tick count");
  }
  if (next.mode === "values") {
    if (!Array.isArray(next.values)) throw new TypeError("Parallel tick values must be an array.");
    validateGeneratedItemLimit(next.values.length, "Parallel tick values");
    next.values = [...next.values];
  }
  return next;
}

export function patchParallelAxis(previous, args, create, operation) {
  const defaults = defaultParallelAxis(args.field);
  const next = { ...previous, field: args.field };
  const updates = {};
  for (const part of ["line", "title"]) {
    if (create ? args[part] !== false : Object.hasOwn(args, part)) updates[part] = args[part] ?? {};
  }
  if (args.ticksAndLabels === false) {
    if (!create) { updates.ticks = false; updates.labels = false; }
  } else if (args.ticksAndLabels !== undefined) {
    const group = args.ticksAndLabels ?? {};
    const mode = Object.fromEntries(["count", "values"].filter(key => Object.hasOwn(group, key)).map(key => [key, group[key]]));
    updates.ticks = { ...mode, ...(group.ticks ?? {}) };
    updates.labels = { ...mode, ...(group.labels ?? {}) };
  } else {
    for (const part of ["ticks", "labels"]) {
      if (create ? args[part] !== false : Object.hasOwn(args, part)) updates[part] = args[part] ?? {};
    }
  }
  for (const [part, options] of Object.entries(updates)) {
    const value = patchComponent(previous?.[part], defaults[part], options, part, create, operation);
    if (value === undefined) delete next[part]; else next[part] = value;
  }
  return next;
}

export function hasParallelAxisParts(config) {
  return PARALLEL_AXIS_PARTS.some(part => config?.[part] !== undefined);
}

export function resolveParallelAxisConfigs(program, dimensions) {
  const previous = program.guideConfigs.axis?.parallel?.axes;
  const mode = previous?.mode ?? "all";
  const configs = dimensions.map(dimension => previous?.dimensions?.find(config => config.field === dimension.field) ??
    (mode === "all" ? defaultParallelAxis(dimension.field) : { field: dimension.field }));
  return { mode, dimensions: configs };
}
