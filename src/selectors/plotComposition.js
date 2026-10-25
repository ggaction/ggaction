import { findLayer } from './layers.js';
import { ownership, ownedChildren } from './markOwners.js';
import { resolveEligibleLayer } from './layers.js';
import { findCoordinate } from './coordinates.js';

const sameUnit = new Set(['mean', 'median', 'min', 'max', 'q1', 'q3', 'quantile', 'lower', 'upper', 'center', 'value', 'ciLower', 'ciUpper', 'stderr', 'stdev', 'iqr']);
export function measurementUnit(operations = []) {
  return operations.filter(op => !sameUnit.has(op)).join(':') || 'value';
}

// Resolve provenance, never generated field-name conventions. Stops at an
// ordinary source (including a user-authored filtered/transformed dataset).
export function compositionChannel(program, encoding, data) {
  if (!encoding?.field && encoding?.aggregate !== 'count') return undefined;
  let field = encoding.field, current = data, fields, derived;
  const operations = encoding.aggregate ? [encoding.aggregate] : [];
  const visited = new Set();
  while (current && !visited.has(current)) {
    visited.add(current);
    const dataset = program.semanticSpec.datasets.find(d => d.id === current);
    let recognized = false;
    for (const t of [...(dataset?.transform ?? [])].reverse()) {
      const key = Array.isArray(t.as) ? t.as.indexOf(field) : Object.entries(t.as ?? {}).find(([, value]) => value === field)?.[0];
      if (t.type === 'summary') {
        const a = t.aggregates.find(a => a.as === field);
        if (a) { field = a.field ?? field; operations.unshift(typeof a.op==='string'?a.op:a.op.op); }
        recognized = true;
      } else if (['boxSummary', 'boxOutlier', 'gradientProfile', 'interval'].includes(t.type)) {
        if (key !== undefined && key !== 'category') { field = t.field; operations.unshift(key === 'count' ? 'count' : key === 'center' ? t.center ?? 'median' : 'quantile'); }
        recognized = true;
      } else if (t.type === 'density') {
        if (key === 0 || key === 1) { field = t.field; if (key === 1) { operations.unshift('density'); derived = { normalization: t.normalization, weight: t.weight }; } }
        recognized = true;
      } else if (t.type === 'ecdf') {
        if (key !== undefined) { field = t.field; if (key !== 'value') operations.unshift(key === 'probability' ? 'probability' : 'cumulative-count'); }
        recognized = true;
      } else if (t.type === 'bin2d') {
        if (key?.startsWith('x')) field = t.x;
        else if (key?.startsWith('y')) field = t.y;
        else if (key === 'count') { field = undefined; fields = [t.x, t.y]; operations.unshift('count'); }
        recognized = true;
      } else if (t.type === 'horizon') {
        if (key === 'x') field = t.x.field;
        else { field = t.y.field; operations.unshift('folded'); derived = { bands:t.bands, baseline:t.baseline, extent:t.extent, resolve:t.resolve }; }
        recognized = true;
      } else if (t.type === 'fold') {
        if (key === 'key' || key === 'value') { field = undefined; fields = t.fields; operations.unshift(key === 'key' ? 'dimensions' : 'profile'); }
        recognized = true;
      } else if (t.type === 'regression' || t.type === 'complete') recognized = true;
    }
    if (!recognized || !dataset.source) break;
    current = dataset.source;
  }
  if (encoding.stack === 'normalize' || encoding.stack?.mode === 'normalize') operations.push('normalized');
  return { ...(field === undefined ? {} : { field }), ...(fields ? { fields } : {}), fieldType: encoding.fieldType,
    scale: encoding.scale, data: current, measurement: { unit: measurementUnit(operations), operations,
      ...(derived ? { parameters: derived } : {}) },
    ...(encoding.bin === undefined ? {} : { bin: encoding.bin }),
    ...(encoding.temporalUnit === undefined ? {} : { temporalUnit: encoding.temporalUnit }) };
}

export function plotComposition(program, target) {
  const owners = ownership(program);
  // Public IDs of compound facades can differ from their concrete owner.
  if (target && !findLayer(program, target)) target = program.semanticSpec.layers.find(l => program.markConfigs[l.id]?.raincloudPlot?.id === target)?.id ?? target;
  while (owners.has(target)) target = owners.get(target);
  const layer = resolveEligibleLayer(program, { target, label: 'plot composition', predicate: l => !owners.has(l.id) && !l.derivedBindings?.overlay && l.data !== undefined });
  const owned = new Set([layer.id]);
  const visit = id => { for (const child of ownedChildren(program, id)) if (!owned.has(child)) { owned.add(child); visit(child); } };
  visit(layer.id);
  const channels = Object.fromEntries(Object.entries(layer.encoding ?? {}).flatMap(([channel, encoding]) => {
    const value = compositionChannel(program, encoding, layer.data); return value ? [[channel, value]] : [];
  }));
  if (layer.mark.type === 'arc' && ['count','sum'].includes(layer.encoding.theta?.aggregate)) {
    channels.theta.measurement = { unit:'partition', operations:['partition'], parameters:{
      aggregate:layer.encoding.theta.aggregate, ...(layer.encoding.theta.weight ? {weight:layer.encoding.theta.weight} : {})
    } };
  }
  const dimensionEncoding = layer.encoding?.parallel?.dimensions;
  const dimensions = dimensionEncoding?.map(e => compositionChannel(program, e, layer.data));
  const data = Object.values(channels).find(c => c.data)?.data ?? layer.data;
  const config = program.markConfigs[layer.id] ?? {};
  return { version:1, owner:layer.id, ownedMarks:[...owned], data, coordinate:findCoordinate(program,layer.coordinate),
    mark:layer.mark.type, channels, ...(dimensions ? { dimensions } : {}),
    ...(config.compositionRole ? { role:config.compositionRole } : {}),
    ...(layer.encoding.group ? { groupBy:layer.encoding.group.field ?? layer.encoding.group.fields } : {}) };
}

// Re-encoding one independent consumer must not silently change the meaning of
// a resource still used by another plot. A new explicit scale remains possible.
export function assertSharedPositionMeaning(program, layer, channel, encoding) {
  const previous = layer.encoding?.[channel];
  const companion = {x:'y',y:'x',theta:'radius',radius:'theta'}[channel];
  // New marks can inherit an incomplete position while their first bindings are authored.
  if (!layer.encoding?.[companion] && !(layer.mark.type==='arc' && layer.encoding?.theta?.aggregate)) return;
  if (!previous?.scale || previous.scale !== encoding.scale) return;
  const before = compositionChannel(program, previous, layer.data);
  const after = compositionChannel(program, encoding, layer.data);
  const signature = role => role && JSON.stringify([role.field, role.fields, role.fieldType,
    role.measurement.unit, role.temporalUnit]);
  if (!before || !after || signature(before) === signature(after)) return;
  const owners = ownership(program);
  const owner = id => { while (owners.has(id)) id = owners.get(id); return id; };
  const conflict = program.semanticSpec.layers.find(other => other.id !== layer.id &&
    owner(other.id) !== owner(layer.id) && !other.derivedBindings?.overlay &&
    other.encoding?.[channel]?.scale === previous.scale &&
    signature(compositionChannel(program, other.encoding[channel], other.data)) === signature(before));
  if (conflict) throw new Error(`Scale "${previous.scale}" is shared with plot "${owner(conflict.id)}". Keep the same positional meaning or supply a different scale.id.`);
}
