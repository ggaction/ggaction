import {colorSizeScaleIds} from "../../grammar/colorSizeLegend.js";
import { resolveLegendCreationPlan } from "./legends/categorical/actions.js";
import { resolveLegendStepConfig } from "./legends/creation.js";
import { legendResourcePolicy } from "../../materialization/guides/resources.js";
import { assertGuideOptions, guideConflict, sameGuideValue } from "./reuse.js";

function compatibleLegend(program, kind, requested, existing, explicit) {
  const expectedScales = kind === "colorSize" ? colorSizeScaleIds(requested) : requested.scales ?? [requested.scale];
  const actualScales = kind === "colorSize" ? colorSizeScaleIds(existing) : existing.scales ?? [existing.scale];
  if (!sameGuideValue(expectedScales, actualScales) ||
    !sameGuideValue(requested.channels, existing.channels)) {
    guideConflict(`${kind} legend uses different channels or scales`);
  }
  const domain = config => config.domain ?? program.resolvedScales[config.scale]?.domain;
  if (!sameGuideValue(domain(requested), domain(existing))) {
    guideConflict(`${kind} legend uses a different domain or order`);
  }
  if (requested.symbol?.layers !== undefined && !sameGuideValue(
    requested.symbol.layers.map(layer => layer.type), existing.symbol?.layers?.map(layer => layer.type)
  )) guideConflict(`${kind} legend uses a different symbol recipe`);
  if (explicit.representation !== undefined && (requested.representation ?? "gradient") !== (existing.representation ?? "gradient")) guideConflict(`${kind} legend uses a different color representation`);
  if (requested.representation === "symbols" || kind === "colorSize") {
    if (explicit.values !== undefined && !sameGuideValue(requested.sampling.values, existing.sampling?.values)) guideConflict(`${kind} legend uses different exact samples`);
    if (explicit.count !== undefined && (existing.sampling?.mode !== "auto" || requested.sampling.count !== existing.sampling?.count)) guideConflict(`${kind} legend uses a different sample count`);
  }
  const appearance = {};
  for (const [key, value] of Object.entries(explicit)) {
    if (["target", "channels", "representation", "values"].includes(key) || requested[key] === undefined) continue;
    if (key === "title") {
      appearance.titleVisible = value !== false;
      if (value !== false) appearance.title = value;
    } else if (key === "symbol" && requested.symbol?.layers !== undefined) {
      appearance.symbol = value === "auto" ? requested.symbol
        : value.layers !== undefined ? value
          : { layers: [{ type: requested.symbol.layers[0].type, ...value }] };
    } else if (key === "border" && value === true) {
      if (existing.border === false) guideConflict(`${kind} legend border is disabled`);
      appearance.border = {};
    } else appearance[key] = value;
  }
  assertGuideOptions(appearance, existing, `${kind} legend`);
}

export function planFacadeLegend(program, layer, args, explicit = args) {
  const plan = resolveLegendCreationPlan(program, args, [layer]);
  const steps = [];
  for (const step of plan.steps) {
    const { kind, config } = resolveLegendStepConfig(program, step);
    const stored = program.guideConfigs.legend?.[kind];
    const policy = legendResourcePolicy(kind);
    const occupied = program.semanticSpec.guides.legend?.[policy.semanticKind];
    if (stored === undefined) {
      if (occupied !== undefined ||
        policy.family === "categorical" && (
          program.semanticSpec.guides.legend?.series !== undefined ||
          program.semanticSpec.guides.legend?.color !== undefined
        )) {
        guideConflict(`${kind} legend slot belongs to an incompatible legend family`);
      }
      steps.push(step);
    } else {
      if (occupied === undefined) guideConflict(`${kind} legend has no semantic owner`);
      compatibleLegend(program, kind, config, stored, explicit);
    }
  }
  const first = plan.steps[0];
  const scopedArgs = first?.op === "createCategoricalLegend" && first.args.symbol !== undefined
    ? { ...args, symbol: first.args.symbol } : args;
  // Reused blocks retain their original target. The direct createLegend combined
  // owner check is inapplicable to independently verified shared blocks.
  return { ...plan, combined: false, steps, args: scopedArgs };
}
