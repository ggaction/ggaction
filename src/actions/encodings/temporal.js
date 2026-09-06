export function applyTemporalUnit(program, target, channel, unit, previous) {
  if (unit === previous?.temporalUnit) return program;
  return program.editSemantic({
    property: `layer[${target}].encoding.${channel}.temporalUnit`,
    ...(unit === undefined ? { remove: true } : { value: unit })
  });
}
