import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const root = new URL('../../../../../', import.meta.url);
const src = new URL('src/', root).href;
const replace = (text, from, to) => { assert.ok(text.includes(from), `Missing prototype seam: ${from}`); return text.replace(from, to); };
export function transform(file, content) {
  if (file === 'grammar/scales/continuous.js') {
    let factory = content.slice(content.indexOf('export function mapLinearValues('));
    factory = replace(factory, 'export function mapLinearValues(values, domain, range, options = {})', 'export function prepareLinearScalar(domain, range, options = {})');
    factory = replace(factory, '  if (!hasUnknown && !values.every(Number.isFinite)) {\n    throw new TypeError("Linear scale values must be finite numbers.");\n  }\n', '');
    factory = replace(factory, '    return cloneAndFreeze(values.map(value =>\n      Number.isFinite(value) ? midpoint : options.unknown\n    ));', '    return value => { if (!Number.isFinite(value) && !hasUnknown) throw new TypeError("Linear scale values must be finite numbers."); return Number.isFinite(value) ? midpoint : options.unknown; };');
    factory = replace(factory, 'return cloneAndFreeze(values.map(value => {', 'return value => {');
    factory = replace(factory, '  }));\n}', '  };\n}');
    return content + '\n' + factory;
  }
  if (file === 'grammar/scales/transformed.js') {
    let factory = content.slice(content.indexOf('export function mapTransformedValues('), content.indexOf('\nexport function transformedTicks('));
    factory = replace(factory, 'export function mapTransformedValues(\n  values,', 'export function prepareTransformedScalar(');
    factory = replace(factory, '  if (!Array.isArray(values)) {\n    throw new TypeError("Scale values must be an array.");\n  }\n', '');
    factory = replace(factory, 'return cloneAndFreeze(values.map(value => {', 'return value => {');
    factory = replace(factory, '  }));\n}', '  };\n}');
    return content + '\n' + factory;
  }
  if (file === 'grammar/scales/mapping.js') return content + `
import { prepareLinearScalar } from './continuous.js';
import { prepareTransformedScalar } from './transformed.js';
import { ownRecord, ownArray } from '../../core/ownData.js';
import { rejectUnknownProperties } from '../../core/validation.js';
const scalarTokens = new WeakMap();
export function prepareContinuousScaleScalar(input) {
  ownRecord(input, 'Prepared continuous scale');
  if (!['linear','time','log','pow','sqrt','symlog'].includes(input.type)) throw new TypeError('Prepared scalar requires a supported continuous scale.');
  const parameter = input.type === 'log' ? 'base' : input.type === 'pow' ? 'exponent' : input.type === 'symlog' ? 'constant' : undefined;
  rejectUnknownProperties(input, ['type','domain','range','clamp', ...(parameter ? [parameter] : [])], 'prepared continuous scale');
  if (Object.values(input).some(value => value === undefined)) throw new TypeError('Prepared continuous scale values cannot be undefined.');
  ownArray(input.domain, 'Prepared scale domain'); ownArray(input.range, 'Prepared scale range');
  const options = {clamp: input.clamp ?? false, ...(parameter ? {[parameter]: input[parameter]} : {})};
  const scalar = isTransformedScaleType(input.type)
    ? prepareTransformedScalar(input.domain, input.range, {type: input.type, ...options})
    : prepareLinearScalar(input.domain, input.range, options);
  const token = Object.freeze({}); scalarTokens.set(token, scalar); return token;
}
export function mapPreparedContinuousScaleValue(token, value) {
  const scalar = scalarTokens.get(token);
  if (scalar === undefined) throw new TypeError('Prepared scalar requires its exact private token.');
  return scalar(value);
}
`;
  if (file === 'grammar/animation/positions.js') {
    content = replace(content, 'import { mapContinuousScaleValues }', 'import { mapContinuousScaleValues, prepareContinuousScaleScalar, mapPreparedContinuousScaleValue }');
    content = replace(content, '? previous.scale : undefined;', '? previous : undefined;');
    content = replace(content, 'function rememberScale(from, to, progress, scale)', 'function rememberScale(from, to, progress, scale, mapper)');
    content = replace(content, 'targets.set(to, { progress, scale });', 'targets.set(to, { progress, scale, mapper });');
    content = replace(content, '  let scale = share ? rememberedScale(from.scale, to.scale, progress) : undefined;', '  const remembered = share ? rememberedScale(from.scale, to.scale, progress) : undefined;\n  let scale = remembered?.scale;\n  let mapper = remembered?.mapper;');
    content = replace(content, 'try { position = mapContinuousScaleValues([value], scale)[0]; }', 'try { mapper ??= prepareContinuousScaleScalar(scale); position = mapPreparedContinuousScaleValue(mapper, value); }');
    content = replace(content, 'rememberScale(from.scale, to.scale, progress, scale);', 'rememberScale(from.scale, to.scale, progress, scale, mapper);');
    if (process.env.POSITION_RECORD_FREEZE === '1') {
      content = replace(content, 'return cloneAndFreeze({ kind: \"position\", ...exact,', 'return freezeOwned({ kind: \"position\", ...exact,');
      content = replace(content, 'return cloneAndFreeze({ kind: \"position\", value, scale, position });', 'return freezeOwned({ kind: \"position\", value, scale, position });');
    }
    return content;
  }
  return content;
}
registerHooks({load(url, context, next) {
  const result = next(url, context);
  if (!url.startsWith(src)) return result;
  const file = url.slice(src.length); let content = String(result.source);
  if (process.env.SCALAR_PROTOTYPE === '1') content = transform(file, content);
  if (file === 'core/immutable.js') {
    content = replace(content, 'const clone = array ? new Array(input.length) : {};', 'const clone = array ? new Array(input.length) : {};if(globalThis.__counts)globalThis.__counts.clones++;');
    content = replace(content, 'ownedValues.add(value);', 'ownedValues.add(value);if(globalThis.__counts)globalThis.__counts.ownedAdds++;');
  }
  if (file === 'animation/resources.js') content = replace(content, 'export function validateAnimationResourceWork(value,label,scope) {', 'export function validateAnimationResourceWork(value,label,scope) {if(globalThis.__work)globalThis.__work[label]=Math.max(globalThis.__work[label]??0,value);');
  return {...result, source: content};
}});
