# Integrated release checkpoint

## Authorization and scope

The human requested integration of translation-discovered fixes, all applicable
branches and pull requests, current documentation, package publication and the
external dataset viewer. The final translation cutoff is 1,336 distinct families.
Existing in-scope design approvals are reused; no new chart authoring is admitted.
This checkpoint merges the batch library branch at `35d1c407` and the independent
axis/editor/scene branch at `3f8f7f06` without discarding either behavior set.

## Merge ownership

- Keep continuous Line/Arc color and Tick color, categorical unknown Line colors,
  nullable direct-Line coordinates and density grouping. Validate path appearance
  only after semantic scales and grouping grain are available.
- Keep concrete clips and multiline text in the extracted SVG serializer. The
  read-only scene entry consumes concrete graphics and canonical layer selectors.
- Keep named axis ownership, batch axis edits and same-edge side-legend reflow.
  Independent side-legend regression suites are retained rather than overwritten.
- Combine rotated/content-anchored/field-title facet headers and retained guide
  clearance. Existing safe header offsets remain stable; when outward guide ink
  consumes an offset, reserve a complete lane beyond the guide. Content anchors
  measure mark bounds once. Atomic source edits retain header intent before
  derived cells are rebuilt, including same-facet-ID rematerialization.
- Merge canonical action intents and reference sources before regenerating cards,
  relationships, signatures, search, types, gallery images and LLM documentation.
- Measure package and browser payloads before adjusting explicit size budgets.
  No data limits, geometry tolerances or expected rendering dimensions are relaxed.

## Verification record

The first combined normal run exposed 33 integration regressions. Focused tests
isolated and repaired scale-aware path validation, density grouping, legend
spacing, source-edit intermediate state, facet header bounds, scene ownership and
documentation routing. A subsequent normal run passed 5,490/5,490 tests.
The installed consumer additionally found a 4px shared-to-stacked facet drift;
its original 302px expectation is retained. The corrected combined guide policy
passes 124 focused controls, including outward polar labels and existing compact
facet examples. The final normal run and exact package consumer are recorded at
the verified commit checkpoint; this document alone is not publication evidence.

Full-bounds independently packed facet flow and shared footer axes (#258) are
still an unfinished public integration. Pure layout and measurement preparation
must not be described as a complete public feature. Preserve the issue and its
acceptance criteria until the actual public path is implemented and verified.

Final combined runtime verification: **5,490/5,490 normal tests** and the exact
619-entry installed package consumer pass. The package was measured at 892 KB
packed; no source/runtime changes followed those checks before this checkpoint.
Generated provenance is refreshed in the following metadata-only commit.
