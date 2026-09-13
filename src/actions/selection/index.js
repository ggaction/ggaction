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
  rematerializeThemeHighlights,
  removeMarkHighlight,
  removeMarkSelection,
  selectMarks
} from "./actions.js";
import { registerThemeHighlightReconciler } from "../theme/reconcile.js";

export function registerSelectionActions(ProgramClass) {
  registerThemeHighlightReconciler(rematerializeThemeHighlights);
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
