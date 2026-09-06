export function assertEncodingSelectionCompatibility(program, target, channels) {
  for (const [id, selection] of Object.entries(
    program.materializationConfigs.selections ?? {}
  )) {
    if (selection.target === target && channels.includes(selection.selector?.channel)) {
      throw new Error(
        `Cannot remove ${selection.selector.channel} encoding while selection "${id}" references that channel.`
      );
    }
  }
}
