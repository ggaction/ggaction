import type { ActionOptions } from "./program.js";
import { ChartProgram } from "./program.js";

export { ChartProgram };

export interface ActionMetadata {
  op: string;
  description: string;
  scope?: "unit" | "composition" | "any";
}

export function action<TOptions extends ActionOptions = ActionOptions>(
  metadata: ActionMetadata,
  implementation: (this: ChartProgram, options: TOptions) => ChartProgram
): (this: ChartProgram, options?: TOptions) => ChartProgram;
