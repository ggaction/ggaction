import { getLayerScaleIds } from "../../../materialization/marks/index.js";
import { hasConditionalBarPosition, conditionalBarStructure } from "../../../materialization/conditionalBarStructure.js";
import { conditionalAggregateBarValues, conditionalHistogramBarValues } from "../../../materialization/conditionalBarValues.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../../../materialization/selection/policies/index.js";
import { materializeMarkOutput } from "../../../materialization/markOutput.js";
import { findLayer } from "../../../selectors/layers.js";
import { editGraphicProperties } from "../../primitives/graphicProperties.js";
import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateMarkOptions } from "../shared.js";
import { deriveAggregateRectangles } from "../../../materialization/bars/aggregate.js";
import { deriveHistogramRectangles } from "../../../materialization/bars/histogram.js";
import { requireCompleteBar } from "../../../materialization/bars/resolve.js";
import { deriveRangedRectangles } from "../../../materialization/bars/ranged.js";
import {
  BAR_GRAINS,
  resolveBarOffsetChannel
} from "../../../grammar/bars/policy.js";
import { rematerializeHighlightBaseline, materializeFollowingOverlays } from "../lifecycle.js";
import { offsetCategoryRectangles } from
  "../../../materialization/categorySlotOffset.js";
import { materializeRectItem, RECT_STYLE_PROPERTIES } from "../../../grammar/roundedRect.js";
import { replaceGraphicItems } from "../../primitives/editGraphics.js";

const REMATERIALIZE_OPTIONS = Object.freeze(["id", "scales"]);

function editRectangles(program, id, rectangles) {
  const appearance = program.markConfigs[id]?.barAppearance ?? {};
  const blend = findLayer(program, id)?.mark?.blend;
  if (blend !== undefined) rectangles = rectangles.map(rect => ({...rect, blend}));
  const hasShapeStyle = RECT_STYLE_PROPERTIES
    .some(property => Object.hasOwn(appearance, property));
  const previousBlend = program.graphicSpec.objects[id]?.items?.some(item =>
    item.properties?.blend !== undefined);
  if (hasShapeStyle || blend !== undefined || previousBlend) {
    const radius = appearance;
    return materializeFollowingOverlays(materializeMarkOutput(replaceGraphicItems(
      program,
      id,
      "rect",
      rectangles.map(rectangle => materializeRectItem(rectangle, radius))
    ), id), id);
  }
  let next = editGraphicProperties(program, id, {
    length: rectangles.length,
    x: rectangles.map(rect => rect.x),
    y: rectangles.map(rect => rect.y),
    width: rectangles.map(rect => rect.width),
    height: rectangles.map(rect => rect.height),
    fill: rectangles.map(rect => rect.fill),
    stroke: rectangles.map(rect => rect.stroke),
    strokeWidth: rectangles.map(rect => rect.strokeWidth)
  });
  if (rectangles.some(rect => rect.opacity !== undefined)) {
    next = next.editGraphics({
      target: id,
      property: "opacity",
      value: rectangles.map(rect => rect.opacity ?? 1)
    });
  }
  return materializeFollowingOverlays(materializeMarkOutput(next, id), id);
}

export const rematerializeBarMark = /* @__PURE__ */ action(
  {
    op: "rematerializeBarMark",
    description: "Recompute concrete bar graphics from complete semantics."
  },
  function (args = {}) {
    validateMarkOptions(
      args,
      REMATERIALIZE_OPTIONS,
      "rematerializeBarMark"
    );
    const id = validateUserId(args.id, "Bar mark id");
    if (args.scales !== undefined && typeof args.scales !== "boolean") {
      throw new TypeError("rematerializeBarMark scales must be a boolean.");
    }
    const highlighted = rematerializeHighlightBaseline(this, {
      target: id,
      operation: "rematerializeBarMark",
      scales: args.scales,
      resetProperty: "items",
      resetValue: []
    });
    if (highlighted !== undefined) return highlighted;
    const required = requireCompleteBar(this, id);
    if (hasConditionalBarPosition(required.storedLayer)) conditionalBarStructure(this, required.storedLayer, required.dataset);
    let resolved = this;
    if (args.scales !== false) for (const id of getLayerScaleIds(required.storedLayer)) resolved = resolved.rematerializeScale({ id });

    if (required.materialization === "aggregate") {
      if (hasConditionalBarPosition(required.storedLayer)) required.conditional = conditionalAggregateBarValues(resolved, required.storedLayer, required.dataset, { resolveMarkItems, resolveMarkSourceItems });
      const offsetChannel = resolveBarOffsetChannel(required.layer);
      const offsetScaleId = required.layer.encoding?.[offsetChannel]?.scale;

      const width = resolved.markConfigs[id]?.barWidth;
      return editRectangles(resolved, id, offsetCategoryRectangles(
        resolved, required.layer, deriveAggregateRectangles(required, resolved, width)
      ));
    }

    if ([BAR_GRAINS.ranged, BAR_GRAINS.centered].includes(required.materialization)) {
      const width = resolved.markConfigs[id]?.barWidth;
      return editRectangles(resolved, id, offsetCategoryRectangles(
        resolved, required.layer, deriveRangedRectangles(required, resolved, width, { resolveMarkItems, resolveMarkSourceItems })
      ));
    }

    if (hasConditionalBarPosition(required.storedLayer)) required.conditional = conditionalHistogramBarValues(resolved, required.storedLayer, required.dataset, { resolveMarkItems, resolveMarkSourceItems });
    return editRectangles(
      resolved,
      id,
      offsetCategoryRectangles(
        resolved, required.layer, deriveHistogramRectangles(required, resolved)
      )
    );
  }
);
