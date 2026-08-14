import { action } from "../../../../core/action.js";
import { resolveStoredSelection } from
  "../../../../materialization/selection/state.js";
import {
  createCategoricalLegend,
  createLegend,
  removeCategoricalLegend,
  rematerializeLegend
} from "./actions.js";
import { editLegend } from "../edit.js";
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
  rematerializeHorizontalLegendLane,
  rematerializeSideLegendLane
} from "../lane.js";

function exactLegendSelection(program, config, highlight) {
  if (highlight.target !== config.target) return undefined;
  const resolved = resolveStoredSelection(program, highlight.selection);
  const selected = new Set(resolved.keys);
  const groups = config.domain.map(value =>
    resolved.items.filter(item => item.fields?.[config.field] === value)
  );
  if (
    groups.some(group => group.length === 0) ||
    resolved.items.some(item => !config.domain.includes(item.fields?.[config.field]))
  ) return undefined;
  const states = groups.map(group => {
    const count = group.filter(item => selected.has(item.key)).length;
    return count === 0 ? false : count === group.length ? true : undefined;
  });
  return states.includes(undefined) ? undefined : states;
}

function legendLayerStyle(layer, style) {
  const properties = layer.type === "line"
    ? ["stroke", "strokeWidth", "strokeDash", "opacity"]
    : ["fill", "stroke", "strokeWidth", "opacity"];
  return Object.fromEntries(
    properties.flatMap(key => Object.hasOwn(style, key) ? [[key, style[key]]] : [])
  );
}

function createLegendHighlightAction() {
  return action(
    {
      op: "rematerializeLegendHighlights",
      description: "Reflect exact categorical mark highlights in legend symbols."
    },
    function (args = {}) {
      noOptions(args, "rematerializeLegendHighlights");
      const hasCategorical =
        this.guideConfigs.legend?.series !== undefined ||
        this.guideConfigs.legend?.color !== undefined;
      if (!hasCategorical) return this;
      const { config } = activeConfig(this);
      const highlights = Object.values(
        this.materializationConfigs.highlights ?? {}
      ).map(highlight => ({
        highlight,
        states: exactLegendSelection(this, config, highlight)
      })).filter(entry => entry.states !== undefined);
      if (highlights.length === 0) return this;

      let next = this.rematerializeLegendSymbols();
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
                ? { ...child.properties, ...selectedStyle }
                : dimOpacity === undefined
                  ? child.properties
                  : { ...child.properties, opacity: dimOpacity }
            }))
          });
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
