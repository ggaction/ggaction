import type { Call, ExpressionV2, Node, ProposedComputedCall } from './proposal.js';

// Proposed createComputedData options; not executed against the current API.
export const ratio = {
  id: 'ratios', source: 'sales', as: 'ratio',
  expression: {
    version: 2, registry: 'standard@1',
    root: { type: 'binary', op: 'divide', left: { type: 'field', name: 'part' }, right: { type: 'field', name: 'whole' } }
  }
} as const satisfies ProposedComputedCall;
export const explicitFallback = {
  id: 'ratios', source: 'sales', as: 'ratio',
  expression: {
    version: 2, registry: 'standard@1', root: {
      type: 'call', name: 'coalesce', args: [ratio.expression.root, { type: 'literal', value: 0 }]
    }
  }
} as const satisfies ProposedComputedCall;
export const legacy = { id: 'old', as: 'ratio', expression: { op: 'divide', left: { field: 'part' }, right: { field: 'whole' } } } as const satisfies ProposedComputedCall;
export const date: Call = { type: 'call', name: 'datePart', args: [{ type: 'field', name: 'timestamp' }], options: { part: 'month', timeZone: 'UTC' } };
export const week: Call = { type: 'call', name: 'timeFloor', args: [{ type: 'field', name: 'timestamp' }], options: { unit: 'week', timeZone: 'Europe/Copenhagen', weekStartsOn: 1 } };
export const nested: Node = { type: 'fieldPath', root: 'record', path: ['a', 'b'] };
export const parameter: Node = { type: 'parameter', id: 'threshold' };
// @ts-expect-error Unknown versions must not compile.
export const badVersion: ExpressionV2 = { version: 3, registry: 'standard@1', root: { type: 'literal', value: 1 } };
// @ts-expect-error Unknown registry names must not compile.
export const badRegistry: ExpressionV2 = { version: 2, registry: 'user-code', root: { type: 'literal', value: 1 } };
// @ts-expect-error Unknown functions must not compile.
export const badFunction: Call = { type: 'call', name: 'eval', args: [{ type: 'literal', value: '1' }] };
// @ts-expect-error Arity is part of the declaration.
export const badArity: Call = { type: 'call', name: 'sqrt', args: [] };
// @ts-expect-error Angles require an explicit unit.
export const missingAngle: Call = { type: 'call', name: 'sin', args: [{ type: 'literal', value: 1 }] };
// @ts-expect-error Dates require an explicit time zone.
export const missingZone: Call = { type: 'call', name: 'datePart', args: [{ type: 'literal', value: 0 }], options: { part: 'year' } };
// @ts-expect-error Week requires an explicit week start.
export const missingWeekStart: Call = { type: 'call', name: 'timeFloor', args: [{ type: 'literal', value: 0 }], options: { unit: 'week', timeZone: 'UTC' } };
// @ts-expect-error Replacement search is a literal string node.
export const dynamicReplace: Call = { type: 'call', name: 'replace', args: [{ type: 'field', name: 'text' }, { type: 'field', name: 'search' }, { type: 'literal', value: '' }] };
// @ts-expect-error Paths cannot be empty.
export const emptyPath: Node = { type: 'fieldPath', root: 'record', path: [] };
// @ts-expect-error There is no arbitrary callback node.
export const callback: Node = { type: 'call', name: () => 1, args: [] };

// Exact declaration vocabulary, checked independently of the runtime proposal table.
const names = ['abs','min','max','pow','sqrt','log','exp','round','floor','ceil','toNumber','sin','cos','tan','atan2','lower','upper','length','substring','replace','concat','isNull','isMissing','isFinite','coalesce','arrayLength','at','parseTime','datePart','timeFloor'] as const satisfies readonly Call['name'][];
export const completeVocabulary: Exclude<Call['name'], typeof names[number]> extends never ? true : never = true;
