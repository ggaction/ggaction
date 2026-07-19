import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  validateOrdinalDomain,
  validateOrdinalRange,
  validateScaleDomain,
  validateScaleRange,
  validateScaleType,
  validateDiscretizedColorDomain,
  validateDiscretizedColorRange,
  validateSequentialColorRange,
  hasOrdinalDomain,
  isColorScaleType,
  isContinuousColorScaleType,
  isDiscretizedColorScaleType,
  normalizeScaleDefinition
} from "../../grammar/scales/index.js";
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
  "constant",
  "paddingInner",
  "paddingOuter",
  "padding",
  "align",
  "palette",
  "interpolate",
  "unknown"
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
    const colorType = isColorScaleType(type);
    if (args.palette !== undefined && args.range !== undefined) {
      throw new Error("Color scale cannot specify both palette and range.");
    }
    if (args.palette !== undefined && !colorType) {
      throw new Error(`Scale type "${type}" does not support palette.`);
    }
    if (args.interpolate !== undefined && type !== "sequential") {
      throw new Error(`Scale type "${type}" does not support interpolate.`);
    }
    const requestedRange = args.palette === undefined
      ? args.range
      : { palette: args.palette };
    const definition = normalizeScaleDefinition({
      type,
      patch: {
        ...args,
        ...(requestedRange === undefined ? {} : { range: requestedRange })
      },
      validateDomain: (scaleType, value) =>
        isDiscretizedColorScaleType(scaleType)
          ? validateDiscretizedColorDomain(scaleType, value)
          : hasOrdinalDomain(scaleType)
            ? validateOrdinalDomain(value)
            : validateScaleDomain(value),
      validateRange: (scaleType, value) =>
        isDiscretizedColorScaleType(scaleType)
          ? validateDiscretizedColorRange(value)
          : isContinuousColorScaleType(scaleType)
            ? validateSequentialColorRange(value)
            : scaleType === "ordinal"
              ? validateOrdinalRange(value)
              : validateScaleRange(value)
    });
    if (Object.hasOwn(args, "unknown")) definition.unknown = args.unknown;
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
      "nice", "zero", "clamp", "reverse", "base", "exponent", "constant",
      "paddingInner", "paddingOuter", "padding", "align", "interpolate",
      "unknown"
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
