export { action } from "./core/action.js";
import { ChartProgram } from "./ChartProgram.js";
import { registerProgramExtension } from "./core/extensionRegistry.js";

export { ChartProgram };

export function registerExtension(definition) {
  registerProgramExtension(ChartProgram, definition);
}
