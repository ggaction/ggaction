import {
  applyBarHighlight,
  applyRectHighlight,
  applyPathHighlight,
  applyPointHighlight,
  applyRuleHighlight,
  dimUnselectedMarkItems,
  editMarkSelection,
  highlightMarks,
  placeSelectedMarkItemsLast,
  rematerializeMarkHighlights,
  removeMarkHighlight,
  removeMarkSelection,
  selectMarks
} from "./actions.js";

export function registerSelectionActions(ProgramClass) {
  ProgramClass.prototype.selectMarks = selectMarks;
  ProgramClass.prototype.editMarkSelection = editMarkSelection;
  ProgramClass.prototype.removeMarkHighlight = removeMarkHighlight;
  ProgramClass.prototype.removeMarkSelection = removeMarkSelection;
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
