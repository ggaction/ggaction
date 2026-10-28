import type { ProposedFull } from './proposal.js';
declare const full: ProposedFull;
full.createParameter({ id: 'number', value: 0 });
full.createParameter({ id: 'nullable', type: 'number', nullable: true, value: null });
// @ts-expect-error explicit undefined is not omission
full.createParameter({ id: 'bad', value: 1, type: undefined });
// @ts-expect-error explicit undefined is not omission
full.createParameter({ id: 'bad', value: 1, nullable: undefined });
// @ts-expect-error a required value cannot be undefined
full.editParameter({ target: 'number', value: undefined });
