/** Review-only declarations. These are not exported by ggaction. */
import type { ComputedExpression, DerivedDataDependents } from '../../../../../types/program.js';
export type Scalar = number | string | boolean | null;
export type ExpressionV2 = {
  readonly version: 2;
  readonly registry: 'standard@1';
  readonly root: Node;
};
type One = readonly [Node];
type Two = readonly [Node, Node];
type Three = readonly [Node, Node, Node];
type Many = readonly [Node, ...Node[]];
type StringLiteral = { readonly type: 'literal'; readonly value: string };
type Angle = { readonly angleUnit: 'radians' | 'degrees' };
export type Node =
  | { readonly type: 'literal'; readonly value: Scalar }
  | { readonly type: 'field'; readonly name: string }
  | { readonly type: 'fieldPath'; readonly root: string; readonly path: readonly [string, ...string[]] }
  | { readonly type: 'parameter'; readonly id: string }
  | { readonly type: 'unary'; readonly op: 'negate' | 'not'; readonly operand: Node }
  | { readonly type: 'binary'; readonly op: 'add' | 'subtract' | 'multiply' | 'divide' | 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'and' | 'or'; readonly left: Node; readonly right: Node }
  | { readonly type: 'if'; readonly condition: Node; readonly then: Node; readonly else: Node }
  | Call;
export type Call =
  | { readonly type: 'call'; readonly name: 'abs' | 'sqrt' | 'log' | 'exp' | 'round' | 'floor' | 'ceil' | 'toNumber' | 'lower' | 'upper' | 'length' | 'isNull' | 'isMissing' | 'isFinite' | 'arrayLength'; readonly args: One; readonly options?: never }
  | { readonly type: 'call'; readonly name: 'min' | 'max' | 'concat'; readonly args: Many; readonly options?: never }
  | { readonly type: 'call'; readonly name: 'coalesce'; readonly args: readonly [Node, Node, ...Node[]]; readonly options?: never }
  | { readonly type: 'call'; readonly name: 'pow' | 'at'; readonly args: Two; readonly options?: never }
  | { readonly type: 'call'; readonly name: 'substring'; readonly args: Three; readonly options?: never }
  | { readonly type: 'call'; readonly name: 'replace'; readonly args: readonly [Node, StringLiteral, StringLiteral]; readonly options?: never }
  | { readonly type: 'call'; readonly name: 'sin' | 'cos' | 'tan'; readonly args: One; readonly options: Angle }
  | { readonly type: 'call'; readonly name: 'atan2'; readonly args: Two; readonly options: Angle }
  | { readonly type: 'call'; readonly name: 'parseTime'; readonly args: One; readonly options: { readonly format: '%Y-%m-%d' | '%d/%m/%Y' | '%m/%d/%Y' | 'iso-offset' } }
  | { readonly type: 'call'; readonly name: 'datePart'; readonly args: One; readonly options: { readonly part: 'year' | 'quarter' | 'month' | 'day' | 'weekday' | 'hour' | 'minute' | 'second' | 'millisecond'; readonly timeZone: string } }
  | { readonly type: 'call'; readonly name: 'timeFloor'; readonly args: One; readonly options: ({ readonly unit: 'week'; readonly timeZone: string; readonly weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 } | { readonly unit: 'year' | 'quarter' | 'month' | 'day' | 'hour' | 'minute' | 'second'; readonly timeZone: string; readonly weekStartsOn?: never }) };
export interface ProposedComputedCall {
  readonly id: string;
  readonly source?: string;
  readonly as: string;
  readonly expression: ComputedExpression | ExpressionV2;
}
export interface ProposedComputedEdit {
  readonly target: string;
  readonly as?: string;
  readonly expression?: ComputedExpression | ExpressionV2;
  readonly dependents?: DerivedDataDependents;
}
