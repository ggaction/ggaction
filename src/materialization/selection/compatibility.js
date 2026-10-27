import { storedSelectionSelector } from "../../selectors/selectionResources.js";
export function assertEncodingSelectionCompatibility(program, target, channels) {
  for (const [id, selection] of Object.entries(
    program.materializationConfigs.selections ?? {}
  )) {
    if (selection.target === target && channels.includes(storedSelectionSelector(program, selection).channel)) {
      throw new Error(
        `Cannot remove ${storedSelectionSelector(program, selection).channel} encoding while selection "${id}" references that channel.`
      );
    }
  }
}
