import { STACK_MODES } from "../../../../core/vocabulary.js";
import { normalizeHistogramBin } from "../../../../grammar/histogram.js";

export function resolveBin(bin) {
  return normalizeHistogramBin(bin);
}

export function validateStack(stack, label) {
  if (stack !== null && !STACK_MODES.includes(stack)) {
    throw new Error(`${label} has unsupported stack "${stack}".`);
  }
  return stack;
}

export function emptyPositionPolicy() {
  return { bin: undefined, aggregate: undefined, stack: undefined };
}
