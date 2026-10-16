# Support two independent Cartesian axes on the same plot

Independent position scales already work, but a plot cannot keep both a left and a right Y-axis. Calling `createYAxis` a second time throws `createYAxisLine requires a missing y-axis line.` Removing the first axis before creating the second leaves only the right guide. This blocks five reviewed references; their original data, separate domains, typography and positions must survive.

## Reproduction

Run `node agent_docs/impl/independent-axis-guides/reproduce.mjs` at the pinned review revision. The synthetic three-row example uses only existing public mark/encoding/axis actions. Both marks and independent scales remain, the second guide fails atomically, and the prior immutable program stays unchanged. The structural evidence is saved alongside the script. No chart pixels were inspected.

## Proposed existing-action extension

- Add optional `id` to `createXAxis` / `createYAxis`, preserving legacy canonical x/y resources and output when omitted.
- Add optional axis-resource `target` to complete and focused axis editors/removers. Preserve canonical omitted-target behavior; require an explicit target when several named-only candidates exist. Never choose the first candidate.
- Allow `createAxes({y: [{id, scale, position, ...completeAxis}, ...]})` and the corresponding x-array, also through `createGuides.axes`. This declares complete axes together before focused edits, without adding top-level actions or requiring many options per action.
- Limit the initial scope to one axis per physical side and Cartesian coordinate: left+right Y and top+bottom X. Duplicate same-side axes fail; automatic displacement and arbitrary axis offsets are outside scope.

Use one axis-ID-keyed semantic guide map, preserving canonical x/y entries. Named entries record their channel; materialization configs and concrete component IDs follow that identity. Data, scale, coordinate, Canvas, theme, grid and legend consumer plans must retain every bound axis. Renderers continue reading only fully materialized graphics.

A concrete proposal, state/compatibility rules, affected-reference hashes and test matrix are in this review package. Required tests cover legacy exact parity, both orientations, complete/focused edits/removals, explicit/ambiguous selectors, atomic failure, persistence, rematerialization, bounds, SVG/Canvas/PNG/PDF and installed-package consumers.

**Proposal only; implementation awaits explicit user approval.** No public API or runtime code has changed.
