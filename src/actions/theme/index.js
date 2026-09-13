import { setActionCompletionHook } from "../../core/action.js";
import {
  applyTheme,
  registerCompositionThemeHandlers,
  removeTheme
} from "./actions.js";
import { reconcileProgramTheme } from "./reconcile.js";

export function registerThemeActions(ProgramClass, compositionHandlers) {
  if (compositionHandlers !== undefined) {
    registerCompositionThemeHandlers(compositionHandlers);
  }
  ProgramClass.prototype.applyTheme = applyTheme;
  ProgramClass.prototype.removeTheme = removeTheme;
  setActionCompletionHook(reconcileProgramTheme);
}
