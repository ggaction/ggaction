import {
  applyBarHighlight,
  applyRectHighlight,
  applyPathHighlight,
  applyPointHighlight,
  applyRuleHighlight,
  dimUnselectedMarkItems,
  highlightMarks,
  placeSelectedMarkItemsLast,
  rematerializeMarkHighlights,
  selectMarks
} from "./actions.js";

export function registerSelectionActions(ProgramClass) {
  ProgramClass.prototype.selectMarks = selectMarks;
  ProgramClass.prototype.highlightMarks = highlightMarks;
  ProgramClass.prototype.applyBarHighlight = applyBarHighlight;
  ProgramClass.prototype.applyRectHighlight = applyRectHighlight;
  ProgramClass.prototype.applyPathHighlight = applyPathHighlight;
  ProgramClass.prototype.applyPointHighlight = applyPointHighlight;
  ProgramClass.prototype.applyRuleHighlight = applyRuleHighlight;
  ProgramClass.prototype.dimUnselectedMarkItems = dimUnselectedMarkItems;
  ProgramClass.prototype.placeSelectedMarkItemsLast = placeSelectedMarkItemsLast;
  ProgramClass.prototype.rematerializeMarkHighlights = rematerializeMarkHighlights;
}
