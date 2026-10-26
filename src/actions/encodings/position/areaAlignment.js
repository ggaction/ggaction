import { resolveTarget } from '../shared.js';
import { findDataset, requireDataset } from '../../../selectors/datasets.js';

// Completed-key data is tied to one independent coordinate. Its generated
// rows are not observations and must never be reused as a different measure.
export function rebindAlignedAreaPosition(program, channel, args) {
  if (!['x', 'y'].includes(channel) || args.field === undefined ||
      !program.semanticSpec.layers.some(layer => layer.mark.type === 'area')) return program;
  const { layer } = resolveTarget(program, args.target, ['point', 'line', 'bar', 'area', 'rule', 'rect', 'text', 'tick']);
  if (layer.mark.type !== 'area' || layer.encoding?.[`${channel}2`] ||
      !layer.encoding?.[channel === 'x' ? 'y2' : 'x2']) return program;
  const dataset = findDataset(program, layer.data);
  const complete = dataset?.transform?.length === 1 && dataset.transform[0].type === 'complete' ? dataset.transform[0] : undefined;
  if (!complete || complete.key !== layer.encoding[channel]?.field || args.field === complete.key) return program;
  if (!layer.layout?.mode || layer.layout.mode === 'overlay') {
    return program.rebindLayerData({ id: layer.id, data: dataset.source });
  }
  const measureChannel = channel === 'x' ? 'y' : 'x';
  const measures = [layer.encoding[measureChannel]?.field, layer.encoding[`${measureChannel}2`]?.field].filter(Boolean);
  if (measures.includes(args.field)) {
    throw new Error('A stacked Area cannot use its measurement as the completed position key: generated rows need separate key and measurement fields. Choose another position field or Overlay layout.');
  }
  if (complete.groupBy.includes(args.field)) {
    throw new Error('A stacked Area needs at least two positions within each series; its grouping field cannot also be the position key.');
  }
  const source = requireDataset(program, dataset.source);
  const unique = new Set();
  for (const row of source.values) {
    const key = JSON.stringify([...complete.groupBy, args.field].map(field => row[field]));
    if (unique.has(key)) throw new Error('The new Area position has duplicate rows within a series. Reaggregate the original observations at that grain before stacking, or use Overlay layout.');
    unique.add(key);
  }
  const stem = `${layer.id}AlignedPosition`, ids = new Set(program.semanticSpec.datasets.map(data => data.id));
  let id = stem;
  for (let index = 2; ids.has(id); index++) id = `${stem}${index}`;
  const fill = Object.fromEntries(Object.entries(complete.fill).filter(([field]) => field !== args.field));
  let next = program.createCompleteData({ id, source: dataset.source, key: args.field, groupBy: complete.groupBy, fill });
  next = next.rebindLayerData({ id: layer.id, data: id });
  return next._withMarkConfig(layer.id, { ...next.markConfigs[layer.id], alignedPositionData: [
    id, ...(next.markConfigs[layer.id]?.alignedPositionData ?? [])
  ] });
}
