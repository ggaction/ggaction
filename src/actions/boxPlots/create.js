import { closedAction } from "../../core/action.js";

import { normalizeBoxSummary } from "../../grammar/boxPlot.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { resolveFacadeData } from "../charts/shared.js";
import {
  BOX_PLOT_OPTIONS,
  boxEncodingArgs,
  resolveBoxAppearance,
  resolveBoxMedianAppearance,
  resolveBoxOutlierAppearance,
  resolveBoxPosition,
  resolveBoxGuides,
  resolveBoxWhisker,
  resolveBoxWidth
} from "./options.js";
import {
  resolveBoxOrientation,
  resolveBoxPlotId,
  resolveBoxSourceLayer
} from "./resolve.js";

export const createBoxPlot = /* @__PURE__ */ closedAction(
  {
    op: "createBoxPlot",
    description: "Create a Tukey box plot from categorical and quantitative positions."
  }, BOX_PLOT_OPTIONS,
  function (args = {}) {
    const id = resolveBoxPlotId(this, args.id);
    const source = resolveBoxSourceLayer(this, args.target, {
      requiresInference: args.x === undefined || args.y === undefined
    });
    const data = resolveFacadeData(
      this,
      args.data ?? source?.data,
      "createBoxPlot"
    );
    const summary = normalizeBoxSummary(args.summary);
    let x = resolveBoxPosition(args.x, "x") ?? source?.encoding?.x;
    let y = resolveBoxPosition(args.y, "y") ?? source?.encoding?.y;
    if (summary !== undefined) {
      if (x !== undefined && y === undefined) y = { field: summary.median, fieldType: "quantitative" };
      if (y !== undefined && x === undefined) x = { field: summary.median, fieldType: "quantitative" };
    }
    const whisker = resolveBoxWhisker(args.whisker, "createBoxPlot", summary === undefined ? "tukey" : "minmax");
    if (summary !== undefined && (whisker.type !== "minmax" || args.outliers === true)) {
      throw new Error("Precomputed box summaries require minmax whiskers and do not infer outliers.");
    }
    const width = resolveBoxWidth(args.width);
    if (args.outliers !== undefined && typeof args.outliers !== "boolean") {
      throw new TypeError("createBoxPlot outliers must be a boolean.");
    }
    const box = resolveBoxAppearance(args.box);
    const median = resolveBoxMedianAppearance(args.median);
    const outlier = resolveBoxOutlierAppearance(args.outlier);
    const guides = resolveBoxGuides(args.guides);
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
        outliers: args.outliers ?? (summary === undefined),
        ...(summary === undefined ? {} : { summary }),
        box,
        median,
        outlier,
        guides
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
