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
  rematerializeLegendHighlights
} from "./symbols.js";
import { editLegend } from "../edit.js";

export function registerCategoricalLegendActions(ProgramClass) {
  ProgramClass.prototype.createLegend = createLegend;
  ProgramClass.prototype.editLegend = editLegend;
  ProgramClass.prototype.createCategoricalLegend = createCategoricalLegend;
  ProgramClass.prototype.removeCategoricalLegend = removeCategoricalLegend;
  ProgramClass.prototype.createLegendBackground = createLegendBackground;
  ProgramClass.prototype.rematerializeLegendBackground = rematerializeLegendBackground;
  ProgramClass.prototype.createLegendSymbols = createLegendSymbols;
  ProgramClass.prototype.rematerializeLegendSymbols = rematerializeLegendSymbols;
  ProgramClass.prototype.rematerializeLegendHighlights = rematerializeLegendHighlights;
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
}
