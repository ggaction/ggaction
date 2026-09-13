import { registerTextMarkActions as registerTextCoreActions } from "./actions.js";
import { registerTextLabelLayoutActions } from "./layout.js";
import { registerTextLabelRemovalActions } from "./removal.js";

export function registerTextMarkActions(ProgramClass) {
  registerTextCoreActions(ProgramClass);
  registerTextLabelLayoutActions(ProgramClass);
  registerTextLabelRemovalActions(ProgramClass);
}
