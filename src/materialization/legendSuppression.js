import { legendBlockChannels } from "../grammar/legendBlocks.js";

// Replayable authoring intent, independent of the current concrete legend blocks.
export function suppressLegendChannels(program, target, channels) {
  const previous = program.guideConfigs.suppressedLegends?.[target]?.channels ?? [];
  return program._withMaterializationConfig(["guides", "suppressedLegends", target],
    { channels: [...new Set([...previous, ...channels])] });
}

export function restoreCreatedLegendChannels(program) {
  let next = program;
  for (const [target, { channels: suppressed }] of Object.entries(program.guideConfigs.suppressedLegends ?? {})) {
    const active = new Set(Object.entries(program.guideConfigs.legend ?? {})
      .filter(([, config]) => config.target === target)
      .flatMap(([kind, config]) => legendBlockChannels(kind, config)));
    const remaining = suppressed.filter(channel => !active.has(channel));
    if (remaining.length === suppressed.length) continue;
    next = remaining.length ? next._withMaterializationConfig(["guides", "suppressedLegends", target], { channels: remaining })
      : next._withoutMaterializationConfig(["guides", "suppressedLegends", target]);
  }
  return next;
}
