# Explicit nested scalar access in computed data

## Status and scope

- [x] Existing literal-field behavior and missing explicit accessor reproduced
- [x] Actual nested source paths and missing-row facts frozen by hashes
- [x] Concrete expression, errors, persistence and test contract prepared
- [x] Explicit user approval
- [ ] Implementation and full consumer verification

Gate: **approved**. User approval recorded before implementation in `APPROVAL.json`. Root `AGENTS.md` requires explicit approval for the new public computed-expression operation and persisted expression shape. Only two affected families wait; independent work continues. Package publishing, deployment and PR creation are outside this decision.

## Problem

Raw datasets can preserve nested JSON records. Existing `{field:'venue.name'}` means one literal top-level field named `venue.name`; it does not traverse `venue`. Existing computed expressions have no explicit nested accessor or flatten operation. The synthetic reproduction fails with `Dataset "data" does not contain field "venue.name".` A host-created flattened replacement dataset would remove the original model-authored transformation and is not an acceptable workaround.

The two actual references need `_source.species`, `_source.petalLength`, `_source.petalWidth`, `_source.sepalLength`, `_source.sepalWidth`, `_source.ml.species_prediction`, and `venue.name`/`venue.capacity`. The first source has150nested rows and no absent required path. The second has382raw rows,39of which lack `venue`; absent nested values must remain missing instead of inventing a venue or zero capacity. `source-evidence.json` records exact raw/source/compiled/SVG hashes and per-path absence/type counts. Raw rows remain unchanged.

## Proposed public expression

Add exactly one existing-action expression operation, **`getPath`**, to `createComputedData`:

```js
program.createComputedData({
  id:'venueNames',
  as:'venueName',
  expression:{op:'getPath',operand:{field:'venue'},path:['name']}
});
program.createComputedData({
  id:'predictions',
  as:'prediction',
  expression:{op:'getPath',operand:{field:'_source'},path:['ml','species_prediction']}
});
```

Each action has three top-level options. `operand` must be exactly an existing literal field-reference node `{field: rootName}`; it is not executable code or a dot-separated expression. `path` must be a nonempty array of1–8literal nonempty string property keys. Keys are not split on dots; a key containing a dot remains one key. Array indices/wildcards/dynamic path expressions/functions/prototype traversal are unsupported. Reject unknown node keys and reserved path segments `__proto__`, `prototype`, `constructor` during expression validation. Ordinary `{field:'venue.name'}` behavior remains unchanged.

### Result and error policy

- Traverse **own data properties of plain records only**. Do not invoke getters, follow inherited properties, traverse arrays, or coerce strings/numbers into records.
- A missing own property, or null/undefined at any intermediate step, returns the existing dataset scalar **null**. This is missing-value materialization, not numeric zero, string `'null'`, record flattening or source-row removal.
- A present non-record intermediate value, accessor property, unsupported object or nonscalar final value is an explicit atomic error. A finite number, string, boolean or null final value is returned unchanged. Reject nonfinite numeric results through existing scalar validation.
- A root field absent from the entire dataset remains the existing unknown-field error. A known optional root missing in some rows returns null for those rows.
- Track the literal root field as the computed transform dependency. Store the cloned/frozen explicit expression in the current computed transform record. Never rewrite caller rows, nested records or arrays.

This closed missing-value choice is part of the approval request. It permits ordinary downstream filters/aggregates to handle missing data explicitly. It does not add exception suppression or implicit numeric/date coercion.

## Ownership, materialization and compatibility

The owning computed grammar validates/evaluates the expression; derived data actions retain immutable raw datasets and append normal computed datasets. Existing provenance and dependency consumers see the root field dependency and original persisted path. Renderers require no change and continue reading materialized graphics only. Model-authored public chains extract semantic scalar columns, then use current encodings/summary/filter APIs; no custom renderer or arbitrary helper is introduced.

No existing computed operation changes meaning. No dotted-name field lookup changes meaning. No new source resolver normalization, dataset-wide flatten helper, action, schema mode, array traversal or general property evaluator is proposed. Source-specific chart code and filtering remain model-authored after approval; this proposal only enables the data transformation.

## Required implementation evidence

1. Successful one/multi-level number/string/boolean/null access, literal dotted keys, optional roots and missing intermediates; exact root dependency/provenance and transformed values.
2. Invalid empty/too-deep/dynamic paths, unknown node keys/roots, forbidden segments, arrays, inherited/accessor properties, non-record intermediates, object/array leaves and nonfinite numbers fail atomically. Getter sentinels prove no accessor invocation.
3. Original programs, raw rows, nested records and caller expression/path arrays remain immutable. Persistence round-trip and derived-data rematerialization preserve the expression and values.
4. Full chain: nested number extraction→numeric scale/mark, nested category extraction→aggregate/group/color legend, optional nested values→explicit filter. Public-installed package and declaration tests must use only ordinary domain actions.
5. Add computed grammar/action contracts, closed expression types, action cards/knowledge, official examples and generated references together; run focused tests, full unit/contracts/docs and installed-package consumer checks.

There is no new visual primitive or renderer behavior in this proposal. Existing chart families still require source-definedness, geometry, mark/style, guide and within-family verification after model-authored extraction code exists.
