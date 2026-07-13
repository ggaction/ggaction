import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  validateOrdinalDomain,
  validateOrdinalRange,
  validateScaleDomain,
  validateScaleRange,
  validateScaleType
} from "../../grammar/scales.js";

const CREATE_SCALE_OPTIONS = Object.freeze([
  "id",
  "type",
  "domain",
  "range",
  "nice",
  "zero"
]);

function validateOptions(args) {
  for (const key of Object.keys(args)) {
    if (!CREATE_SCALE_OPTIONS.includes(key)) {
      throw new Error(`Unknown createScale option "${key}".`);
    }
  }
}

function sameScaleSetting(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every(
      (value, index) => sameScaleSetting(value, right[index])
    );
  }
  if (!Array.isArray(left) && !Array.isArray(right)) {
    return left?.palette !== undefined && left.palette === right?.palette;
  }
  return false;
}

function assertEquivalentScale(existing, expected) {
  if (
    existing.type !== expected.type ||
    !sameScaleSetting(existing.domain, expected.domain) ||
    !sameScaleSetting(existing.range, expected.range) ||
    existing.nice !== expected.nice ||
    existing.zero !== expected.zero
  ) {
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
      if (type === "ordinal") {
        throw new Error('Scale type "ordinal" does not support nice.');
      }
      definition.nice = args.nice;
    }

    if (args.zero !== undefined) {
      if (typeof args.zero !== "boolean") {
        throw new TypeError("Scale zero must be a boolean.");
      }
      if (type !== "linear") {
        throw new Error(`Scale type "${type}" does not support zero.`);
      }
      definition.zero = args.zero;
    }
    const existing = this.semanticSpec.scales.find(item => item.id === id);

    if (existing !== undefined) {
      assertEquivalentScale(existing, definition);
      return this;
    }

    let next = this
      .editSemantic({ property: `scale[${id}].type`, value: definition.type })
      .editSemantic({ property: `scale[${id}].domain`, value: definition.domain })
      .editSemantic({ property: `scale[${id}].range`, value: definition.range });

    if (definition.nice !== undefined) {
      next = next.editSemantic({
        property: `scale[${id}].nice`,
        value: definition.nice
      });
    }

    if (definition.zero !== undefined) {
      next = next.editSemantic({
        property: `scale[${id}].zero`,
        value: definition.zero
      });
    }

    return next;
  }
);
