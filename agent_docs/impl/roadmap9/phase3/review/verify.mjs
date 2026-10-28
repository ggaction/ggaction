import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chart } from '../../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../../src/persistence.js';
import { ownDataSnapshot } from './own-data-reference.mjs';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const reports = [];
function check(name, callback) { const result = callback(); reports.push({ name, status: 'passed', ...result }); }
const token = value => value === undefined ? { kind: 'missing' } : value;
const source = chart().createData({ id: 'source', values: [{ part: 1, whole: 0 }] });
const before = serializeProgram(source);
const constant = value => ({ constant: value });
function actual(expression) {
  const p = source.createComputedData({ id: 'derived', source: 'source', as: 'result', expression });
  assert.equal(serializeProgram(source), before);
  return p.semanticSpec.datasets.find(d => d.id === 'derived').values[0].result;
}
check('legacy division remains an atomic error', () => {
  assert.throws(() => actual({ op: 'divide', left: { field: 'part' }, right: { field: 'whole' } }), /divide by zero/);
  assert.equal(serializeProgram(source), before);
});
check('legacy selected branch skips domain evaluation', () => {
  assert.equal(actual({ op: 'if', condition: constant(false), then: { op: 'divide', left: constant(1), right: constant(0) }, else: constant(7) }), 7);
});
check('legacy mixed equality remains an error', () => {
  assert.throws(() => actual({ op: 'eq', left: constant('1'), right: constant(1) }), /matching primitive types/);
});
check('legacy null comparison differs from v2 proposal', () => {
  assert.equal(actual({ op: 'eq', left: constant(null), right: constant(null) }), true);
  assert.equal(actual({ op: 'neq', left: constant(null), right: constant(1) }), true);
});
check('legacy unselected unknown fields still fail preflight', () => {
  assert.throws(() => actual({ op: 'if', condition: constant(false), then: { field: 'unknown' }, else: constant(7) }), /does not contain field/);
});
check('accessor exposure is recorded as a baseline defect', () => {
  let calls = 0;
  const expression = {};
  Object.defineProperty(expression, 'constant', { enumerable: true, get() { calls++; return 5; } });
  assert.equal(actual(expression), 5);
  assert.ok(calls > 0);
  return { getterCalls: calls, securityVerdict: 'known-gap-not-fixed' };
});
check('proposed descriptor snapshot rejects accessors without executing them', () => {
  let calls = 0;
  const expression = {};
  Object.defineProperty(expression, 'constant', { enumerable: true, get() { calls++; return 5; } });
  assert.throws(() => ownDataSnapshot({ expression }), /Accessor/);
  assert.equal(calls, 0);
  const array = []; Object.defineProperty(array, '0', { enumerable: true, get() { calls++; return 1; } });
  assert.throws(() => ownDataSnapshot({ args: array }), /Accessor/);
  assert.equal(calls, 0);
});
check('descriptor experiment rejects cycles and hidden keys and owns descendants', () => {
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => ownDataSnapshot(cyclic), /Cycle/);
  const hidden = {}; Object.defineProperty(hidden, 'x', { value: 1 });
  assert.throws(() => ownDataSnapshot(hidden), /Non-enumerable/);
  assert.throws(() => ownDataSnapshot({ [Symbol('x')]: 1 }), /Symbol/);
  const input = { args: [{ value: 1 }] }, owned = ownDataSnapshot(input);
  input.args[0].value = 2;
  assert.equal(owned.args[0].value, 1);
  assert.ok(Object.isFrozen(owned.args[0]));
});
check('public editable codec preserves missing and null separately', () => {
  const p = chart().createData({ id: 'nullable', values: [{ value: undefined }, { value: null }, { value: 2 }] });
  const restored = deserializeProgram(serializeProgram(p));
  const d = restored.semanticSpec.datasets[0];
  assert.ok(Object.hasOwn(d.values[0], 'value'));
  assert.equal(d.values[0].value, undefined);
  assert.equal(d.values[1].value, null);
  assert.equal(d.schema.fields.find(f => f.name === 'value').optional, true);
  assert.equal(d.schema.fields.find(f => f.name === 'value').nullable, true);
  return { output: d.values.map(r => token(r.value)) };
});
check('current product rejects the proposed envelope', () => {
  assert.throws(() => actual({ version: 2, registry: 'standard@1', root: { type: 'literal', value: 1 } }), /exactly one/);
});
const registry = read('registry.json');
check('registry has 30 unique closed signatures', () => {
  const expected = ['abs','min','max','pow','sqrt','log','exp','round','floor','ceil','toNumber','sin','cos','tan','atan2','lower','upper','length','substring','replace','concat','isNull','isMissing','isFinite','coalesce','arrayLength','at','parseTime','datePart','timeFloor'].sort();
  assert.deepEqual(registry.functions.map(f => f.name), expected);
  for (const f of registry.functions) {
    assert.ok(f.returns && ['lazy','eager'].includes(f.evaluation));
    if (Array.isArray(f.arguments)) assert.ok(f.arguments.length >= 1 && f.arguments.length <= 3);
    else assert.ok(f.arguments.min >= 1 && f.arguments.max === 64);
  }
});
check('unapproved candidates are absent from current inventory and exports', () => {
  const inventory = readFileSync(new URL('../../../../contract/ACTION_INDEX.json', import.meta.url), 'utf8');
  assert.ok(!inventory.includes('getExpressionFunctions'));
  const exports = readFileSync(new URL('../../../../../src/inspection.js', import.meta.url), 'utf8');
  assert.ok(!exports.includes('export function getExpressionFunctions'));
  assert.equal(read('../candidates.json').publicInventoryPromotion, false);
});
// Independent literal references only. These do not execute the proposed AST.
const oracles = {
  divide: (a,b) => b === 0 ? undefined : a / b,
  eq: (a,b) => a == null || b == null ? false : typeof a === typeof b && a === b,
  neq: (a,b) => a == null || b == null ? false : typeof a !== typeof b || a !== b,
  length: text => [...text].length,
  substring: (text,start,end) => [...text].slice(start,end).join(''),
  replace: (text,search,replacement) => { const i=text.indexOf(search); return i < 0 ? text : text.slice(0,i)+replacement+text.slice(i+search.length); },
  'sin-degrees': x => Math.sin(x * Math.PI / 180),
  'atan2-degrees': (y,x) => Math.atan2(y,x) * 180 / Math.PI,
  floor: x => Math.floor(x), round: x => Math.round(x),
  'utc-day': (year,month,day) => Date.UTC(year,month-1,day),
  'iso-instant': text => Date.parse(text),
  at: (array,index) => array[index]
};
for (const fixture of read('oracle-fixtures.json').cases) {
  check(`independent reference: ${fixture.id}`, () => {
    const value = token(oracles[fixture.oracle](...fixture.input));
    if (fixture.absoluteTolerance !== undefined) assert.ok(Math.abs(value - fixture.expected) <= fixture.absoluteTolerance);
    else assert.deepEqual(value, fixture.expected);
    return { actual: value, expected: fixture.expected, evidenceKind: 'numeric-reference-only' };
  });
}
const sourceFiles = ['src/grammar/computed.js','src/core/action.js','src/grammar/datasetSchema.js','src/persistence/codec.js','types/program.d.ts'];
const sourceHashes = Object.fromEntries(sourceFiles.map(name => [name,createHash('sha256').update(readFileSync(root+name)).digest('hex')]));
process.stdout.write(JSON.stringify({ schemaVersion:1, scope:'Review preparation, not v2 product qualification', commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(), checks:reports.length, sourceHashes, reports, productV2Status:'not-implemented', accessorSafety:'current-product-gap; isolated-experiment-passed' }, null, 2)+'\n');
