import { materializeMarkClip } from "../../../materialization/markClip.js";
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
import { rematerializeHighlightBaseline } from "../lifecycle.js";
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
    return materializeMarkClip(replaceGraphicItems(
      program,
      id,
      "rect",
      rectangles.map(rectangle => materializeRectItem(rectangle, radius))
    ), id);
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
  return materializeMarkClip(next, id);
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

    const opacityScaleId = required.layer.encoding?.opacity?.scale;
    if (opacityScaleId !== undefined && args.scales !== false) {
      resolved = resolved.rematerializeScale({ id: opacityScaleId });
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

    if ([BAR_GRAINS.ranged, BAR_GRAINS.centered].includes(required.materialization)) {
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
