import { action } from "../../core/action.js";
import { schemaField } from "../../grammar/datasetSchema.js";
import { formatTextValue, validateTextFormat, isIndependentText, resolveTextOffsetDataset, normalizeTextOffsetAssignment } from "../../grammar/text.js";
import { validateUserId } from "../../core/identifiers.js";
import { normalizeMarkLabelContent, resolveMarkLabelValues } from "../../grammar/markLabels.js";
import { canMaterializeText } from "../../materialization/marks/index.js";
import { resolveTextSourceBindings } from "../../materialization/textContent.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../../materialization/selection/policies/index.js";
import { findLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import {
  resolveTarget,
  setEncodingProperties,
  validateOptions
} from "./shared.js";
import { applyRequestedItemMissingPolicy } from
  "../../grammar/itemMissing.js";

const OPTIONS = Object.freeze(["target", "field", "value", "content", "normalizeBy", "format"]);

function validateTextField(dataset, field, format) {
  const rows = dataset.values;
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("encodeText field must be a non-empty string.");
  }
  let found = rows.length === 0 && dataset.schema !== undefined &&
    schemaField(dataset.schema, field) !== undefined;
  for (const row of rows) {
    if (!Object.hasOwn(row, field)) continue;
    found = true;
    formatTextValue(row[field], format);
  }
  if (!found) throw new Error(`Unknown text field "${field}".`);
}

export const encodeText = /* @__PURE__ */ action(
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
    const { id: target, dataset: sourceDataset, layer } = resolveTarget(
      this,
      args.target,
      ["text"],
      "text mark"
    );
    const dataset = hasField
      ? applyRequestedItemMissingPolicy(layer, sourceDataset, args.field)
      : applyRequestedItemMissingPolicy(layer, sourceDataset);
    const previous = layer.encoding?.text;
    const format = validateTextFormat(args.format ?? previous?.format ?? "auto");
    const content = hasContent
      ? normalizeMarkLabelContent(findLayer(this, layer.source), args)
      : undefined;
    if (hasField) validateTextField(dataset, args.field, format);
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
      const items = resolveMarkItems(this, source.id);
      const sources = resolveTextSourceBindings(this, layer, items, { resolveMarkItems, resolveMarkSourceItems });
      for (const value of resolveMarkLabelValues(source, items, content, { sources })) {
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

function createTextOffsetEncoding(channel) {
  const operation = channel === "dx" ? "encodeDx" : "encodeDy";
  return action({ op: operation, description: `Assign direct numeric ${channel} pixel offsets to independent Text.` }, function (args = {}) {
    const properties = normalizeTextOffsetAssignment(args, channel);
    const selected = resolveEligibleLayer(this, {
      target: args.target === undefined ? undefined : validateUserId(args.target, "Text offset target"),
      predicate: isIndependentText,
      label: "Independent Text offset"
    });
    const { id: target, layer, dataset } = resolveTarget(this, selected.id, ["text"], "independent Text");
    resolveTextOffsetDataset({ ...layer, encoding: { ...layer.encoding, [channel]: properties } }, dataset);
    let next = this;
    for (const property of ["field", "fieldType", "datum"]) {
      if (Object.hasOwn(layer.encoding?.[channel] ?? {}, property)) {
        next = next.editSemantic({ property: `layer[${target}].encoding.${channel}.${property}`, remove: true });
      }
    }
    next = setEncodingProperties(next, target, channel, properties);
    return canMaterializeText(next, findLayer(next, target)) ? next.rematerializeTextMark({ id: target }) : next;
  });
}

export const encodeDx = /* @__PURE__ */ createTextOffsetEncoding("dx");
export const encodeDy = /* @__PURE__ */ createTextOffsetEncoding("dy");

export function registerTextEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeText = encodeText;
  ProgramClass.prototype.encodeDx = encodeDx;
  ProgramClass.prototype.encodeDy = encodeDy;
}
