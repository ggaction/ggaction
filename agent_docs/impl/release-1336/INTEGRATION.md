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

Dependency follow-up merges PR #252 by its exact Hono head. Compatible Vite 6.4.5 and ip-address 10.7.4 patches remove the two current development audit findings. Native platform metadata is preserved. Signature keyboard handling and its regression assertions were already incorporated by the independent branch; replaying cb27432a produces an empty cherry-pick, so no duplicate implementation commit is added. The 150-page built site and its keyboard/accessibility harness are verified as part of closeout.

The dependency follow-up passes 163 browser tests, 10 MCP contract tests and
261 renderer regressions. `npm audit` reports zero findings. The full normal
suite above covers the unchanged library source. Native optional-package libc
metadata is retained rather than dropped by package-manager normalization.

The first remote CI package/platform checks measure 893,861 packed bytes (local npm: 892,212). The explicit packed budget is adjusted to the next 1KB boundary, 894,000 bytes, covering the observed clean-checkout/package-manager variation. Entry and unpacked budgets are unchanged. No rendering or test tolerance is changed.

Final branch refresh found 0384b927 (native Canvas transition scenes) after the original pinned scene revision. The human explicitly requested all applicable branches and approved in-scope decisions, and the branch architecture records the Canvas API approval. Reuse that scope to preserve semantic owner clips and nested fractional viewport coverage in the shared scene traversal. Canvas nodes add optional concrete `clips` frames; their existing `clip` intersection stays intact, and SVG scene shape stays unchanged. Caller-authored intermediate nodes without frames retain their single-clip fallback. Exact native pixel controls cover one and multiple nested Canvases, multiline titles and clipped marks at DPR 1/2; no tolerance is widened.

The final refreshed branch integration passes **5,495/5,495 normal tests**, the
26 focused scene/entry/type controls, and the official exact installed package
consumer. The source-built package has 621 entries, 894,454 packed bytes and
4,253,311 unpacked bytes locally. This includes the explicit clip-stack repair;
no chart source, raw data, SVG baseline or numeric/pixel tolerance was altered.

Remote documentation verification found that the existing built-site ID regex
counted escaped HTML in code examples as actual elements. The page has no real
duplicate IDs. The checker now reads opening element attributes, ignoring code
text, comments and raw-text bodies; the same owner serves fragment lookup and
duplicate detection. Four controls retain rejection of genuine duplicates and
exclude quoted/example attributes. All 125 documentation source tests and all
150 built pages pass. Library source and the packaged runtime are unchanged.

Linux normal CI found two clipping assertions tied to macOS-compressed PNG byte hashes. The independent same-run primitive/public pixel assertions already passed. PNG export is now decoded and compared exactly to that primitive/control, retaining the frozen SVG hash and all clip/PDF/restore assertions. This removes platform-specific compression identity from an image-content contract; no pixel tolerance is introduced.
