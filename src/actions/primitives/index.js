import { registerCreateGraphicsAction } from "./createGraphics.js";
import { registerEditGraphicsAction } from "./editGraphics.js";
import { registerSemanticPrimitiveAction } from "./semantic.js";

export function registerPrimitiveActions(ProgramClass) {
  registerSemanticPrimitiveAction(ProgramClass);
  registerCreateGraphicsAction(ProgramClass);
  registerEditGraphicsAction(ProgramClass);
}
