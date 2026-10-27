import { resolveLegendCreationPlan } from "./categorical/actions.js";
import { resolveLegendStepConfig } from "./creation.js";
import { legendBlockChannels } from "../../../grammar/legendBlocks.js";

// Resolve the ordinary legend inference first, then exclude only suppressed
// owner/channel pairs. Explicit createLegend bypasses this automatic policy.
export function automaticLegendOptions(program, args, layers = program.semanticSpec.layers) {
  if (args === undefined || !Object.keys(program.guideConfigs.suppressedLegends ?? {}).length) return args;
  const plan = resolveLegendCreationPlan(program, args, layers);
  const owners = new Map();
  let changed = false;
  for (const step of plan.steps) {
    const { kind, config } = resolveLegendStepConfig(program, step);
    const suppressed = program.guideConfigs.suppressedLegends?.[config.target]?.channels ?? [];
    const channels = legendBlockChannels(kind, config);
    const retained = channels.filter(channel => !suppressed.includes(channel));
    changed ||= retained.length !== channels.length;
    if (!owners.has(config.target)) owners.set(config.target, new Set());
    retained.forEach(channel => owners.get(config.target).add(channel));
  }
  if (!changed) return args;
  const active = [...owners].filter(([, channels]) => channels.size);
  if (!active.length) return undefined;
  if (active.length !== 1) throw new Error("Automatic legend requires one unambiguous target.");
  const [target, channels] = active[0];
  const { combine: _combine, ...options } = args;
  return { ...options, target, channels: [...channels] };
}
