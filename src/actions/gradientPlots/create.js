import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import { findSemanticScale } from "../../selectors/scales.js";
import {
  GRADIENT_PLOT_OPTIONS,
  gradientEncodingArgs,
  resolveGradientAppearance,
  resolveGradientCenter,
  resolveGradientDensity,
  resolveGradientGuides,
  resolveGradientPosition,
  resolveGradientWidth
} from "./options.js";
import {
  normalizeGradientPositionTypes,
  resolveGradientPlotId,
  resolveGradientSourceLayer
} from "./resolve.js";

export const createGradientPlot = /* @__PURE__ */ action(
  {
    op: "createGradientPlot",
    description: "Create a categorical density gradient plot."
  },
  function (args = {}) {
    validateKeys(args, GRADIENT_PLOT_OPTIONS, "createGradientPlot");
    const id = resolveGradientPlotId(this, args.id);
    const source = resolveGradientSourceLayer(this, args.target);
    const data = args.data ?? source?.data ?? this.context.currentData ??
      (this.semanticSpec.datasets.length === 1
        ? this.semanticSpec.datasets[0].id
        : undefined);
    if (findDataset(this, data) === undefined) {
      throw new Error("createGradientPlot requires data or one inferable dataset.");
    }
    const positions = normalizeGradientPositionTypes(
      resolveGradientPosition(args.x, "x") ?? source?.encoding?.x,
      resolveGradientPosition(args.y, "y") ?? source?.encoding?.y
    );
    if (
      positions.x !== undefined && positions.y !== undefined &&
      positions.orientation === undefined
    ) {
      throw new Error(
        "createGradientPlot requires one categorical axis and one quantitative axis."
      );
    }
    const density = resolveGradientDensity(args.density);
    const width = resolveGradientWidth(args.width);
    const gradient = resolveGradientAppearance(args.gradient);
    const center = resolveGradientCenter(args.center);
    const guides = resolveGradientGuides(args.guides);
    const category = positions.orientation === "vertical"
      ? positions.x
      : positions.orientation === "horizontal"
        ? positions.y
        : undefined;
    const categoryScaleId = typeof category?.scale === "string"
      ? category.scale
      : category?.scale?.id;
    const categoryScale = findSemanticScale(this, categoryScaleId);
    let next = categoryScale?.type === "point"
      ? this.editScale({ id: categoryScaleId, type: "band" })
      : this;
    next = next.createRectMark({ id, data })._withMarkConfig(id, {
      ...this.markConfigs[id],
      gradientPlot: {
        materialized: false,
        density,
        width,
        gradient,
        center,
        guides
      },
      itemFilterable: false,
      stroke: false,
      strokeWidth: 0
    });
    if (positions.x !== undefined) {
      next = next.encodeX({
        ...gradientEncodingArgs(positions.x),
        target: id,
        coordinate: args.coordinate ?? source?.coordinate
      });
    }
    if (positions.y !== undefined) {
      next = next.encodeY({
        ...gradientEncodingArgs(positions.y),
        target: id,
        coordinate: args.coordinate ?? source?.coordinate
      });
    }
    return next.materializeGradientPlot({ id });
  }
);
