// Called explicitly by source mark materializers after their concrete geometry is complete.
// A surrounding plan owns any overlay rebuild that it has already scheduled.
export function materializeFollowingOverlays(program, source) {
  const pending = program.context?.pendingMaterializationPlan;
  const scheduled = new Set((pending?.steps.slice(pending.next) ?? [])
    .filter(step => step.op === "rematerializeOverlay").map(step => step.args.id));
  for (const layer of program.semanticSpec.layers) {
    if (layer.derivedBindings?.overlay?.source === source && !scheduled.has(layer.id)) {
      program = program.rematerializeOverlay({ id: layer.id });
    }
  }
  return program;
}

export function rematerializeHighlightBaseline(program, {
  target,
  operation,
  scales,
  resetProperty,
  resetValue
}) {
  const highlights = Object.entries(
    program.materializationConfigs.highlights ?? {}
  ).filter(([, config]) => config.target === target);
  if (highlights.length === 0) return undefined;

  let baseline = program;
  for (const [highlightId] of highlights) {
    baseline = baseline._withoutMaterializationConfig([
      "highlights",
      highlightId
    ]);
  }
  return baseline
    .editGraphics({
      target,
      property: resetProperty,
      value: resetValue
    })
    [operation]({ id: target, ...(scales === undefined ? {} : { scales }) })
    .rematerializeMarkHighlights({ target, highlights });
}
