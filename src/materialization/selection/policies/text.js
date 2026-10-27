import { DEFAULT_TEXT_MARK } from '../../../grammar/text.js';
import { resolveTextGraphicEntries } from '../../textGeometry.js';
import { finalizeItems } from '../items/common.js';
import { normalizeTextHighlightStyle } from '../styles.js';

export const textSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(['item']),
  resolveItems(program, layer, dataset, grain, resolveMarkItems, selectionResolvers) {
    const entries = resolveTextGraphicEntries(program, layer, program.markConfigs[layer.id] ?? DEFAULT_TEXT_MARK, { members: true, resolveMarkItems });
    const definitions = entries.map((entry, i) => ({ ...(entry.semanticIdentity ? { semanticIdentity: entry.semanticIdentity } : { rowKey: entry.rowKey }), fields: entry.fields,
      channels: entry.channels, properties: {}, members: entry.members }));
    return finalizeItems(program, layer, 'text', definitions, 'text', { selectionResolvers });
  },
  normalizeHighlightStyle: normalizeTextHighlightStyle,
  applyHighlightOp: 'applyPathHighlight',
  rematerializeOp: 'rematerializeTextMark'
});
