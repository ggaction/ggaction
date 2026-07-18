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

const REMATERIALIZE_OPTIONS = Object.freeze(["id", "scales"]);

function editRectangles(program, id, rectangles) {
  let next = program
    .editGraphics({ target: id, property: "length", value: rectangles.length })
    .editGraphics({
      target: id,
      property: "x",
      value: rectangles.map(rect => rect.x)
    })
    .editGraphics({
      target: id,
      property: "y",
      value: rectangles.map(rect => rect.y)
    })
    .editGraphics({
      target: id,
      property: "width",
      value: rectangles.map(rect => rect.width)
    })
    .editGraphics({
      target: id,
      property: "height",
      value: rectangles.map(rect => rect.height)
    })
    .editGraphics({
      target: id,
      property: "fill",
      value: rectangles.map(rect => rect.fill)
    })
    .editGraphics({
      target: id,
      property: "stroke",
      value: rectangles.map(rect => rect.stroke)
    })
    .editGraphics({
      target: id,
      property: "strokeWidth",
      value: rectangles.map(rect => rect.strokeWidth)
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

export const rematerializeBarMark = action(
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
      resetProperty: "length",
      resetValue: 0
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

    if (required.materialization === "aggregate") {
      const offsetChannel = resolveBarOffsetChannel(required.layer);
      const offsetScaleId = required.layer.encoding?.[offsetChannel]?.scale;
      if (offsetScaleId !== undefined && args.scales !== false) {
        resolved = resolved.rematerializeScale({ id: offsetScaleId });
      }
      const width = resolved.markConfigs[id]?.barWidth;
      return editRectangles(
        resolved,
        id,
        deriveAggregateRectangles(required, resolved, width)
      );
    }

    if (required.materialization === BAR_GRAINS.ranged) {
      const width = resolved.markConfigs[id]?.barWidth;
      return editRectangles(resolved, id, deriveRangedRectangles(required, resolved, width));
    }

    return editRectangles(
      resolved,
      id,
      deriveHistogramRectangles(required, resolved)
    );
  }
);
