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
import { rematerializeHighlightBaseline } from "../lifecycle.js";
import { offsetCategoryRectangles } from
  "../../../materialization/categorySlotOffset.js";
import { materializeRectItem, RECT_STYLE_PROPERTIES } from "../../../grammar/roundedRect.js";
import { replaceGraphicItems } from "../../primitives/editGraphics.js";

const REMATERIALIZE_OPTIONS = Object.freeze(["id", "scales"]);

function editRectangles(program, id, rectangles) {
  const appearance = program.markConfigs[id]?.barAppearance ?? {};
  const hasShapeStyle = RECT_STYLE_PROPERTIES
    .some(property => Object.hasOwn(appearance, property));
  if (hasShapeStyle) {
    const radius = appearance;
    return replaceGraphicItems(
      program,
      id,
      "rect",
      rectangles.map(rectangle => materializeRectItem(rectangle, radius))
    );
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
  return next;
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
      resetProperty: "items",
      resetValue: []
    });
    if (highlighted !== undefined) return highlighted;
    const required = requireCompleteBar(this, id);
    let resolved = this;
    if (args.scales !== false) {
      resolved = resolved
        .rematerializeScale({ id: required.xEncoding.scale })
        .rematerializeScale({ id: required.yEncoding.scale });
    }

    const colorScaleId = required.layer.encoding?.color?.scale;
    if (colorScaleId !== undefined && args.scales !== false) {
      resolved = resolved.rematerializeScale({ id: colorScaleId });
    }
    const strokeScaleId = required.layer.encoding?.stroke?.scale;
    if (strokeScaleId !== undefined && args.scales !== false) {
      resolved = resolved.rematerializeScale({ id: strokeScaleId });
    }

    if (required.materialization === "aggregate") {
      const offsetChannel = resolveBarOffsetChannel(required.layer);
      const offsetScaleId = required.layer.encoding?.[offsetChannel]?.scale;
      if (offsetScaleId !== undefined && args.scales !== false) {
        resolved = resolved.rematerializeScale({ id: offsetScaleId });
      }
      const width = resolved.markConfigs[id]?.barWidth;
      return editRectangles(resolved, id, offsetCategoryRectangles(
        resolved, required.layer, deriveAggregateRectangles(required, resolved, width)
      ));
    }

    if (required.materialization === BAR_GRAINS.ranged) {
      const width = resolved.markConfigs[id]?.barWidth;
      return editRectangles(resolved, id, offsetCategoryRectangles(
        resolved, required.layer, deriveRangedRectangles(required, resolved, width)
      ));
    }

    return editRectangles(
      resolved,
      id,
      offsetCategoryRectangles(
        resolved, required.layer, deriveHistogramRectangles(required, resolved)
      )
    );
  }
);
