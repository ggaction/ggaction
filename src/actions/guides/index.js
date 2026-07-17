import { registerGuideAxisActions } from "./axes/index.js";
import { registerGuideCollectionActions } from "./guides.js";
import { registerGridActions } from "./grids/index.js";
import { registerLegendActions } from "./legends/index.js";
import { registerPolarGridActions } from "./polar/index.js";

export function registerGuideActions(ProgramClass) {
  registerGuideAxisActions(ProgramClass);
  registerLegendActions(ProgramClass);
  registerGridActions(ProgramClass);
  registerPolarGridActions(ProgramClass);
  registerGuideCollectionActions(ProgramClass);
}
