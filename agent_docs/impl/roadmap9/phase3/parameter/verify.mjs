import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chart } from '../../../../../src/index.js';
import { chart as basicChart } from '../../../../../src/basic.js';
import { serializeProgram, deserializeProgram } from '../../../../../src/persistence.js';
import { encodeValue, decodeValue } from '../../../../../src/persistence/codec.js';
import { evaluateExpressionV2 } from '../../../../../src/grammar/expressionEvaluate.js';
import { proposeCreate, proposeEdit, proposeBinding, checkBinding, proposedClosure, validateProposed } from './reference.mjs';

const fixtures = JSON.parse(readFileSync(new URL('fixtures.json', import.meta.url), 'utf8'));
const reports = [];
function check(name, layer, run) { const result = run(); reports.push({ name, layer, status: 'passed', ...result }); }
const parameter = id => ({ type: 'parameter', id });
const expression = root => ({ version: 2, registry: 'standard@1', root });
const selected = expression({ type: 'binary', op: 'gte', left: { type: 'field', name: 'amount' }, right: parameter('threshold') });
const fields = { amount: { type: 'number' } };
const created = proposeCreate({ id: 'threshold', value: 10 });
const edited = proposeEdit(created, { target: 'threshold', value: 20 });
const resources = [created, edited];

check('stored scalar shape and inferred type have one value owner', 'proposal-model', () => {
  assert.deepEqual(created, { kind: 'parameter', id: 'threshold', revision: 0, algorithmVersion: '1',
    ownership: { mode: 'authored' }, inputs: [], options: { type: 'number', nullable: false },
    result: { value: 10 }, provenance: { origin: 'authored' } });
  assert.equal(edited.revision, 1); assert.equal(created.result.value, 10);
});
check('zero false empty string and signed zero remain valid values', 'proposal-model', () => {
  for (const value of [0, -0, false, '']) assert.ok(Object.is(proposeCreate({ id: 'p', value }).result.value, value));
  const zero = proposeCreate({ id: 'p', value: -0 });
  assert.equal(proposeEdit(zero, { target: 'p', value: 0 }).revision, 1);
});
check('same value keeps resource revision', 'proposal-model', () => {
  assert.equal(proposeEdit(created, { target: 'threshold', value: 10 }), created);
});
check('null requires both type and explicit nullability', 'proposal-model', () => {
  assert.equal(proposeCreate({ id: 'p', type: 'number', nullable: true, value: null }).result.value, null);
  for (const options of [{ value: null }, { type: 'number', value: null }, { nullable: true, value: null }]) {
    assert.throws(() => proposeCreate({ id: 'p', ...options }), TypeError);
  }
});
check('nonfinite and nonscalar values reject', 'proposal-model', () => {
  for (const value of [undefined, NaN, Infinity, -Infinity, [], {}, new Date(0), 1n, () => 1]) {
    assert.throws(() => proposeCreate({ id: 'p', value }), TypeError);
  }
});
check('unknown and explicit undefined options reject', 'proposal-model', () => {
  for (const extra of [{ extra: true }, { type: undefined }, { nullable: undefined }, { nullable: 1 }, { type: 'mixed' }]) {
    assert.throws(() => proposeCreate({ id: 'p', value: 1, ...extra }), TypeError);
  }
});
check('edit cannot change type or omit value or target', 'proposal-model', () => {
  for (const options of [{ target: 'threshold' }, { value: 20 }, { target: 'threshold', value: undefined },
    { target: 'threshold', value: '20' }, { target: 'threshold', value: null },
    { target: 'threshold', value: 20, type: 'number' }]) assert.throws(() => proposeEdit(created, options));
  assert.throws(() => proposeEdit(created, { target: 'missing', value: 20 }), /Missing parameter/);
  assert.equal(created.revision, 0);
});
check('resource value and options are owned without freezing caller data', 'proposal-model', () => {
  const input = { id: 'p', value: 3 };
  const snapshot = proposeCreate(input);
  assert.equal(Object.isFrozen(input), false); input.value = 4;
  assert.equal(snapshot.result.value, 3); assert.equal(Object.isFrozen(snapshot.result), true);
  const decoded = decodeValue(encodeValue(snapshot));
  const next = proposeEdit(decoded, { target: 'p', value: 5 });
  assert.equal(Object.isFrozen(decoded.options), false);
  assert.notEqual(next.options, decoded.options);
});
check('accessors and hidden or symbol options never execute', 'proposal-model', () => {
  let calls = 0;
  const options = { id: 'p' };
  Object.defineProperty(options, 'value', { enumerable: true, get() { calls++; return 1; } });
  assert.throws(() => proposeCreate(options), /own data/); assert.equal(calls, 0);
  const hidden = { id: 'p', value: 1 }; Object.defineProperty(hidden, 'extra', { value: 2 });
  assert.throws(() => proposeCreate(hidden), /own data/);
  assert.throws(() => proposeCreate({ id: 'p', value: 1, [Symbol('extra')]: 1 }), /own data/);
});
check('existing ID vocabulary and string/revision bounds apply', 'proposal-model', () => {
  for (const id of ['', 'a.b', 'a:b', 'a b']) assert.throws(() => proposeCreate({ id, value: 1 }));
  assert.throws(() => proposeCreate({ id: 'p', value: 'a'.repeat(1_048_577) }), RangeError);
  assert.throws(() => proposeEdit({ ...created, revision: Number.MAX_SAFE_INTEGER }, { target: 'threshold', value: 20 }), RangeError);
  assert.throws(() => validateProposed({ ...created, revision: -1 }), TypeError);
});
for (const [index, expected] of fixtures.thresholds.entries()) {
  check(`explicit parameter environment evaluates threshold ${expected.value}`, 'current-private-kernel-with-proposed-binding', () => {
    const binding = proposeBinding(selected, fields, [resources[index]]);
    const actual = evaluateExpressionV2(selected, fixtures.rows, binding.environment).values;
    assert.deepEqual(actual, expected.selected);
    assert.deepEqual(binding.parameterInputs, [{ kind: 'parameter', id: 'threshold', revision: expected.revision }]);
    // Independent scalar oracle, anchored by literal expectations above.
    assert.deepEqual(fixtures.rows.map(row => row.amount >= expected.value), expected.selected);
    return { actual, expected: expected.selected, diff: [] };
  });
}
check('inactive and repeated parameter nodes create exact deduplicated dependencies', 'current-private-kernel-with-proposed-binding', () => {
  const ast = expression({ type: 'if', condition: { type: 'literal', value: false },
    then: parameter('threshold'), else: parameter('threshold') });
  assert.deepEqual(proposeBinding(ast, {}, [created]).parameterInputs, [{ kind: 'parameter', id: 'threshold', revision: 0 }]);
  assert.throws(() => proposeBinding(ast, {}, []), /Unknown expression parameters/);
  assert.throws(() => proposeBinding(ast, {}, [created, created]), /Duplicate parameter/);
});
check('partial edit retains another parameter and dependency order', 'current-private-kernel-with-proposed-binding', () => {
  const ast = expression({ type: 'binary', op: 'add', left: parameter('threshold'), right: parameter('offset') });
  const offset = proposeCreate({ id: 'offset', value: 2 });
  const before = proposeBinding(ast, {}, [created, offset]), after = proposeBinding(ast, {}, [edited, offset]);
  assert.deepEqual(before.parameterInputs.map(ref => ref.revision), [0, 0]);
  assert.deepEqual(after.parameterInputs.map(ref => ref.revision), [1, 0]);
  assert.deepEqual(evaluateExpressionV2(ast, [{}], after.environment).values, [22]);
});
check('empty inputs still validate all parameter references', 'current-private-kernel-with-proposed-binding', () => {
  const binding = proposeBinding(selected, fields, [created]);
  assert.deepEqual(evaluateExpressionV2(selected, [], binding.environment).values, []);
  assert.throws(() => proposeBinding(expression(parameter('unknown')), {}, [created]), /Unknown expression parameters/);
});
check('binding rejects missing extra duplicate wrong-kind and stale refs', 'proposal-model', () => {
  const expected = proposeBinding(selected, fields, [edited]).parameterInputs;
  checkBinding([{ revision: 1, id: 'threshold', kind: 'parameter' }], expected);
  for (const inputs of [[], [expected[0], expected[0]], [{ ...expected[0], revision: 0 }],
    [{ ...expected[0], id: 'unknown' }], [{ ...expected[0], kind: 'data' }], [{ ...expected[0], extra: true }]]) {
    assert.throws(() => checkBinding(inputs, expected));
  }
});
check('diamond closure deduplicates and preserves unrelated namespace sibling', 'proposal-model', () => {
  const actual = proposedClosure(fixtures.graph, { kind: 'parameter', id: 'threshold' });
  assert.deepEqual(actual, fixtures.closure);
  return { actual, expected: fixtures.closure, diff: [] };
});
check('graph missing duplicate and cyclic inputs reject', 'proposal-model', () => {
  const ref = id => ({ kind: 'data', id });
  assert.throws(() => proposedClosure([{ ...ref('a'), inputs: [ref('b')] }], ref('a')), /Missing graph input/);
  assert.throws(() => proposedClosure([...fixtures.graph, fixtures.graph[0]], fixtures.graph[0]), /Duplicate graph identity/);
  assert.throws(() => proposedClosure([{ ...ref('a'), inputs: [ref('b')] }, { ...ref('b'), inputs: [ref('a')] }], ref('a')), /Cyclic/);
});
check('tagged scalar snapshot survives fresh-process edit and binding', 'codec-and-proposal-model-only', () => {
  const child = `import {readFileSync} from 'node:fs';
    import {decodeValue} from ${JSON.stringify(new URL('../../../../../src/persistence/codec.js', import.meta.url).href)};
    import {proposeEdit,proposeBinding} from ${JSON.stringify(new URL('reference.mjs', import.meta.url).href)};
    const input=JSON.parse(readFileSync(0,'utf8'));
    const resource=proposeEdit(decodeValue(input.resource),{target:'threshold',value:20});
    process.stdout.write(JSON.stringify(proposeBinding(input.expression,input.fields,[resource]).parameterInputs));`;
  const actual = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', child], {
    input: JSON.stringify({ resource: encodeValue(created), expression: selected, fields }), encoding: 'utf8'
  }));
  assert.deepEqual(actual, [{ kind: 'parameter', id: 'threshold', revision: 1 }]);
  for (const value of [null, -0, false, '']) assert.ok(Object.is(decodeValue(encodeValue(value)), value));
});
check('current program has no parameter public actions or accepted resource kind', 'current-product-baseline', () => {
  for (const p of [chart(), basicChart()]) {
    for (const name of ['createParameter', 'editParameter', 'removeParameter']) assert.equal(p[name], undefined);
    const before = serializeProgram(p);
    assert.throws(() => p.editSemantic({ property: 'resource[parameter:threshold]', value: created }));
    assert.equal(serializeProgram(p), before);
  }
});
check('current public v1 and fresh restore remain usable', 'current-product-baseline', () => {
  const source = chart().createData({ id: 'source', values: fixtures.rows });
  const p = source.createComputedData({ id: 'result', source: 'source', as: 'selected',
    expression: { op: 'gte', left: { field: 'amount' }, right: { constant: 10 } } });
  const restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(restored.semanticSpec.datasets.find(d => d.id === 'result').values.map(r => r.selected), fixtures.thresholds[0].selected);
  assert.throws(() => source.createComputedData({ id: 'v2', source: 'source', as: 'selected', expression: selected }));
});
check('proposal candidates have not entered the canonical inventory', 'current-product-baseline', () => {
  const candidates = JSON.parse(readFileSync(new URL('candidates.json', import.meta.url), 'utf8'));
  const inventory = readFileSync(new URL('../../../../contract/ACTION_INDEX.json', import.meta.url), 'utf8');
  assert.equal(candidates.publicInventoryPromotion, false);
  for (const candidate of candidates.candidates) assert.ok(!inventory.includes(JSON.stringify(candidate.id)), candidate.id);
});
process.stdout.write(JSON.stringify({ status: 'passed', checks: reports.length,
  productParameterLifecycleImplemented: false, productFreshProcessLifecycleVerified: false,
  renderedOutputRequiredForThisGate: false, reports }, null, 2) + '\n');
