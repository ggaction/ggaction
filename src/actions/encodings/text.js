import { action } from "../../core/action.js";
import { formatTextValue, validateTextFormat } from "../../grammar/text.js";
import { canMaterializeText } from "../../materialization/marks/index.js";
import { findLayer } from "../../selectors/layers.js";
import { resolveTarget, validateOptions } from "./shared.js";

const OPTIONS = Object.freeze(["target", "field", "value", "format"]);

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
    description: "Assign field-driven or constant text content."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeText");
    const hasField = Object.hasOwn(args, "field");
    const hasValue = Object.hasOwn(args, "value");
    if (hasField === hasValue) {
      throw new Error("encodeText requires exactly one of field or value.");
    }
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["text"],
      "text mark"
    );
    const previous = layer.encoding?.text;
    const format = validateTextFormat(args.format ?? previous?.format ?? "auto");
    if (hasField) validateTextField(dataset.values, args.field, format);
    else if (formatTextValue(args.value, format) === undefined) {
      throw new Error("encodeText value must produce non-empty text.");
    }

    let next = this;
    const alternate = hasField ? "datum" : "field";
    if (Object.hasOwn(previous ?? {}, alternate)) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.text.${alternate}`,
        remove: true
      });
    }
    next = next
      .editSemantic({
        property: `layer[${target}].encoding.text.${hasField ? "field" : "datum"}`,
        value: hasField ? args.field : args.value
      })
      .editSemantic({
        property: `layer[${target}].encoding.text.format`,
        value: format
      });
    const updated = findLayer(next, target);
    return canMaterializeText(next, updated)
      ? next.rematerializeTextMark({ id: target })
      : next;
  }
);

export function registerTextEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeText = encodeText;
}
