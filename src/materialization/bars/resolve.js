import { conditionalPositionTemplate } from "../../core/encodingBindings.js";
import { readScaleField } from "../../grammar/scales/index.js";
import { mapScaleConsumerValues } from "../scales/map.js";

// Appearance belongs to a final bar cell and never introduces another group.
export function resolveBarCellOpacities(program, layer, rowsByCell) {
  const encoding = layer.encoding?.opacity;
  if (encoding === undefined) return undefined;
  const scale = program.resolvedScales[encoding.scale];
  const values = rowsByCell.map(rows => {
    const values = readScaleField(rows, encoding.field, encoding.fieldType, {
      allowUnknown: Object.hasOwn(scale, "unknown")
    });
    if (new Set(values).size !== 1) {
      throw new Error("Bar opacity requires one value within each final cell.");
    }
    return values[0];
  });
  return mapScaleConsumerValues(values, scale, "opacity");
}

import { hasRectRadius } from "../../grammar/roundedRect.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { BAR_GRAINS, resolveBarGrain } from "../../grammar/bars/policy.js";
import { requestedStrokeDetails } from "../../grammar/strokeStyle.js";
import { applyItemMissingPolicy } from "../../grammar/itemMissing.js";

export const DEFAULT_BAR_FILL = DEFAULT_COLORS.mark;
export const DEFAULT_BAR_STROKE = "white";
export const DEFAULT_BAR_STROKE_WIDTH = 0.5;

export function resolveBarAppearance(
  config,
  existing,
  defaultStroke = DEFAULT_BAR_STROKE,
  defaultOpacity
) {
  const appearance = config.barAppearance ?? {};
  const opacity = appearance.opacity ?? config.opacity ??
    existing?.opacity ?? defaultOpacity;
  return {
    stroke: appearance.stroke === false
      ? "transparent"
      : appearance.stroke ?? config.stroke ?? existing?.stroke ?? defaultStroke,
    strokeWidth: appearance.stroke === false
      ? 0
      : appearance.strokeWidth ?? config.strokeWidth ??
        existing?.strokeWidth ?? DEFAULT_BAR_STROKE_WIDTH,
    ...(opacity === undefined ? {} : { opacity }),
    ...requestedStrokeDetails(appearance, "Bar mark")
  };
}

export function requireCompleteBar(program, id) {
  const storedLayer = findLayer(program, id);
  const layer = storedLayer?.conditionals === undefined ? storedLayer : conditionalPositionTemplate(storedLayer, ["x", "y", "x2", "y2", "xOffset", "yOffset"]);

  if (layer?.mark?.type !== "bar") {
    throw new Error(`Unknown bar mark "${id}".`);
  }
  const sourceDataset = findDataset(program, layer.data);
  if (sourceDataset === undefined) {
    throw new Error(`Bar mark "${id}" requires an existing dataset.`);
  }
  const dataset = applyItemMissingPolicy(layer, sourceDataset);
  const graphic = program.graphicSpec.objects[id];
  const roundedCollection = graphic?.type === "collection" &&
    hasRectRadius(program.markConfigs[id]?.barAppearance) &&
    graphic.items?.every(child => ["rect", "path"].includes(child.type));
  if (graphic?.type !== "rect" && !roundedCollection) {
    throw new Error(`Bar mark "${id}" requires rect graphics.`);
  }

  const xEncoding = layer.encoding?.x;
  const yEncoding = layer.encoding?.y;
  const grain = resolveBarGrain(layer);

  if (
    xEncoding?.scale === undefined ||
    yEncoding?.scale === undefined ||
    grain === undefined
  ) {
    throw new Error(
      `Bar mark "${id}" requires binned x/aggregate y or ordinal x/aggregate y encodings.`
    );
  }
  const xScale = findSemanticScale(program, xEncoding.scale);
  const yScale = findSemanticScale(program, yEncoding.scale);
  if (xScale === undefined || yScale === undefined) {
    throw new Error(`Bar mark "${id}" requires x and y scales.`);
  }

  return {
    dataset,
    layer,
    storedLayer,
    xEncoding,
    yEncoding,
    xScale,
    yScale,
    materialization: grain
  };
}
