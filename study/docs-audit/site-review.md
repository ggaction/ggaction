# Site usability and recovery findings

Snapshot: v0.0.22 / `202b7afd4146a691c136964c4cc53f9c37444513`. The built site comes from the previous completed build of this unchanged source. Fresh browser probes are in `evidence/site-probe.json`. These observations are separate from all-page structural/accessibility checks, which previously passed.

## U1 Search works mechanically but misses ordinary task wording

Confirmed observation, P2. `docs/assets/js/docs-search.js:119–160` normalizes case/camelCase, then relies on literal substrings/all tokens and alphabetical tie-breaks. In actual rendered search: `change colors` and `change the colors` return zero results; `how do I change the axis label` returns zero. `update data` ranks Annotation Recipe, Canvas, then the reviseData reference, with Data Updates fourth. `export svg` ranks Accessibility first and does not return the Rendering guide among its four results. Exact `createScatterPlot` correctly routes to its action reference. The corpus has the necessary subject matter; the failure is retrieval/ranking, not absence of capability.

Use an intent query regression set, singular/plural and stopword normalization, explicit task aliases from canonical metadata, and higher weights for canonical subject ownership. Avoid adding an LLM dependency merely for search. Accept expected guide or API among the first three for a curated set, retain exact-action ranking and failure recovery. The 26-query probe is exploratory, not a benchmark success percentage: expected results were not pre-registered for every query.

## U2 Desktop navigation disguises collapsed groups as static headings

Confirmed visual finding, P2. `docs/assets/js/docs-navigation.js:30–37` opens only the active group. `docs/_sass/docs/_navigation.scss:138–153` hides the native summary marker; only the mobile media query (`_responsive.scss:85–103`) adds plus/minus and pointer affordances. At 1440px, five collapsed category headings resemble labels, unlike inner branches that show plus/minus. Screenshot: `evidence/home-desktop.png`.

Give every expandable group a consistent indicator, hover/focus treatment and target size at all widths. This is a discoverability problem; controls remain keyboard-operable and are not claimed inaccessible by Axe.

## U3 Repeated provenance competes with useful search content

Design opportunity, P3. Every page precedes its content with status, 293-action count and contract fingerprint (`docs/_layouts/default.html:46–49`). Every search result repeats kind/status/hash (`docs/assets/js/docs-search.js:193–195`), producing two lines before its title in the 390px screenshot `evidence/search-mobile.png`.

Preserve provenance in version details and machine artifacts; show a compact version once in search and a result-kind label only where useful. Keep a visible development warning when relevant. No metadata correctness defect is asserted.

## U4 Reader to editor handoff lacks a page-specific source route

Design opportunity, P2. The layout/footer (`docs/_layouts/default.html:45–55`, `docs/_includes/docs-footer.html:1–11`) offer generic GitHub, but no page-specific edit/source/report link. Generated pages have source notices, yet ordinary pages have no consistent contributor entry. `docs/README.md` and CONTRIBUTING document setup and complete checks, but not a concise target → authoritative input → generator → focused check mapping.

Extend the existing page manifest with ownership/edit metadata. For handwritten pages link exact source; for generated pages link the generator's canonical input, never encourage edits to output. Add a small contribution guide for typo, runnable sample, API change and generated reference changes. Accept that each published page has a source owner and a stable edit/report route.

## U5 Recovery example commits host state before rendering succeeds

Confirmed conditional failure, P2. `docs/errors-and-recovery.md:50–75` catches both action and rendering errors but assigns `current = candidate` before `render`. With a deliberately invalid Canvas context, the result is `{ok:false}` yet current has changed. A second reproduction uses a valid native 2D context: editCanvas accepts width 40000, then rendering rejects the maximum physical dimension of 32767 before allocation. Again current has changed despite failure, and the native Canvas remains 1px wide. `recovery-probe.mjs` reproduces both. The library's immutable original remains intact; the host's current pointer is the affected state.

Clarify separate authoring/output failure boundaries. Retain the prior pointer until the required output succeeds; when visual rollback matters, draw to an offscreen target before replacing the visible output. State that moving the pointer alone cannot undo partial Canvas drawing. Add an explicit renderer-failure example alongside an action-failure example.

## U6 Margin troubleshooting lacks a safe continuation for existing charts

Confirmed precondition gap, P2. `docs/troubleshooting.md:11–32` suggests `program.createCanvas(...)` under a legend-margin error without specifying that program must not already have a Canvas. Applied to an existing chart it throws `createCanvas requires a program without a canvas.` The snippet also discards the returned immutable program.

Show both contexts: set margins with createCanvas during initial setup; use and assign editCanvas for an existing program. Clarify that a legend action that originally threw must be retried on the updated branch. The initial-construction form can be valid; the problem is the unstated prerequisite/recovery path, not createCanvas itself.

## Corpus and rendered size observations

All 150 manifest pages were inventoried, representing 417 tracked docs files. There are 1,680 raw fenced blocks, 1,698 rendered code blocks and 1,917 search entries. The full LLM bundle is 1,914,002 UTF-8 bytes and the search JSON is 856,905 bytes. Generated Exact TypeScript Contract alone is 12,651 source lines/659 code blocks/358,078 bundle bytes. The guides action reference is about 41,696px high at the tested desktop width, but already has an action filter; do not report filtering as absent. Splitting/targeted retrieval are improvements to consider, not evidence that the page is intrinsically broken.

Fresh targeted probes produced no page JavaScript errors and no horizontal document overflow on the six inspected desktop routes. Mobile screenshot was captured after the opening animation completed. The initial mid-animation screenshot was replaced and is not treated as a defect.
