# Explicit opacity for continuous legend ramps

## Status

- Gate: `approved` — public option and persisted gradient schema; [approval](./APPROVAL.md).
- Implementation: **in progress in an isolated worktree**. No package, documentation deployment, or release is requested.
- Scope: continuous color and stroke gradient bodies only; preserve existing layout and text.
- This proposal is in English for the requested external review package.

## Reproduced gap

A point layer with constant opacity `0.7` and a continuous color scale produces an opaque gradient legend. All 60 materialized gradient strips have effective opacity `1`. The existing public `editLegendBlock({ target, channel: "color", symbol: { opacity: 0.7 } })` rejects this because gradients are not glyph samples.

This is an absent control, rather than a demonstrated violation of current opacity inference. [Continuous legends](../../../docs/api/legends/continuous.md) define a gradient as a display of its encoding scale and explicitly reject glyph recipes. The current gradient normalizer accepts only `length` and `thickness`. Categorical symbol inference does not establish a documented constant-mark-opacity policy for continuous ramps. Automatically inheriting point opacity would change existing programs and leave ambiguous cases with field-driven opacity or several consumers.

The generic public reproduction uses two numeric observations and a color scale. It does not contain any translation-dataset program. Translation cases that require a translucent ramp remain held separately; no extra model retries are needed until a supported representation exists.

## Proposed public contract

Add optional `opacity` to the existing `gradient` option object:

```js
program.createLegend({
  channels: ["color"],
  gradient: { length: 200, thickness: 12, opacity: 0.7 }
});

program.editLegend({ gradient: { opacity: 0.4 } });
program.editLegendSymbols({ gradient: { opacity: 0.7 } });
```

- The value must be a finite number in `[0, 1]`.
- Omission at creation means `1`, preserving current output exactly.
- Omission in an edit preserves the stored value.
- The value applies once to every concrete ramp strip, including fill and its matching zero-width strip stroke. It never fades title, ticks, labels, border, or background.
- A zero-opacity ramp retains its geometry, ticks, labels, and layout slot.
- Support both continuous fill-color and stroke-color gradients, across all current edges and corners, free placement, multiple groups, facets, Canvas changes, scale edits, and save/restore.
- Mark opacity and color-scale alpha remain independent. The rendered ramp opacity multiplies any alpha already present in scale colors; it is never also applied to marks.
- A source may request a different legend opacity from its marks. No automatic consumer-opacity inference is added.
- `representation: "symbols"` continues to use its existing glyph contract and rejects `gradient`. Switching back to a gradient follows the current reset rule: default dimensions and default opacity `1` unless explicitly provided in that call.
- `editLegendBlock.symbol` remains unavailable for gradients. No glyph/gradient ambiguity or new top-level action is introduced.

## Stored state and ownership

The gradient configuration owns the optional opacity. Legacy snapshots without it are read as `1`. New persisted snapshots validate a finite unit-interval value; malformed values fail atomically. Editing copies the relevant guide path without mutating any earlier `ChartProgram` or caller object.

The owning continuous legend action explicitly materializes each strip's opacity into `graphicSpec`. SVG and Canvas continue reading concrete graphics only. Renderers gain no semantic inference, and raw graphic primitives remain outside the recommended chart-authoring vocabulary.

## Required implementation evidence after approval

1. Color and stroke gradients: default omission is byte-equivalent to current output; explicit `0`, `0.7`, and `1` affect only the body.
2. Creation, bundled guides, whole legend edit, and focused symbol edit agree for identical final options.
3. Existing dimensions, label positions, target/channel selection, alpha colors, and multi-block legends remain unchanged.
4. Mark edits do not silently change an explicitly chosen ramp opacity. Legend scale refresh and Canvas/facet replay preserve it.
5. Immutable earlier programs and input option objects; rejected non-numeric, non-finite, negative, and above-one values leave the program unchanged.
6. Legacy and new persistence round trips, closed schema rejection, SVG/Canvas concrete opacity parity, and installed-package TypeScript consumer coverage.
7. Synchronize the owning current contract, declarations, action reference, public continuous-legend guide, generated references, and ordinary repository verification. Measure packaging/bundle budgets; adjust only if justified by actual output.

## Decision requested

Approve this explicit nested `gradient.opacity` option with default `1`, body-only semantics, both fill and stroke gradients, and legacy persistence compatibility. Until that decision, runtime source, declarations, and current contracts remain unchanged.
