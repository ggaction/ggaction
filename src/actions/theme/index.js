import { setActionCompletionHook } from "../../core/action.js";
import { applyTheme, removeTheme } from "./actions.js";
import { reconcileProgramTheme } from "./reconcile.js";

export function registerThemeActions(ProgramClass) {
  ProgramClass.prototype.applyTheme = applyTheme;
  ProgramClass.prototype.removeTheme = removeTheme;
  setActionCompletionHook(reconcileProgramTheme);
}
