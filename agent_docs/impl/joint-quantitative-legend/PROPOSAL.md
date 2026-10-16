# One quantitative legend combining color and point size

## Status and decision

- Gate: `ready-for-review`; **not approved and not implemented**.
- This English review package was explicitly requested. The running library and translation pin are unchanged.
- Proposed addition: `combine: "color-size" | "separate"` on existing `createLegend` and `editLegend`. No new action.
- Omission at creation remains `"separate"`, preserving every existing program. Omission in an edit preserves the stored policy.
- Related #171 covers categorical ordinal size + shape. This proposal is narrower and different: continuous quantitative color + size on one point owner. It does not implement #171 or independent legend anchors (#193).

## Concrete missing capability

The same numeric observation is mapped to both point color and point area. A single sampled legend must show one title, one numeric label list, and one circle per value whose fill and area both follow that observation's scales.

Current public selection of both channels creates two independent blocks: a color gradient or constant-radius color samples, followed by monochrome size samples. Selecting only one block drops the other mapping. Scalar glyph paint cannot express per-value colors on a size legend, and scalar sampled-color radius cannot express the size scale. Proxy marks, fabricated data and raw graphics are not proposed.

Run [`REPRODUCE.mjs`](REPRODUCE.mjs) from any directory with Node. It uses two synthetic observations through the public entry point, writes no source chart, and asserts immutable parents and the actual current two-block result. [`EVIDENCE.json`](EVIDENCE.json) records those concrete graphics and the expected paired sample properties. [`SOURCE_EVIDENCE.json`](SOURCE_EVIDENCE.json) independently records two valid affected source specifications, their complete raw counts, frozen hashes and actual combined legend samples. No chart pixels were inspected.

## Proposed public flow

```js
program.createLegend({
  channels: ["color", "size"],
  combine: "color-size",
  values: [0, 100, 200, 300]
});

program.editLegend({ title: "Purchase total" });
program.editLegendBlock({
  target: "scatterPlot",
  channel: "size",
  symbol: { opacity: 1 }
});

program.editLegend({ combine: "separate" });
```

`combine: "color-size"` already identifies the pair, so `channels` may be omitted when one uniquely eligible point owner is determined by stored program state. If supplied, it must be exactly the unordered pair `color` and `size`. Multiple eligible owners require an explicit `target`; never pick the first owner. Source fonts can be specified at creation through the existing three-option `createGuides({axes:false, grid:false, legend:{...}})` wrapper.

### Eligibility and sampling

1. One ordinary Cartesian point owner with a constant circle shape; no encoded shape, ordinal size, interval color, independent owner, or categorical fusion in this first scope.
2. Its quantitative color and size encodings refer to the **same numeric field and aggregate grain**. Reject different fields, datasets, aggregates or filtered observation sets. Already summarized fields are ordinary numeric inputs.
3. Both resolved scales have the same finite numeric domain endpoints. Each sample uses the existing color and size scale evaluators independently; their supported transforms/ranges need not be identical. Reject unsupported scales and mismatched endpoints atomically.
4. Existing `values` means one shared, strictly increasing finite sample list valid for both scales. `count` and automatic sampling use one numeric sample policy; no duplicate label list and no separate independent count. Zero and domain endpoints remain real values, subject to existing log-domain restrictions.
5. Materialized circle radius comes from the size scale's existing area convention; fill comes from the color scale, including alpha. No pixel size copied from another renderer and no new geometry tolerance.
6. Label formatting/maps, title, typography, border, group/position and layout reuse existing legend policies. Label maps never change sample values or scale domains. Symbol opacity defaults to the existing sampled-color value `1`; explicit opacity/stroke/strokeWidth remain available. Fill and radius overrides are rejected while combined because they would replace the mappings.

### Ownership, editing and transitions

- One stored combined block owns both channel references, one sampling policy and one label/title/layout configuration. The proposed persisted kind is `colorSize`, with target, field, color/size scale references and explicit sampling/configuration; no hidden dataset or mark is created.
- `editLegendBlock` selecting either `color` or `size` resolves the **same** combined block. Whole/focused title, label, symbol, border and layout editors update it once. A patch cannot silently split it or partially change ownership.
- An explicit create/transition to `"color-size"` derives the new common configuration from that call and documented combined defaults, not from whichever old block happens to come first. Existing two selected blocks on that owner are replaced atomically. Ambiguous owners fail.
- `editLegend({combine:"separate"})` deliberately restores the existing two-block representation using the shared explicit typography/title/placement and the shared sample values where the separate family supports exact sampling. The default separate color representation is the existing gradient; its scale is unchanged. An overflow or incompatible transition fails atomically.
- Creating a conflicting color-only/size-only block while the combined block exists requires an explicit transition to `"separate"` first. Representation changes to a gradient likewise require that transition; no accidental half-combined state.
- Removing a legend by either participating channel removes the one combined block, leaving the mark encodings and scales intact. Removing all legends behaves as today.
- Scale/data/mark refresh, Canvas changes, grouped placement, facets, save/import and full/basic package contracts must explicitly rematerialize or reject the same owner. If an edit breaks eligibility, reject the operation atomically; do not retain stale samples or silently split the guide.

## Layout and compatibility

Measure every variable-radius glyph including its actual stroke bounds. Retain current external offset, native vertical/horizontal item spacing and growth for occupied glyph/text bounds; do not add a separate spacing default. One combined title/label list occupies one group slot. Existing side/corner/free-placement and group refresh rules still apply.

All omitted/default `combine` flows, including current two-block channel selection, must retain exact semantic and graphic output, persistence shape, and trace decomposition. Legacy snapshots without `combine`/`colorSize` remain valid and preserve the separate representation. Unknown or malformed new persisted fields reject atomically. Public types, action metadata, current contracts and documentation must agree before the feature can be integrated.

Domain actions explicitly write the combined samples into concrete `graphicSpec`; renderers remain graphic-only. No observer, semantic compiler or automatic drawing pass is introduced. Implementation would update the current architecture's guide-ownership paragraph and the owning current legend contract, rather than duplicate its action catalog here.

## Required evidence after approval

- Public two-row and full-source probes: one title/label list; every sample's color, area, order and label exact; zero/endpoint samples retained.
- Omitted behavior byte parity, independent channels, existing color+shape combinations and categorical/ordinal size unchanged.
- Create/whole/focused/block editor equivalence; explicit split/recombine, removal and refresh; aliases address one block once.
- Invalid pairing/domain/aggregate/shape/value/style and conflicting channel selection fail without mutating the parent or caller inputs.
- Variable circle/stroke/font bounds, all placements, grouped/facet/Canvas refresh, collision/overflow checks, SVG and Canvas/PNG consistency.
- Immutable persistence round trips and malformed snapshot rejection; full/basic behavior, declarations, generated metadata, docs and installed-package consumers.
- No release, package publishing, documentation deployment or translation-success claim is implied by proposal approval.
