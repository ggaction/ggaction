import type { ProposedFull, ProposedBasic, CreateParameterOptions, ParameterResource } from './proposal.js';
import type { ProposedComputedCall } from '../review/proposal.js';

interface ExampleProgram extends ProposedFull {
  createParameter(options: CreateParameterOptions): ExampleProgram;
  createComputedData(options: ProposedComputedCall): ExampleProgram;
}
declare const full: ExampleProgram;
declare const basic: ProposedBasic;
const withResult = full
  .createParameter({ id: 'threshold', value: 10 })
  .createComputedData({
    id: 'selected', source: 'source', as: 'selected',
    expression: { version: 2, registry: 'standard@1', root: {
      type: 'binary', op: 'gte', left: { type: 'field', name: 'amount' },
      right: { type: 'parameter', id: 'threshold' }
    } }
  });
withResult.editParameter({ target: 'threshold', value: 20 });
full.createParameter({ id: 'label', value: '' });
full.createParameter({ id: 'enabled', type: 'boolean', value: false });
full.createParameter({ id: 'optional', type: 'number', nullable: true, value: null });
full.removeParameter({ id: 'unused' });
basic.createParameter({ id: 'factor', value: 2 });
const valid: CreateParameterOptions = { id: 'nullable', value: 0, nullable: true };
full.createParameter(valid);
// Runtime-only: stored type, nonfinite numbers, ID syntax, revision bounds and resource references.
withResult.editParameter({ target: 'threshold', value: 'runtime-type-mismatch' });

// @ts-expect-error parameter identity is required
full.createParameter({ value: 1 });
// @ts-expect-error declared type must match value
full.createParameter({ id: 'bad', type: 'number', value: '10' });
// @ts-expect-error null requires a declared type
full.createParameter({ id: 'bad', nullable: true, value: null });
// @ts-expect-error null requires nullable true
full.createParameter({ id: 'bad', type: 'number', value: null });
// @ts-expect-error scalar only
full.createParameter({ id: 'bad', value: [] });
// @ts-expect-error no missing values
full.createParameter({ id: 'bad', value: undefined });
// @ts-expect-error no type changes
full.editParameter({ target: 'threshold', value: 2, type: 'number' });
// @ts-expect-error no empty edit
full.editParameter({ target: 'threshold' });
// @ts-expect-error no inferred edit target
full.editParameter({ value: 2 });
// @ts-expect-error no deletion cascade
full.removeParameter({ id: 'threshold', cascade: true });
// @ts-expect-error Basic remains creation-only
basic.editParameter({ target: 'factor', value: 3 });
// @ts-expect-error Basic remains creation-only
basic.removeParameter({ id: 'factor' });
// @ts-expect-error reference vectors are not authoring inputs
full.createComputedData({ id: 'bad', as: 'x', expression: { constant: 1 }, parameterInputs: [] });
declare const stored: ParameterResource;
// @ts-expect-error immutable resource
stored.result.value = 3;
