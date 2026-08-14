import { registerGuideCollectionActions } from "./guides.js";
import { registerGridActions } from "./grids/index.js";
import {
  registerPolarAxisActions,
  registerPolarGridActions
} from "./polar/index.js";
import { registerGuideAxisActions } from "./axes/index.js";
import { registerLegendActions } from "./legends/index.js";

export function registerGuideActions(ProgramClass) {
  registerGuideAxisActions(ProgramClass);
  registerLegendActions(ProgramClass);
  registerGridActions(ProgramClass);
  registerPolarGridActions(ProgramClass);
  registerPolarAxisActions(ProgramClass);
  registerGuideCollectionActions(ProgramClass);
}
