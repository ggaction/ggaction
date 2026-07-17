export function rematerializeHighlightBaseline(program, {
  target,
  operation,
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
    [operation]({ id: target })
    .rematerializeMarkHighlights({ target, highlights });
}
