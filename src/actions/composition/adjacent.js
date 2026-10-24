import { facetUnitTemplate } from "../facets/actions.js";
import { compositionPlotBounds } from "../../materialization/composition.js";
import { closedAction, getWrappedActionMetadata } from "../../core/action.js";
import { validateOptionObject } from "../../core/validation.js";
import { validateUserId } from "../../core/identifiers.js";
import { resolveAdjacentSource } from "../../selectors/adjacentSource.js";
import { requireMaterializedDataset } from "../../selectors/datasets.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { inheritTextMetrics } from "../textMetrics/index.js";
import { resolveEffectiveThemeFrame } from "../theme/state.js";
import { normalizeCompositionShares } from "../../core/compositionScales.js";
import { hconcatAction, vconcatAction } from "./actions.js";

export const ADJACENT_PLOT_ACTIONS = Object.freeze([
  "createScatterPlot", "createLinePlot", "createBarPlot", "createAreaPlot", "createDotPlot", "createLollipopPlot",
  "createDumbbellPlot", "createECDFPlot", "createIntervalPlot", "createRegressionPlot", "createRugPlot", "createStripPlot",
  "createBeeswarmPlot", "createRaincloudPlot", "createBoxPlot", "createGradientPlot", "createViolinPlot", "createDensityPlot",
  "createHorizonPlot", "createHistogram", "createHeatmap", "createPiePlot", "createRosePlot", "createRadialBarPlot",
  "createPolarScatterPlot", "createPolarLinePlot", "createRadarPlot", "createParallelCoordinates", "createTextPlot"
]);

function inheritedPosition(program, layer, channel, share) {
  const encoding = layer.encoding?.[channel];
  if (!encoding?.field) return undefined;
  const { field, fieldType, aggregate, bin, temporalUnit } = encoding;
  const scale = findSemanticScale(program, encoding.scale);
  return { field, fieldType, ...(aggregate === undefined ? {} : { aggregate }),
    ...(bin === undefined ? {} : { bin }), ...(temporalUnit === undefined ? {} : { temporalUnit }),
    ...(scale === undefined || !share[channel] ? {} : { scale: Object.fromEntries(Object.entries(scale).filter(([key]) => key !== "id")) }) };
}

const createAdjacentPlot = /* @__PURE__ */ closedAction({
  op: "createAdjacentPlot", description: "Add a chart beside the current view with shared scales and aligned plots.", scope: "any"
}, ["id", "source", "position", "plot", "share", "gap", "align"], function (args = {}) {
  const grouped = this.compositionSpec && this.compositionSpec.type !== "facet";
  const { view: sourceView, layer: source } = resolveAdjacentSource(this, args.source);
  const template = sourceView.compositionSpec ? facetUnitTemplate(sourceView, true) : sourceView;
  const position = args.position ?? "right";
  if (!["left", "right", "top", "bottom"].includes(position)) throw new Error("Adjacent position must be left, right, top, or bottom.");
  const horizontal = ["left", "right"].includes(position);
  const share = normalizeCompositionShares(args.share ?? { [horizontal ? "y" : "x"]: true });
  const plot = args.plot ?? { action: "createLinePlot", options: {} };
  validateOptionObject(plot, ["action", "options"], "Adjacent plot");
  const action = plot.action ?? "createLinePlot";
  if (!ADJACENT_PLOT_ACTIONS.includes(action) || !getWrappedActionMetadata(this[action])) throw new Error(`Unknown adjacent plot action "${action}".`);
  const id = args.id === undefined ? "adjacent" : validateUserId(args.id, "Adjacent view id");
  const sourceId = grouped ? this.compositionSpec.id : source.id;
  if (id === sourceId) throw new Error("Adjacent view id must differ from its source view id.");
  const supplied = plot.options ?? {};
  if (supplied === null || typeof supplied !== "object" || Array.isArray(supplied)) throw new TypeError("Adjacent plot options must be an object.");
  if (Object.hasOwn(supplied, "id")) throw new Error("Adjacent plot id is owned by the adjacent view; use the top-level id.");
  const dataset = requireMaterializedDataset(template, supplied.data ?? source.data);
  const bounds = compositionPlotBounds(this);
  const sourceBounds = compositionPlotBounds(sourceView);
  const canvas = this.graphicSpec.objects.canvas.properties;
  let child = new this.constructor().createCanvas({ plot: { width: grouped && horizontal ? sourceBounds.width : bounds.width,
      height: grouped && !horizontal ? sourceBounds.height : bounds.height },
    margin: template.materializationConfigs.canvas.margin, background: canvas.background });
  const theme = resolveEffectiveThemeFrame(template.materializationConfigs.theme);
  if (theme) child = child.applyTheme({ theme: { base: theme.name, tokens: theme.tokens } });
  child = inheritTextMetrics(template, child).createData({ id: dataset.id, values: dataset.values });
  const inherit = ["createLinePlot", "createBarPlot"].includes(action);
  const defaults = inherit ? Object.fromEntries(["x", "y"].flatMap(channel => {
    const value = inheritedPosition(sourceView, source, channel, share);
    return value ? [[channel, value]] : [];
  })) : {};
  const color = source.encoding?.color;
  if (inherit && color && ["nominal", "ordinal"].includes(color.fieldType)) {
    const { id: _id, ...scale } = findSemanticScale(sourceView, color.scale);
    defaults.color = { field: color.field, fieldType: color.fieldType, scale };
  }
  const options = { ...defaults, ...supplied, id, data: dataset.id };
  for (const channel of ["x", "y"]) {
    const selected = typeof supplied[channel] === "string" ? { field: supplied[channel] } : supplied[channel];
    if (selected && defaults[channel]?.field === selected.field) options[channel] = { ...defaults[channel], ...selected };
  }
  child = child[action](options);
  const original = new this.constructor({ ...this, actionStack: [], actionSequence: this._actionSequence });
  const parent = new this.constructor({ trace: this.trace, actionStack: this.actionStack, actionSequence: this._actionSequence });
  const entries = [{ id: sourceId, program: original }, { id, program: child }];
  if (["left", "top"].includes(position)) entries.reverse();
  return (horizontal ? hconcatAction : vconcatAction).call(parent, {
    programs: entries, align: args.align ?? "plot", ...(args.gap === undefined ? {} : { gap: args.gap }),
    share
  });
});

export function registerAdjacentPlotActions(ProgramClass) {
  ProgramClass.prototype.createAdjacentPlot = createAdjacentPlot;
}
