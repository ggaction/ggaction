import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import { findSemanticScale } from "../../selectors/scales.js";
import {
  BOX_PLOT_OPTIONS,
  boxEncodingArgs,
  resolveBoxAppearance,
  resolveBoxMedianAppearance,
  resolveBoxOutlierAppearance,
  resolveBoxPosition,
  resolveBoxWhisker,
  resolveBoxWidth
} from "./options.js";
import {
  resolveBoxOrientation,
  resolveBoxPlotId,
  resolveBoxSourceLayer
} from "./resolve.js";

export const createBoxPlot = action(
  {
    op: "createBoxPlot",
    description: "Create a Tukey box plot from categorical and quantitative positions."
  },
  function (args = {}) {
    validateKeys(args, BOX_PLOT_OPTIONS, "createBoxPlot");
    const id = resolveBoxPlotId(this, args.id);
    const source = resolveBoxSourceLayer(this, args.target);
    const data = args.data ?? source?.data ?? this.context.currentData;
    if (findDataset(this, data) === undefined) {
      throw new Error("createBoxPlot requires data or one inferable dataset.");
    }
    const x = resolveBoxPosition(args.x, "x") ?? source?.encoding?.x;
    const y = resolveBoxPosition(args.y, "y") ?? source?.encoding?.y;
    const whisker = resolveBoxWhisker(args.whisker);
    const width = resolveBoxWidth(args.width);
    if (args.outliers !== undefined && typeof args.outliers !== "boolean") {
      throw new TypeError("createBoxPlot outliers must be a boolean.");
    }
    const box = resolveBoxAppearance(args.box);
    const median = resolveBoxMedianAppearance(args.median);
    const outlier = resolveBoxOutlierAppearance(args.outlier);
    if (x !== undefined && y !== undefined && resolveBoxOrientation(x, y) === undefined) {
      throw new Error(
        "createBoxPlot requires one categorical axis and one quantitative axis."
      );
    }
    const orientation = resolveBoxOrientation(x, y);
    const category = orientation === "vertical" ? x : y;
    const categoryScaleId = typeof category?.scale === "string"
      ? category.scale
      : category?.scale?.id;
    const categoryScale = findSemanticScale(this, categoryScaleId);
    let next = categoryScale?.type === "point"
      ? this.editScale({ id: categoryScaleId, type: "band" })
      : this;
    next = next.createBarMark({ id, data })._withMarkConfig(id, {
      boxPlot: {
        whisker,
        width,
        outliers: args.outliers ?? true,
        box,
        median,
        outlier
      }
    });
    if (x !== undefined) {
      next = next.encodeX({
        ...boxEncodingArgs(x),
        target: id,
        coordinate: args.coordinate ?? source?.coordinate
      });
    }
    if (y !== undefined) {
      next = next.encodeY({
        ...boxEncodingArgs(y),
        target: id,
        coordinate: args.coordinate ?? source?.coordinate
      });
    }
    return next.materializeBoxPlot({ id });
  }
);
