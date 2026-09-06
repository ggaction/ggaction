import { resolveCategoricalLegendConfig } from "./categorical/actions.js";
import { resolveGradientLegendCreation } from "./continuous/gradient.js";
import { resolveOpacityLegendCreation } from "./continuous/opacity.js";
import { normalizeIntervalLegend, resolveIntervalConfig } from "./continuous/interval.js";
import { resolveSizeLegendConfig } from "./size.js";
import { resolveStrokeWidthLegendConfig } from "./strokeWidth.js";

export function resolveLegendStepConfig(program, step) {
  switch (step.op) {
    case "createCategoricalLegend": {
      const config = resolveCategoricalLegendConfig(program, step.args);
      return { kind: config.kind, config };
    }
    case "createGradientLegend":
      return { kind: "gradient", config: resolveGradientLegendCreation(program, step.args).config };
    case "createOpacityLegend":
      return { kind: "opacity", config: resolveOpacityLegendCreation(program, step.args).config };
    case "createIntervalLegend":
      return { kind: "interval", config: resolveIntervalConfig(program, normalizeIntervalLegend(step.args)).config };
    case "createSizeLegend":
      return { kind: "size", config: resolveSizeLegendConfig(program, step.args) };
    case "createStrokeWidthLegend":
      return { kind: "strokeWidth", config: resolveStrokeWidthLegendConfig(program, step.args) };
    default: throw new Error(`Unsupported legend creation owner "${step.op}".`);
  }
}

