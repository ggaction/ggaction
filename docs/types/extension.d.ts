import type { ActionOptions } from "./program.js";
import { ChartProgram } from "./program.js";

export { ChartProgram };
export type {
  FillPaint,
  LinearGradientPaint,
  LinearGradientPoint,
  LinearGradientStop
} from "./program.js";

export interface ActionMetadata {
  op: string;
  description: string;
  scope?: "unit" | "composition" | "any";
}

export interface RegisteredExtensionActions {}

export type RegisteredExtensionAction = (
  this: ChartProgram,
  ...args: any[]
) => ChartProgram;

export interface ExtensionDefinition<
  TActions extends Readonly<Record<string, RegisteredExtensionAction>> =
    Readonly<Record<string, RegisteredExtensionAction>>
> {
  name: string;
  actions: TActions;
}

export function action<TOptions extends ActionOptions = ActionOptions>(
  metadata: ActionMetadata,
  implementation: (this: ChartProgram, options: TOptions) => ChartProgram
): <TProgram extends ChartProgram>(
  this: TProgram,
  options?: TOptions
) => TProgram;

export function registerExtension<
  TActions extends Readonly<Record<string, RegisteredExtensionAction>>
>(definition: ExtensionDefinition<TActions>): void;
