import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";

const MEDIAN_OPTIONS = Object.freeze([
  "id", "owner", "data", "category", "categoryType", "measure",
  "coordinate", "categoryScale", "measureScale", "orientation", "stroke",
  "strokeWidth"
]);
const OUTLIER_OPTIONS = Object.freeze([
  "id", "data", "category", "categoryType", "measure", "coordinate",
  "categoryScale", "measureScale", "orientation", "shape", "radius", "opacity"
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
    let next = this.createRuleMark({ id: args.id, data: args.data });
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
      shape: args.shape
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
      .encodeOpacity({ target: args.id, value: args.opacity })
      .editGraphics({ target: args.id, property: "fill", value: "#111111" });
  }
);
