import { isPlainObject } from "../../../../core/immutable.js";
import { validateKeys } from "../../../../core/validation.js";
import {
  POLAR_AXIS_DEFAULTS,
  resolvePolarGuideResources
} from "../resolve.js";

export const LINE_CREATE_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "color", "lineWidth"
]);
export const LINE_EDIT_OPTIONS = Object.freeze(["color", "lineWidth"]);
export const TICK_CREATE_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "count", "values", "length", "color",
  "lineWidth"
]);
export const TICK_EDIT_OPTIONS = Object.freeze([
  "count", "values", "length", "color", "lineWidth"
]);
export const LABEL_CREATE_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "count", "values", "offset", "format",
  "color", "fontSize", "fontFamily", "fontWeight"
]);
export const LABEL_EDIT_OPTIONS = Object.freeze([
  "count", "values", "offset", "format", "color", "fontSize",
  "fontFamily", "fontWeight"
]);
export const TITLE_CREATE_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "text", "offset", "color", "fontSize",
  "fontFamily", "fontWeight", "position"
]);
export const TITLE_EDIT_OPTIONS = Object.freeze([
  "text", "offset", "color", "fontSize", "fontFamily", "fontWeight",
  "position"
]);

export function prefix(kind) {
  return kind === "theta" ? "Theta" : "Radial";
}

export function operations(kind, component) {
  const name = `${prefix(kind)}Axis${component}`;
  return { create: `create${name}`, edit: `edit${name}` };
}

export function validateObject(args, supported, operation) {
  if (!isPlainObject(args)) {
    throw new TypeError(`${operation} options must be a plain object.`);
  }
  validateKeys(args, supported, operation);
}

export function validateModeOptions(args, operation) {
  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }
}

export function validateAngle(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError("Radial-axis angle must be finite degrees.");
  }
  return value;
}

export function resolveAngle(program, kind, args) {
  if (kind === "theta") return undefined;
  const previous = program.guideConfigs.axis?.radius?.layout?.angle;
  const angle = validateAngle(
    args.angle ?? previous ?? POLAR_AXIS_DEFAULTS.angle
  );
  if (previous !== undefined && Object.hasOwn(args, "angle") &&
      previous !== angle) {
    throw new Error(
      "Polar radial-axis components must share one aggregate angle."
    );
  }
  return angle;
}

export function withAxisSemantics(program, kind, resources) {
  const existing = program.semanticSpec.guides.axis?.[kind];
  if (existing?.scale !== undefined && existing.scale !== resources.scale) {
    throw new Error(`${prefix(kind)} axis conflicts with its existing scale.`);
  }
  if (existing?.coordinate !== undefined &&
      existing.coordinate !== resources.coordinate) {
    throw new Error(`${prefix(kind)} axis conflicts with its coordinate.`);
  }
  let next = program;
  if (existing?.scale === undefined) {
    next = next.editSemantic({
      property: `guide.axis.${kind}.scale`,
      value: resources.scale
    });
  }
  if (existing?.coordinate === undefined) {
    next = next.editSemantic({
      property: `guide.axis.${kind}.coordinate`,
      value: resources.coordinate
    });
  }
  return next;
}

export function componentResources(program, kind, args, operation) {
  const stored = program.semanticSpec.guides.axis?.[kind];
  return resolvePolarGuideResources(program, kind, {
    ...args,
    ...(args.scale === undefined && stored?.scale !== undefined
      ? { scale: stored.scale }
      : {}),
    ...(args.coordinate === undefined && stored?.coordinate !== undefined
      ? { coordinate: stored.coordinate }
      : {})
  }, operation);
}
