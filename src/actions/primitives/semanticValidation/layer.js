import { validateUserId } from "../../../core/identifiers.js";
import {
  COLOR_LAYOUTS,
  MARK_TYPES,
  STACK_MODES
} from "../../../core/vocabulary.js";
import { validateMarkLabelContent, validateMarkLabelNormalization } from "../../../grammar/markLabels.js";
import { validateAggregate } from "../../../grammar/aggregate.js";
import {
  normalizeHistogramBin,
  validateHistogramBinBoundaries,
  validateHistogramBinStep
} from "../../../grammar/histogram.js";
import { validatePathOrderDirection } from "../../../grammar/pathOrder.js";
import { normalizeGroupFields } from "../../../grammar/pathSeries.js";
import { normalizeCategoryOrder } from "../../../grammar/categoryOrder.js";
import { validateSemanticFieldType } from "../../../grammar/scales/index.js";
import { findLayer } from "../../../selectors/layers.js";
import { validateNonEmptySemanticString } from "./shared.js";
import { normalizeStatisticalWeight } from
  "../../../grammar/weightedStatistics.js";
import { ITEM_MISSING_MARK_TYPES, validateItemMissing } from
  "../../../grammar/itemMissing.js";
import { isIndependentText, validateTextOffsetEncoding } from "../../../grammar/text.js";
import { validateLineMissing, validateLineMissingScope } from "../../../grammar/lineMissing.js";

function validateLayerSource(program, parsed, value, sourceMarkTypes) {
  validateUserId(value, "Layer source id");
  if (value === parsed.id) {
    throw new Error("A layer cannot use itself as its source.");
  }
  const source = findLayer(program, value);
  if (source === undefined) {
    throw new Error(`Unknown source layer "${value}".`);
  }
  if (!sourceMarkTypes.includes(source.mark?.type)) {
    const sourceLabel = sourceMarkTypes.length === 1
      ? sourceMarkTypes[0]
      : `${sourceMarkTypes.slice(0, -1).join(", ")}, or ${sourceMarkTypes.at(-1)}`;
    throw new Error(
      `Layer source "${value}" must be a ${sourceLabel} mark.`
    );
  }
}

export function validateLayerSemanticValue(
  program,
  parsed,
  value,
  {
    sourceMarkTypes = ["point", "bar", "line", "rule", "rect", "arc"],
    validateParallel
  } = {}
) {
  const property = parsed.path.join(".");
  if (/^encoding\.(dx|dy)(\.|$)/.test(property)) {
    if (!isIndependentText(findLayer(program, parsed.id))) {
      throw new Error("Numeric text offsets require independent Text marks.");
    }
    const channel = parsed.path[1];
    if (parsed.path.length === 2) validateTextOffsetEncoding(value, channel);
    else if (property.endsWith(".fieldType") && value !== "quantitative") {
      throw new Error(`Text ${channel} field type must be quantitative.`);
    } else if (property.endsWith(".datum") && !Number.isFinite(value)) {
      throw new TypeError(`Text ${channel} datum must be finite logical pixels.`);
    } else if (property.endsWith(".field")) {
      validateNonEmptySemanticString(value, `Text ${channel} field`);
    }
  }
  if (property === "mark.type" && !MARK_TYPES.includes(value)) {
    throw new Error(`Unknown mark type "${value}".`);
  }
  if (property === "mark.missing") {
    const markType = findLayer(program, parsed.id)?.mark?.type;
    if (markType === "area") {
      if (!["error", "break"].includes(value)) {
        throw new Error(`Unsupported area missing policy "${value}".`);
      }
    } else if (markType === "line") {
      validateLineMissing(value);
      const layer = findLayer(program, parsed.id);
      validateLineMissingScope({ ...layer, mark: { ...layer.mark, missing: value } });
    } else if (ITEM_MISSING_MARK_TYPES.includes(markType)) {
      validateItemMissing(value, `${markType} missing`);
    } else {
      throw new Error(`Mark type "${markType}" does not support a missing policy.`);
    }
  }
  if (property === "mark.orientation" && (findLayer(program, parsed.id)?.mark?.type !== "bar" ||
      !["vertical", "horizontal"].includes(value))) {
    throw new Error("Bar orientation must be vertical or horizontal.");
  }
  if (property === "mark.blend" &&
      (findLayer(program, parsed.id)?.mark?.type !== "bar" || value !== "difference")) {
    throw new Error("Bar blend must be difference; remove the optional intent for normal painting.");
  }
  if (property === "derivedBindings.regression") {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        Object.keys(value).length !== 2 || value.mode !== "follow" ||
        !Array.isArray(value.roles) || value.roles.length !== 3 ||
        value.roles.join(",") !== "data,x,y") {
      throw new Error("Regression derived binding must follow data, x, and y roles.");
    }
    return;
  }
  if (property === "layout.mode" && !COLOR_LAYOUTS.includes(value)) {
    throw new Error(`Unsupported series layout "${value}".`);
  }
  if (property === "encoding.group.inferredFrom" && !["color", "offset"].includes(value)) {
    throw new Error(`Unsupported group inference origin "${value}".`);
  }
  if (property === "encoding.text.content") validateMarkLabelContent(value);
  if (property === "encoding.text.normalizeBy") validateMarkLabelNormalization(value);
  if (property === "source") {
    validateLayerSource(program, parsed, value, sourceMarkTypes);
  }
  if (property.endsWith(".title")) {
    validateNonEmptySemanticString(value, "Encoding title");
  }
  if (property === "encoding.pathOrder.fieldType" && value !== "quantitative") {
    throw new Error("Path order field type must be quantitative.");
  }
  if (property.endsWith(".fieldType")) validateSemanticFieldType(value);
  if (property === "encoding.group.fields") {
    if (!Array.isArray(value)) throw new TypeError("Group fields must be an array.");
    normalizeGroupFields(value);
  }
  if (property === "encoding.pathOrder.order") validatePathOrderDirection(value);
  if (property.endsWith(".categoryOrder")) normalizeCategoryOrder(value);
  if (property.startsWith("encoding.parallel.")) {
    validateParallel?.(property, value);
  }
  if (property.endsWith(".aggregate")) validateAggregate(value);
  if (property === "encoding.x.weight") {
    normalizeStatisticalWeight(value, "Histogram weight");
  }
  if (property.endsWith(".bin.maxBins")) normalizeHistogramBin({ maxBins: value });
  if (property.endsWith(".bin.step")) validateHistogramBinStep(value);
  if (property.endsWith(".bin.boundaries")) validateHistogramBinBoundaries(value);
  if (
    property.endsWith(".stack") &&
    value !== null &&
    !STACK_MODES.includes(value)
  ) {
    throw new Error(`Unsupported stack "${value}".`);
  }
  if (property === "encoding.color.layout" && !COLOR_LAYOUTS.includes(value)) {
    throw new Error(`Unsupported color layout "${value}".`);
  }
}
