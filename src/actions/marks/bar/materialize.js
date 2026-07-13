import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateMarkOptions } from "../shared.js";
import { deriveGroupedRectangles } from "./grouped.js";
import { deriveHistogramRectangles } from "./histogram.js";
import { requireCompleteBar } from "./resolve.js";

const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);

function editRectangles(program, id, rectangles) {
  return program
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
    const required = requireCompleteBar(this, id);
    let resolved = this
      .rematerializeScale({ id: required.xEncoding.scale })
      .rematerializeScale({ id: required.yEncoding.scale });

    const colorScaleId = required.layer.encoding?.color?.scale;
    if (colorScaleId !== undefined) {
      resolved = resolved.rematerializeScale({ id: colorScaleId });
    }

    if (required.materialization === "ordinalMean") {
      const offsetScaleId = required.layer.encoding?.xOffset?.scale;
      if (offsetScaleId !== undefined) {
        resolved = resolved.rematerializeScale({ id: offsetScaleId });
      }
      const band = resolved.markConfigs[id]?.barWidth?.band;
      if (band === undefined) {
        return resolved.editGraphics({
          target: id,
          property: "length",
          value: 0
        });
      }
      return editRectangles(
        resolved,
        id,
        deriveGroupedRectangles(required, resolved, band)
      );
    }

    return editRectangles(
      resolved,
      id,
      deriveHistogramRectangles(required, resolved)
    );
  }
);
