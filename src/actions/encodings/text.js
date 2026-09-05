import { action } from "../../core/action.js";
import { formatTextValue, validateTextFormat } from "../../grammar/text.js";
import { normalizeMarkLabelContent, resolveMarkLabelValues } from "../../grammar/markLabels.js";
import { canMaterializeText } from "../../materialization/marks/index.js";
import { resolveMarkItems } from "../../materialization/selection/policies/index.js";
import { findLayer } from "../../selectors/layers.js";
import {
  resolveTarget,
  setEncodingProperties,
  validateOptions
} from "./shared.js";

const OPTIONS = Object.freeze(["target", "field", "value", "content", "normalizeBy", "format"]);

function validateTextField(rows, field, format) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("encodeText field must be a non-empty string.");
  }
  let found = false;
  for (const row of rows) {
    if (!Object.hasOwn(row, field)) continue;
    found = true;
    formatTextValue(row[field], format);
  }
  if (!found) throw new Error(`Unknown text field "${field}".`);
}

export const encodeText = action(
  {
    op: "encodeText",
    description: "Assign field, constant, or source semantic text content."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeText");
    const hasField = Object.hasOwn(args, "field");
    const hasValue = Object.hasOwn(args, "value");
    const hasContent = Object.hasOwn(args, "content");
    if ([hasField, hasValue, hasContent].filter(Boolean).length !== 1) {
      throw new Error("encodeText requires exactly one of field, value, or content.");
    }
    if (Object.hasOwn(args, "normalizeBy") && (!hasContent || args.content !== "share")) {
      throw new Error("Text normalizeBy is only supported with share content.");
    }
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["text"],
      "text mark"
    );
    const previous = layer.encoding?.text;
    const format = validateTextFormat(args.format ?? previous?.format ?? "auto");
    const content = hasContent
      ? normalizeMarkLabelContent(findLayer(this, layer.source), args)
      : undefined;
    if (hasField) validateTextField(dataset.values, args.field, format);
    else if (hasValue && formatTextValue(args.value, format) === undefined) {
      throw new Error("encodeText value must produce non-empty text.");
    }

    const properties = {
      ...(hasContent ? content : { [hasField ? "field" : "datum"]: hasField ? args.field : args.value }),
      format
    };
    const proposed = { ...layer, encoding: { ...layer.encoding, text: properties } };
    if (hasContent && canMaterializeText(this, proposed)) {
      const source = findLayer(this, layer.source);
      for (const value of resolveMarkLabelValues(source, resolveMarkItems(this, source.id), content)) {
        formatTextValue(value, format);
      }
    }
    let next = this;
    for (const property of ["field", "datum", "content", "normalizeBy"]) {
      if (Object.hasOwn(previous ?? {}, property) && !Object.hasOwn(properties, property)) {
        next = next.editSemantic({ property: `layer[${target}].encoding.text.${property}`, remove: true });
      }
    }
    next = setEncodingProperties(next, target, "text", properties);
    const updated = findLayer(next, target);
    return canMaterializeText(next, updated)
      ? next.rematerializeTextMark({ id: target })
      : next;
  }
);

export function registerTextEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeText = encodeText;
}
