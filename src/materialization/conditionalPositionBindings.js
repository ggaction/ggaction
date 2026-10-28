import { POSITION_ENCODING_CHANNELS } from "../core/vocabulary.js";
import { selectConditionalBranches } from "./conditionalBranches.js";
import { conditionalSelectionMembership } from "./conditionalSelection.js";

// Per-item transient source views retain the binding chosen by the source's
// native predicate owner. They never enter semanticSpec or graphicSpec.
export function resolveItemPositionBindings(program, source, items, resolvers) {
  const channels = POSITION_ENCODING_CHANNELS.filter(channel => source.conditionals?.[channel] !== undefined);
  if (!channels.length) return undefined;
  const encodings = items.map(() => ({ ...source.encoding }));
  for (const channel of channels) {
    const definition = source.conditionals[channel];
    const membership = conditionalSelectionMembership(program, source, definition, items, resolvers, { rowMembership: true });
    const { branches, indices } = selectConditionalBranches(program, source, channel, items, membership);
    indices.forEach((index, item) => { encodings[item][channel] = branches[index === -1 ? branches.length - 1 : index]; });
  }
  const conditionals = Object.fromEntries(Object.entries(source.conditionals).filter(([channel]) => !channels.includes(channel)));
  return encodings.map(encoding => ({ ...source, encoding, conditionals }));
}
