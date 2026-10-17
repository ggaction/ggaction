# Explicit opacity for legend symbol layers

## Status and reproduced gap

- Gate: **ready-for-review**. This package proposes a public input and persisted-schema addition; implementation is not authorized by this package.
- This English proposal is the requested public review artifact. The executable reproduction uses only two generic observations and existing public actions.
- `node agent_docs/impl/legend-symbol-layer-opacity/REPRODUCE.mjs` produces [REPRODUCTION.json](./REPRODUCTION.json). It verifies two opaque legend samples beside a point mark with opacity `0.7`, then verifies that creation, whole-legend editing and focused symbol editing reject `opacity` on all three recipe layer types.

The current `LegendSymbolLayer` union in `types/program.d.ts` exposes `line`, `point` and `swatch` recipes without an opacity key. The closed public normalizer in `src/actions/guides/legends/categorical/recipes.js` rejects that key. Existing categorical materializers already consume optional internal `layer.opacity`; that internal capability does not authorize public input or persistence.

This is an absent explicit authoring control. It does not establish a bug in automatic mark-opacity inference. Automatically inheriting point opacity would change historical output and introduce ambiguity when several marks or field-driven opacity share a legend.

## Proposed public choice

Add `opacity?: number` to each existing **LegendSymbolLayer** member, validated as a finite number in `[0, 1]`:

```js
program.createLegend({
  symbol: {layers: [{type: 'point', size: 5, opacity: 0.7}]}
});
program.editLegendSymbols({
  symbol: {layers: [{type: 'point', size: 5, opacity: 0.4}]}
});
```

The same layer object is accepted wherever the existing `LegendSymbolLayer` recipe is already supported: direct and bundled creation, whole-legend editing, focused symbol editing and an applicable selected legend block. Existing target/channel ambiguity rules remain unchanged. This does not make an unsupported recipe applicable to gradient, sampled-size, sampled-opacity or sampled-color families; their separate option types retain their current contracts.

1. An explicit value controls the entire corresponding sampled glyph once: point fill and outline, swatch fill and outline, or line stroke. It never fades labels, titles, borders, backgrounds, other recipe layers, chart marks or other legend blocks.
2. Zero retains every item, sample geometry and occupied layout slot; it changes paint only. Different layers in a composite recipe may have independent opacity values.
3. Existing paint alpha and the explicit glyph opacity compose using the existing concrete-graphic renderer behavior. Do not encode opacity into replacement color strings or apply separate opacity twice to fill and stroke.
4. **Default remains 1 for the ordinary categorical samples reproduced here.** Omission preserves all current output and inference paths exactly, including the existing specialized area-gradient fallback. Do not add global mark-alpha inference, normalize every old recipe to a new stored opacity key or change that fallback to 1.
5. An edit omitting `symbol` preserves the stored recipe. Supplying a recipe follows existing whole-recipe replacement semantics; a replacement layer omitting opacity uses its existing native result. Explicit `1` requests opaque paint. Existing `symbol: 'auto'` resets to the existing inference policy. No new reset enum, partial-layer merging or per-item opacity array is introduced.
6. Reject strings, booleans, null, arrays, NaN, infinities and values outside the closed interval before changing program state. Preserve previous programs and caller-owned objects on every failed create, edit, load or composition replay.

The shorthand point/line/swatch recipe option unions are **not widened** by this proposal; callers use the existing `layers` representation for this additional choice. No new action or renderer option is introduced.

## Ownership, persistence and renderer compatibility

The recipe normalizer and closed persisted recipe validator own the additional optional key. Store it in the existing recipe layer, not as duplicate mark state or renderer state. Legacy snapshots without the key retain their exact current behavior. JSON export/load, edits, scale/data/Canvas rematerialization, supported shared-facet promotion and subsequent composition edits must retain explicit layer opacity. Previously valid promotion compatibility checks remain in force.

The existing categorical symbol action explicitly materializes the selected opacity to the corresponding concrete graphic node or every concrete node belonging to that layer. SVG and Canvas already support unit-interval concrete opacity and continue consuming only `graphicSpec`. Verify both simple circle/line/rect samples and shape-mapped or rounded-rect samples that use collections; do not let collection nesting multiply opacity twice. Node PNG/PDF adapters must preserve the same concrete result through their existing rendering path.

No material macro-architecture change is proposed. Public types, closed normalization/load schemas, current legend contract, API/action cards, official recipe documentation and generated machine/MCP references must be synchronized after approval.

## Required evidence after approval

- Public creation, whole/focused edits, applicable block edits and bundled guides for line, point and swatch: values `0`, `0.7` and `1`, mixed recipes and shape-mapped/rounded samples.
- Independent literal concrete-property assertions for fill and stroke; no new alpha on text or surrounding guides. Existing alpha paints compose once. Geometry, item order, occupied bounds and collision results are unchanged.
- Exact default graphic/semantic parity for omitted options, old snapshots and ordinary categorical fixtures, including the specialized area-gradient fallback. No implicit global point-alpha behavior change.
- Changing mark opacity never overrides an explicit legend-layer choice. Data/scale/Canvas edits, shared-facet promotion, group relocation, remove/recreate and export/load preserve the selected recipe and render it consistently.
- Closed-schema negative values, invalid types/unknown keys, immutable inputs and atomic failures across creation, edits, persistence and replay. Full and Basic types must expose only their actually supported recipe paths.
- SVG/Canvas concrete opacity equivalence, installed-package runtime/TypeScript consumer, focused tests, full unit/contracts/docs checks and measured package budgets. No chart-pixel inspection is needed for the translation evidence; actual graphic and DOM properties remain mandatory.

## Related issues and decision requested

[Issue 191](https://github.com/ggaction/ggaction/issues/191) concerns continuous gradient bodies and uses `gradient.opacity`; this proposal concerns categorical recipe layers. [Issue 177](https://github.com/ggaction/ggaction/issues/177) concerns selecting a coexisting opacity block. Neither supplies this explicit layer option.

Approve or revise this exact nested option and the compatibility rules before implementation. Publication, deployment, pull-request creation and active translation runtime replacement are outside this review package.
