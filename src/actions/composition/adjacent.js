import { adjacentLegendPresentation } from "../../materialization/compositionLegends.js";
import { facetUnitTemplate } from "../facets/actions.js";
import { compositionPlotBounds } from "../../materialization/composition.js";
import { closedAction, getWrappedActionMetadata } from "../../core/action.js";
import { validateOptionObject } from "../../core/validation.js";
import { validateUserId } from "../../core/identifiers.js";
import { resolveAdjacentSource } from "../../materialization/adjacentSource.js";
import { requireMaterializedDataset } from "../../selectors/datasets.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { inheritTextMetrics } from "../textMetrics/index.js";
import { resolveEffectiveThemeFrame } from "../theme/state.js";
import { normalizeCompositionShares } from "../../core/compositionScales.js";
import { hconcatAction, vconcatAction } from "./actions.js";

import { plotComposition } from "../../selectors/plotComposition.js";
import { inferCompositionOptions, constructorChannels } from "../../grammar/plotComposition.js";
import { COMPOSITION_PLOT_ACTIONS } from "../../grammar/plotComposition.js";
export const ADJACENT_PLOT_ACTIONS = COMPOSITION_PLOT_ACTIONS;

const createAdjacentPlot = /* @__PURE__ */ closedAction({
  op: "createAdjacentPlot", description: "Add a chart beside the current view with shared scales and aligned plots.", scope: "any"
}, ["id", "source", "position", "plot", "share", "gap", "align", "legends"], function (args = {}) {
  const grouped = this.compositionSpec && this.compositionSpec.type !== "facet";
  const { view: sourceView, layer: source } = resolveAdjacentSource(this, args.source);
  const template = sourceView.compositionSpec ? facetUnitTemplate(sourceView, true) : sourceView;
  const position = args.position ?? "right";
  if (!["left", "right", "top", "bottom"].includes(position)) throw new Error("Adjacent position must be left, right, top, or bottom.");
  const horizontal = ["left", "right"].includes(position);
  const share = { ...normalizeCompositionShares(args.share ?? { [horizontal ? "y" : "x"]: true }) };
  const plot = args.plot ?? { action: "createLinePlot", options: {} };
  validateOptionObject(plot, ["action", "options", "inherit"], "Adjacent plot");
  const action = plot.action ?? "createLinePlot";
  if (!ADJACENT_PLOT_ACTIONS.includes(action) || !getWrappedActionMetadata(this[action])) throw new Error(`Unknown adjacent plot action "${action}".`);
  const id = args.id === undefined ? "adjacent" : validateUserId(args.id, "Adjacent view id");
  const sourceId = grouped ? this.compositionSpec.id : source.id;
  if (id === sourceId) throw new Error("Adjacent view id must differ from its source view id.");
  const supplied = plot.options ?? {};
  if (supplied === null || typeof supplied !== "object" || Array.isArray(supplied)) throw new TypeError("Adjacent plot options must be an object.");
  if (Object.hasOwn(supplied, "id")) throw new Error("Adjacent plot id is owned by the adjacent view; use the top-level id.");
  const meaning = plotComposition(template,source.id);
  const dataset = requireMaterializedDataset(template, supplied.data ?? meaning.data);
  const bounds = compositionPlotBounds(this);
  const sourceBounds = compositionPlotBounds(sourceView);
  const canvas = this.graphicSpec.objects.canvas.properties;
  let child = new this.constructor().createCanvas({ plot: { width: grouped && horizontal ? sourceBounds.width : bounds.width,
      height: grouped && !horizontal ? sourceBounds.height : bounds.height },
    margin: template.materializationConfigs.canvas.margin, background: canvas.background });
  const theme = resolveEffectiveThemeFrame(template.materializationConfigs.theme);
  if (theme) child = child.applyTheme({ theme: { base: theme.name, tokens: theme.tokens } });
  child = inheritTextMetrics(template, child);
  // Keep source tables available for subsequent authoring. A summary used by
  // this constructor must not erase unused input variables from its new view.
  // These remain independent immutable snapshots, not cross-view dependencies.
  for (const input of template.semanticSpec.datasets) {
    if (input.id !== dataset.id && (input.source || !Array.isArray(input.values))) continue;
    child = child.createData({ id: input.id, values: input.values });
  }
  const options = { ...inferCompositionOptions(meaning,action,supplied,plot.inherit), id, data:dataset.id };
  const roles=constructorChannels(action,options,meaning);
  if(args.share===undefined) {
    for(const channel of Object.keys(share)) {
      const from=meaning.channels[channel],to=roles[channel];
      if(!from||!to||from.field!==to.field||JSON.stringify(from.measurement.operations)!==JSON.stringify(to.operations)||
        (meaning.coordinate?.type??'cartesian')!=='cartesian') delete share[channel];
    }
  }
  for(const channel of ['x','y','color']) {
    const role=meaning.channels[channel],selected=options[channel];
    if(!role || (channel!=='color'&&!share[channel]) || !selected || selected.field!==role.field)continue;
    const scale=findSemanticScale(template,role.scale);
    if(scale) { const {id:_scaleId,...definition}=scale; if(selected.scale?.palette!==undefined) delete definition.range; options[channel]={...selected,scale:{...definition,...selected.scale}}; }
  }
  child = child[action](options);
  if (share.color) {
    const presentation = adjacentLegendPresentation(sourceView, source.id, child);
    if (presentation) child = child.editLegend(presentation);
  }
  const original = new this.constructor({ ...this, actionStack: [], actionSequence: this._actionSequence });
  const parent = new this.constructor({ trace: this.trace, actionStack: this.actionStack, actionSequence: this._actionSequence });
  const entries = [{ id: sourceId, program: original }, { id, program: child }];
  if (["left", "top"].includes(position)) entries.reverse();
  return (horizontal ? hconcatAction : vconcatAction).call(parent, {
    programs: entries, align: args.align ?? "plot", ...(args.gap === undefined ? {} : { gap: args.gap }),
    share, legends: args.legends === undefined ? "collect" : args.legends
  });
});

export function registerAdjacentPlotActions(ProgramClass) {
  ProgramClass.prototype.createAdjacentPlot = createAdjacentPlot;
}
