import { validateUserId } from "../../../core/identifiers.js";
import {
  COLOR_LAYOUTS,
  MARK_TYPES,
  STACK_MODES
} from "../../../core/vocabulary.js";
import { validateAggregate } from "../../../grammar/aggregate.js";
import {
  normalizeHistogramBin,
  validateHistogramBinBoundaries,
  validateHistogramBinStep
} from "../../../grammar/histogram.js";
import {
  validateParallelDimensions,
  validateParallelKeyField,
  validateParallelMissingPolicy
} from "../../../grammar/parallelCoordinates.js";
import { validatePathOrderDirection } from "../../../grammar/pathOrder.js";
import { normalizeCategoryOrder } from "../../../grammar/categoryOrder.js";
import { validateSemanticFieldType } from "../../../grammar/scales/index.js";
import { findLayer } from "../../../selectors/layers.js";
import { validateNonEmptySemanticString } from "./shared.js";

function validateLayerSource(program, parsed, value) {
  validateUserId(value, "Layer source id");
  if (value === parsed.id) {
    throw new Error("A layer cannot use itself as its source.");
  }
  const source = findLayer(program, value);
  if (source === undefined) {
    throw new Error(`Unknown source layer "${value}".`);
  }
  if (!["point", "bar", "rule", "rect"].includes(source.mark?.type)) {
    throw new Error(
      `Layer source "${value}" must be a point, bar, rule, or rect mark.`
    );
  }
}

export function validateLayerSemanticValue(program, parsed, value) {
  const property = parsed.path.join(".");
  if (property === "mark.type" && !MARK_TYPES.includes(value)) {
    throw new Error(`Unknown mark type "${value}".`);
  }
  if (property === "source") validateLayerSource(program, parsed, value);
  if (property.endsWith(".title")) {
    validateNonEmptySemanticString(value, "Encoding title");
  }
  if (property === "encoding.pathOrder.fieldType" && value !== "quantitative") {
    throw new Error("Path order field type must be quantitative.");
  }
  if (property.endsWith(".fieldType")) validateSemanticFieldType(value);
  if (property === "encoding.pathOrder.order") validatePathOrderDirection(value);
  if (property.endsWith(".categoryOrder")) normalizeCategoryOrder(value);
  if (property === "encoding.parallel.dimensions") {
    validateParallelDimensions(value, { normalized: true });
  }
  if (property === "encoding.parallel.key") validateParallelKeyField(value);
  if (property === "encoding.parallel.missing") {
    validateParallelMissingPolicy(value);
  }
  if (property.endsWith(".aggregate")) validateAggregate(value);
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
