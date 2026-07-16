import {
  applyPointHighlight,
  dimUnselectedMarkItems,
  highlightMarks,
  placeSelectedMarkItemsLast,
  rematerializeMarkHighlights,
  selectMarks
} from "./actions.js";

export function registerSelectionActions(ProgramClass) {
  ProgramClass.prototype.selectMarks = selectMarks;
  ProgramClass.prototype.highlightMarks = highlightMarks;
  ProgramClass.prototype.applyPointHighlight = applyPointHighlight;
  ProgramClass.prototype.dimUnselectedMarkItems = dimUnselectedMarkItems;
  ProgramClass.prototype.placeSelectedMarkItemsLast = placeSelectedMarkItemsLast;
  ProgramClass.prototype.rematerializeMarkHighlights = rematerializeMarkHighlights;
}
