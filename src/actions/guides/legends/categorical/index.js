import { highlightSourceProperties } from "../../../../materialization/selection/styles.js";
import{hasLegendClipGraphics}from"../../../../materialization/legendClip.js";
import { action } from "../../../../core/action.js";
import { editLegend } from "../edit.js";
import { exactLegendSelection, legendLayerStyle } from "../../../../materialization/selection/legend.js";
import {
  createCategoricalLegend,
  createLegend,
  removeCategoricalLegend,
  rematerializeLegend
} from "./actions.js";
import {
  createLegendBackground,
  createLegendLabels,
  createLegendTitle,
  rematerializeLegendBackground,
  rematerializeLegendLabels,
  rematerializeLegendTitle
} from "./components.js";
import {
  createLegendSymbolLines,
  createLegendSymbolPoints,
  createLegendSymbolSwatches,
  createLegendSymbols,
  rematerializeLegendSymbolLines,
  rematerializeLegendSymbolPoints,
  rematerializeLegendSymbolSwatches,
  rematerializeLegendSymbols,
  rematerializeBasicLegendHighlights
} from "./symbols.js";
import { activeConfig, noOptions, symbolGraphic } from "./layout.js";
import {
  rematerializeLegendGroups,
  rematerializeHorizontalLegendLane,
  rematerializeSideLegendLane
} from "../lane.js";

function createLegendHighlightAction() {
  return action(
    {
      op: "rematerializeLegendHighlights",
      description: "Reflect exact categorical mark highlights in legend symbols."
    },
    function (args = {}) {
      noOptions(args, "rematerializeLegendHighlights");
      if(hasLegendClipGraphics(this))return this.rematerializeLegend();
      if (this.context.deferGuideLayoutValidation !== true &&
          Object.values(this.guideConfigs.legend ?? {}).some(config => ["left", "right"].includes(config.position))) {
        return this.rematerializeLegend();
      }
      const kinds = args.kind === undefined
        ? ["series", "color", "stroke"].filter(
            kind => this.guideConfigs.legend?.[kind] !== undefined
          )
        : [args.kind];
      let next = this;
      for (const kind of kinds) {
        const { config } = activeConfig(next, kind);
        const highlights = Object.values(
          next.materializationConfigs.highlights ?? {}
        ).map(highlight => ({
          highlight,
          states: exactLegendSelection(next, config, highlight)
        })).filter(entry => entry.states !== undefined);
        if (highlights.length === 0) continue;

        next = next.rematerializeLegendSymbols({ kind: config.kind });
        for (const { highlight, states } of highlights) {
          for (const layer of config.symbol.layers) {
            const id = symbolGraphic(config, layer.type);
            const graphic = next.graphicSpec.objects[id];
            const selectedStyle = legendLayerStyle(layer, highlight.style);
            const dimOpacity = highlight.dimOthers === false
              ? undefined
              : highlight.dimOthers.opacity;
            next = next.editGraphics({
              target: id,
              property: "items",
              value: graphic.items.map((child, index) => ({
                type: child.type ?? graphic.type,
                properties: states[index]
                  ? { ...highlightSourceProperties(child.properties, selectedStyle), ...selectedStyle }
                  : dimOpacity === undefined
                    ? child.properties
                    : { ...child.properties, opacity: dimOpacity }
              }))
            });
          }
        }
      }
      return next;
    }
  );
}

export function registerBasicCategoricalLegendActions(ProgramClass) {
  ProgramClass.prototype.createLegend = createLegend;
  ProgramClass.prototype.createCategoricalLegend = createCategoricalLegend;
  ProgramClass.prototype.removeCategoricalLegend = removeCategoricalLegend;
  ProgramClass.prototype.createLegendBackground = createLegendBackground;
  ProgramClass.prototype.rematerializeLegendBackground = rematerializeLegendBackground;
  ProgramClass.prototype.createLegendSymbols = createLegendSymbols;
  ProgramClass.prototype.rematerializeLegendSymbols = rematerializeLegendSymbols;
  ProgramClass.prototype.rematerializeLegendHighlights =
    rematerializeBasicLegendHighlights;
  ProgramClass.prototype.createLegendSymbolLines = createLegendSymbolLines;
  ProgramClass.prototype.rematerializeLegendSymbolLines = rematerializeLegendSymbolLines;
  ProgramClass.prototype.createLegendSymbolPoints = createLegendSymbolPoints;
  ProgramClass.prototype.rematerializeLegendSymbolPoints = rematerializeLegendSymbolPoints;
  ProgramClass.prototype.createLegendSymbolSwatches = createLegendSymbolSwatches;
  ProgramClass.prototype.rematerializeLegendSymbolSwatches = rematerializeLegendSymbolSwatches;
  ProgramClass.prototype.createLegendLabels = createLegendLabels;
  ProgramClass.prototype.rematerializeLegendLabels = rematerializeLegendLabels;
  ProgramClass.prototype.createLegendTitle = createLegendTitle;
  ProgramClass.prototype.rematerializeLegendTitle = rematerializeLegendTitle;
  ProgramClass.prototype.rematerializeLegend = rematerializeLegend;
  ProgramClass.prototype.rematerializeLegendGroups = rematerializeLegendGroups;
  ProgramClass.prototype.rematerializeSideLegendLane =
    rematerializeSideLegendLane;
  ProgramClass.prototype.rematerializeHorizontalLegendLane =
    rematerializeHorizontalLegendLane;
}

export function registerCategoricalLegendActions(ProgramClass) {
  registerBasicCategoricalLegendActions(ProgramClass);
  ProgramClass.prototype.rematerializeLegendHighlights =
    createLegendHighlightAction();
  ProgramClass.prototype.editLegend = editLegend;
}
