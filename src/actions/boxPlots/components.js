import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "../../grammar/strokeStyle.js";

const MEDIAN_OPTIONS = Object.freeze([
  "id", "owner", "data", "category", "categoryType", "measure",
  "coordinate", "categoryScale", "measureScale", "orientation", "stroke",
  "strokeWidth", ...STROKE_STYLE_PROPERTIES
]);
const OUTLIER_OPTIONS = Object.freeze([
  "id", "data", "category", "categoryType", "measure", "coordinate",
  "categoryScale", "measureScale", "orientation", "shape", "radius", "opacity",
  ...STROKE_STYLE_PROPERTIES
]);

export const createBoxMedian = action(
  {
    op: "createBoxMedian",
    description: "Create a median rule spanning one concrete box body."
  },
  function (args = {}) {
    validateKeys(args, MEDIAN_OPTIONS, "createBoxMedian");
    if (!["vertical", "horizontal"].includes(args.orientation)) {
      throw new Error(`Unsupported box median orientation "${args.orientation}".`);
    }
    const categoryAction = args.orientation === "vertical" ? "encodeX" : "encodeY";
    const measureAction = args.orientation === "vertical" ? "encodeY" : "encodeX";
    let next = this.createRuleMark({
      id: args.id,
      data: args.data,
      ...requestedStrokeDetails(args, "Box median")
    });
    next = next[categoryAction]({
      target: args.id,
      field: args.category,
      fieldType: args.categoryType,
      coordinate: args.coordinate,
      scale: { id: args.categoryScale }
    });
    next = next[measureAction]({
      target: args.id,
      field: args.measure,
      fieldType: "quantitative",
      coordinate: args.coordinate,
      scale: { id: args.measureScale }
    });
    next = next
      .encodeStroke({ target: args.id, value: args.stroke })
      .encodeStrokeWidth({ target: args.id, value: args.strokeWidth });
    next = next._withMarkConfig(args.id, {
      ...next.markConfigs[args.id],
      boxSpanOwner: args.owner
    });
    return next.rematerializeRuleMark({ id: args.id });
  }
);

export const createBoxOutliers = action(
  {
    op: "createBoxOutliers",
    description: "Create concrete point symbols for box-plot outlier rows."
  },
  function (args = {}) {
    validateKeys(args, OUTLIER_OPTIONS, "createBoxOutliers");
    if (!["vertical", "horizontal"].includes(args.orientation)) {
      throw new Error(`Unsupported box outlier orientation "${args.orientation}".`);
    }
    const categoryAction = args.orientation === "vertical" ? "encodeX" : "encodeY";
    const measureAction = args.orientation === "vertical" ? "encodeY" : "encodeX";
    let next = this.createPointMark({
      id: args.id,
      data: args.data,
      shape: args.shape,
      fill: "#111111",
      ...requestedStrokeDetails(args, "Box outlier")
    });
    next = next[categoryAction]({
      target: args.id,
      field: args.category,
      fieldType: args.categoryType,
      coordinate: args.coordinate,
      scale: { id: args.categoryScale }
    });
    next = next[measureAction]({
      target: args.id,
      field: args.measure,
      fieldType: "quantitative",
      coordinate: args.coordinate,
      scale: { id: args.measureScale }
    });
    return next
      .encodeRadius({ target: args.id, value: args.radius })
      .encodeOpacity({ target: args.id, value: args.opacity });
  }
);
