import { DEFAULT_TEXT_MARK } from '../../../grammar/text.js';
import { resolveTextGraphicEntries } from '../../textGeometry.js';
import { finalizeItems, itemKey } from '../items/common.js';
import { normalizeTextHighlightStyle } from '../styles.js';

export const textSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(['item']),
  resolveItems(program, layer, dataset, grain, resolveMarkItems) {
    const entries = resolveTextGraphicEntries(program, layer, program.markConfigs[layer.id] ?? DEFAULT_TEXT_MARK, { members: true, resolveMarkItems });
    const definitions = entries.map((entry, i) => ({ key: itemKey(layer, 'text', i), fields: entry.fields,
      channels: entry.channels, properties: {}, members: entry.members }));
    return finalizeItems(program, layer, 'text', definitions, 'text');
  },
  normalizeHighlightStyle: normalizeTextHighlightStyle,
  applyHighlightOp: 'applyPathHighlight',
  rematerializeOp: 'rematerializeTextMark'
});
