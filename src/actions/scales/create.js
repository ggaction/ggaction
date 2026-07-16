import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  validateOrdinalDomain,
  validateOrdinalRange,
  validateScaleDomain,
  validateScaleRange,
  validateScalePropertyForType,
  validateScaleType,
  normalizeTransformParameters
} from "../../grammar/scales.js";
import { findSemanticScale } from "../../selectors/scales.js";

const CREATE_SCALE_OPTIONS = Object.freeze([
  "id",
  "type",
  "domain",
  "range",
  "nice",
  "zero",
  "clamp",
  "reverse",
  "base",
  "exponent",
  "constant"
]);

function validateOptions(args) {
  validateKeys(args, CREATE_SCALE_OPTIONS, "createScale");
}

function sameScaleSetting(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every(
      (value, index) => sameScaleSetting(value, right[index])
    );
  }
  if (
    left !== null &&
    right !== null &&
    typeof left === "object" &&
    typeof right === "object" &&
    !Array.isArray(left) &&
    !Array.isArray(right)
  ) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length && leftKeys.every(
      key => Object.hasOwn(right, key) && sameScaleSetting(left[key], right[key])
    );
  }
  return false;
}

function assertEquivalentScale(existing, expected) {
  const keys = new Set([...Object.keys(existing), ...Object.keys(expected)]);
  keys.delete("id");
  if ([...keys].some(key => !sameScaleSetting(existing[key], expected[key]))) {
    throw new Error(`Scale "${existing.id}" already exists with a different definition.`);
  }
}

export const createScale = action(
  {
    op: "createScale",
    description: "Create a named semantic scale."
  },
  function (args = {}) {
    validateOptions(args);
    const id = validateUserId(args.id, "Scale id");
    const type = validateScaleType(args.type ?? "linear");
    const definition = {
      type,
      domain:
        type !== "ordinal"
          ? validateScaleDomain(args.domain ?? "auto")
          : validateOrdinalDomain(args.domain ?? "auto"),
      range:
        type !== "ordinal"
          ? validateScaleRange(args.range ?? "auto")
          : validateOrdinalRange(args.range ?? "auto")
    };

    if (args.nice !== undefined) {
      if (typeof args.nice !== "boolean") {
        throw new TypeError("Scale nice must be a boolean.");
      }
      validateScalePropertyForType(type, "nice");
      definition.nice = args.nice;
    }

    if (args.zero !== undefined) {
      if (typeof args.zero !== "boolean") {
        throw new TypeError("Scale zero must be a boolean.");
      }
      validateScalePropertyForType(type, "zero");
      definition.zero = args.zero;
    }
    for (const property of ["clamp", "reverse"]) {
      if (args[property] === undefined) continue;
      if (typeof args[property] !== "boolean") {
        throw new TypeError(`Scale ${property} must be a boolean.`);
      }
      validateScalePropertyForType(type, property);
      definition[property] = args[property];
    }
    const requestedParameters = Object.fromEntries(
      ["base", "exponent", "constant"]
        .filter(property => args[property] !== undefined)
        .map(property => [property, args[property]])
    );
    if (["log", "pow", "sqrt", "symlog"].includes(type)) {
      const parameters = normalizeTransformParameters(type, requestedParameters);
      if (type === "log") definition.base = parameters.base;
      if (type === "pow") definition.exponent = parameters.exponent;
      if (type === "symlog") definition.constant = parameters.constant;
    } else {
      for (const property of Object.keys(requestedParameters)) {
        validateScalePropertyForType(type, property);
      }
    }
    const existing = findSemanticScale(this, id);

    if (existing !== undefined) {
      assertEquivalentScale(existing, definition);
      return this;
    }

    let next = this
      .editSemantic({ property: `scale[${id}].type`, value: definition.type })
      .editSemantic({ property: `scale[${id}].domain`, value: definition.domain })
      .editSemantic({ property: `scale[${id}].range`, value: definition.range });

    for (const property of [
      "nice", "zero", "clamp", "reverse", "base", "exponent", "constant"
    ]) {
      if (definition[property] === undefined) continue;
      next = next.editSemantic({
        property: `scale[${id}].${property}`,
        value: definition[property]
      });
    }

    return next;
  }
);
