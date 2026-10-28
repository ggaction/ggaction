import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateExpressionV2 } from '../../../src/grammar/expressionEvaluate.js';
const literal = value => ({ type: 'literal', value });
const binary = (op, left, right) => ({ type: 'binary', op, left, right });
const envelope = root => ({ version: 2, registry: 'standard@1', root });

test('expression core separates missing arithmetic from explicit null', () => {
  const result = evaluateExpressionV2(envelope(binary('divide', literal(1), literal(0))), [{}]);
  assert.deepEqual(result.values, [undefined]);
  assert.equal(result.report.counts.divideByZero, 1);
  assert.equal(result.report.missingRows, 1);
  assert.deepEqual(evaluateExpressionV2(envelope(literal(null)), [{}]).values, [null]);
});

test('expression core preserves typed equality and lazy branch diagnostics', () => {
  assert.deepEqual(evaluateExpressionV2(envelope(binary('eq', literal('1'), literal(1))), [{}]).values, [false]);
  assert.deepEqual(evaluateExpressionV2(envelope(binary('eq', literal(null), literal(null))), [{}]).values, [false]);
  const root = { type: 'if', condition: literal(false), then: binary('divide', literal(1), literal(0)), else: literal(7) };
  const result = evaluateExpressionV2(envelope(root), [{}]);
  assert.deepEqual(result.values, [7]);
  assert.equal(result.report.counts.divideByZero, 0);
});

test('arithmetic, comparisons and boolean nodes retain strict scalar semantics', () => {
  const fixtures = [
    ['add', 2, 3, 5], ['subtract', 2, 3, -1], ['multiply', 2, 3, 6], ['divide', 6, 3, 2],
    ['eq', 1, 1, true], ['neq', 1, '1', true], ['neq', null, null, false],
    ['lt', 1, 2, true], ['lte', 2, 2, true], ['gt', 3, 2, true], ['gte', 2, 2, true],
    ['lt', '😀', '\ue000', false], ['gt', '😀', '\ue000', true], ['lte', 'a', 'aa', true],
    ['gte', 'ab', 'ab', true], ['lt', false, true, true], ['lt', null, 1, false],
    ['and', false, true, false], ['and', true, true, true], ['or', true, false, true], ['or', false, false, false]
  ];
  for (const [op, left, right, expected] of fixtures) {
    assert.deepEqual(evaluateExpressionV2(envelope(binary(op, literal(left), literal(right))), [{}]).values, [expected]);
  }
  for (const [op, value, expected] of [['negate', 3, -3], ['negate', null, undefined], ['not', false, true]]) {
    assert.deepEqual(evaluateExpressionV2(envelope({ type: 'unary', op, operand: literal(value) }), [{}]).values, [expected]);
  }
  const overflow = evaluateExpressionV2(envelope(binary('multiply', literal(1e308), literal(1e308))), [{}]);
  assert.equal(overflow.report.counts.nonFinite, 1);
  assert.deepEqual(evaluateExpressionV2(envelope(binary('add', literal(null), literal(1))), [{}]).values, [undefined]);
});

test('lazy operators evaluate only the selected runtime values', () => {
  const field = { type: 'field', name: 'bad' };
  const environment = { fields: { bad: { type: 'unknown', optional: true } } };
  for (const op of ['and', 'or']) {
    const left = op === 'or';
    const result = evaluateExpressionV2(envelope(binary(op, literal(left), field)), [{ bad: 4 }], environment);
    assert.deepEqual(result.values, [left]);
  }
  const coalesce = { type: 'call', name: 'coalesce', args: [literal(4), binary('divide', literal(1), literal(0))] };
  const result = evaluateExpressionV2(envelope(coalesce), [{}]);
  assert.deepEqual(result.values, [4]); assert.equal(result.report.counts.divideByZero, 0);
  const recovered = evaluateExpressionV2(envelope({ ...coalesce, args: [coalesce.args[1], literal(4)] }), [{}]);
  assert.equal(recovered.report.counts.divideByZero, 1); assert.equal(recovered.report.missingRows, 0);
  const predicate = name => ({ type: 'call', name, args: [field] });
  assert.deepEqual(evaluateExpressionV2(envelope(predicate('isMissing')), [{}], environment).values, [true]);
  assert.deepEqual(evaluateExpressionV2(envelope(predicate('isNull')), [{}], environment).values, [false]);
  assert.deepEqual(evaluateExpressionV2(envelope({ ...coalesce, args: [field, literal(null)] }), [{}], environment).values, [undefined]);
});
