import { DEFAULT_TEXT_MARK } from '../../../grammar/text.js';
import { resolveTextGraphicEntries, resolveIndependentTextSourceDefinitions, resolveIndependentTextItemDefinitions } from '../../textGeometry.js';
import { finalizeItems, identifyItems } from '../items/common.js';
import { normalizeTextHighlightStyle } from '../styles.js';

export const textSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(['item']),
  resolveSourceItems(program, layer, dataset, grain, resolvers) {
    if (layer.source === undefined && ["x", "y", "text", "dx", "dy", "color"].some(channel => layer.conditionals?.[channel] !== undefined)) {
      return identifyItems(program, layer, "text", resolveIndependentTextSourceDefinitions(program, layer, dataset, program.markConfigs[layer.id] ?? DEFAULT_TEXT_MARK));
    }
    return this.resolveItems(program, layer, dataset, grain, resolvers.resolveMarkItems, { ...resolvers, sourceOnly: true });
  },
  resolveItems(program, layer, dataset, grain, resolveMarkItems, selectionResolvers) {
    if (layer.source === undefined && Object.keys(layer.conditionals ?? {}).length > 0) {
      return finalizeItems(program, layer, "text", resolveIndependentTextItemDefinitions(program, layer, dataset, program.markConfigs[layer.id] ?? DEFAULT_TEXT_MARK, selectionResolvers), "text", { selectionResolvers });
    }
    const entries = resolveTextGraphicEntries(program, layer, program.markConfigs[layer.id] ?? DEFAULT_TEXT_MARK, { members: true, sourceOnly: selectionResolvers?.sourceOnly, skipAppearance: true, resolveMarkItems, resolveMarkSourceItems: selectionResolvers?.resolveMarkSourceItems });
    const definitions = entries.map((entry, i) => ({ ...(entry.semanticIdentity ? { semanticIdentity: entry.semanticIdentity } : { rowKey: entry.rowKey }), fields: entry.fields,
      channels: entry.channels, properties: {}, members: entry.members }));
    return finalizeItems(program, layer, 'text', definitions, 'text', { selectionResolvers });
  },
  normalizeHighlightStyle: normalizeTextHighlightStyle,
  applyHighlightOp: 'applyPathHighlight',
  rematerializeOp: 'rematerializeTextMark'
});
