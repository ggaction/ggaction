# Documentation and contract test findings

Audit target: `31ce29f31e5ae87c57759a5b3e002db1f29a4808`. Repository files were not edited. This is a test audit, including helpers in `scripts/` that determine what tests actually run.

## D01 P1 Packed browser tutorial preparation silently overwrites five registered snippets

- `scripts/tutorial-consumer.js:37` derives the artifact name from `example.file` alone; lines 48–54 repeatedly write the same `main.js`, replace the same build input, and append another consumer with the same URL.
- Current registry has 55 entries but only 50 distinct files. `recipes/line-chart.md` has 2 entries; `api/marks/line-area.md` has 5. Actual preparation leaves 5 earlier snippets absent from build inputs. The later browser loop visits the last snippet repeatedly.
- Reproduced by exposing the original private preparation function in an external module. See `evidence/docs-consumer-collision-probe.mjs` and `evidence/docs-consumer-collision-result.json`.
- Scope: Node exact-code execution includes `example.id` in its output filename, and still runs 55 cases. This is a packed-browser witness gap, not proof those snippets are broken.
- Fix: use one stable snippet ID across registry, generated path, test name and receipt. Assert bijection between IDs, unique output files, build inputs and executed consumers. Add duplicate-file regression fixture. Acceptance:55 unique cases and 55 distinct prepared sources; changing any of the five previously lost snippets causes its own browser case to fail.

## D02 P2 Snippet inventory lacks an explicit execution witness for each contextual block

- `test/docs/documentation-coverage.test.js:199` checks registration/hash/owner/reason length; `scripts/doc-snippet-coverage.js:23` distinguishes executable and generated. Observed 680 recognized JS blocks comprise 55 execution registrations,220 generated blocks,405 contextual exceptions (59.6%). 74 files have only exceptions in this registry.
- This accounting is useful and should be retained. It does not establish that 405 fragments remain valid with current prerequisites. Exception reasons repeatedly say imports/resource state/branch are required, rather than identify executable setup or an expected rejection. This also includes intentionally erroneous troubleshooting fragments, which should assert the expected failure instead of being indiscriminately run as success cases.
- Do not claim these 405 blocks have no testing anywhere: README and many API behaviors have separate specialized tests. The gap is absence of an explicit per-snippet witness linking those tests to exact displayed code.
- Evidence: `evidence/docs-coverage-summary.json`, `evidence/docs-snippet-collisions.json` and `docs/_data/snippet_exceptions.json:2`.
- Fix: distinguish complete, continuation, intentionally-invalid, generated-typecheck and prose-only cases. Register a setup fixture or existing witness for high-traffic README/troubleshooting/extension/axis/legend examples; show execution and exception counts separately; reject unexplained exception growth. Acceptance: every supported executable example has code-hash→test-witness mapping, and intentionally invalid examples fail for their documented reason.

## D03 P2 The snippet scanner silently misses ordinary fence forms

- `scripts/doc-snippets.js:21` recognizes only exactly 3 backticks/tildes at column 0. Synthetic four-backtick and two-space-indented JS fences produce zero blocks. `js title="example"` produces an unclosed-fence error; TS blocks are parsed but excluded by `scripts/doc-snippet-coverage.js:19`.
- Reproduced current parser in `evidence/docs-parser-probes.json`. This is a future coverage/enforcement gap; no assertion that an existing public example is currently hidden this way.
- Fix: align extraction with the site's Markdown grammar, or explicitly validate/reject unsupported fences. Fixture-test longer fences, indentation, nested lists, inline attributes, closing-fence lengths and JS/TS policy. Acceptance: unsupported executable blocks never disappear silently from accounting.

## D04 P2 Execution contracts do not fully encode environment or expected result

- `scripts/doc-snippets.js:58` only requires truthy `environment` and `result`; it does not validate their vocabulary. Current entries are 29 node-esm +26 browser-module.
- `test/docs/executable-programs.test.js:19` always supplies a native Canvas and a fake `document.querySelector` that accepts any selector; injected `fetch` ignores its requested URL. The test does not dispatch by environment. Only 13 of 55 entries compare `graphicSpec` to a canonical program; the other 42 have program/canvas/nonempty-object smoke assertions.
- `scripts/tutorial-consumer.js:40` always appends a render call. Its rendered-ink check is useful, but cannot prove a displayed browser example actually called render itself. Browser consumer tests compensate for many URL/DOM issues, so this is about accurately bounded contracts, not claiming all browser snippets run only in mocks.
- Fix: validate registry schema; represent authoring-only versus render-owning snippets explicitly; test stated selectors/URLs, expected mark identities/counts and a few literal values; name test cases with snippet IDs. Acceptance: a wrong selector/request, missing required render or wrong documented channel is rejected at the declared evidence layer.

## D05 P2 Several contract tests pin prose and historical planning text

- `test/contracts/action-value-vocabulary.test.js:48–50` pins planned-corpus calls and a Korean sentence, then mixes current runtime vocabulary, prior planning state and prose through line215. Other examples: `test/contracts/documentation-truth.test.js:47` selects an exact Korean architecture heading; `test/docs/getting-started.test.js:47` and `test/docs/documentation.test.js` pin instructional phrases.
- The test instructions explicitly distinguish navigation metadata from runtime truth and discourage exact Korean prose. Existence of current contracts, required package entry tables, and canonical anchor/link checks is appropriate; the problematic part is unrelated wording/plan content becoming product-test truth.
- Impact: editorial rewrites can cause failures without a behavior regression; updating the sentence and regex together supplies little independent evidence of correctness.
- Fix: move vocabulary and status checks to structured current catalog/types/runtime data; retain only meaningful public anchors and link-integrity constraints in docs tests. Keep historical-plan navigation separate. Acceptance: equivalent prose rewording passes, while removing/changing a public supported token or canonical link fails.

## D06 P2 Architecture regex checks have both bypasses and false positives

- `test/contracts/source-boundaries.test.js:152` matches literal `semanticSpec.layers.find(...)`; optional chaining, bracket notation and an alias bypass it. The same expression inside a comment is rejected. `_clone` at line 141 has the same spelling dependency.
- Reproduced literal check using five cases in `evidence/architecture-regex-probes.json`. No current production violation is alleged. Import boundaries already use `es-module-lexer`; preserve that stronger existing component.
- Fix: narrow syntax checks to an AST rule with documented limits, and pair critical ownership with behavioral call/state assertions. Acceptance: comment/string examples pass; equivalent prohibited direct syntax forms fail; alias/dataflow limits are explicit; allowlisted selector modules still pass.

## D07 P3 Type-test harness and historical filenames add maintenance cost

- Inventory found 60`*-types.test.js` files;65 JS modules contain both `spawnSync` and `--skipLibCheck`. They repeat temp directory setup, embedded `.mts` strings, compiler flags, subprocess diagnostics and cleanup. There are 558 lexical `@ts-expect-error` markers across tests.
- This is not a claim that declaration errors are globally suppressed: `test/docs/documentation-coverage.test.js:230` explicitly compiles isolated declarations without skipLibCheck, and package consumers add end-to-end checks. Positive/negative typing fixtures are valuable.
- Existing stable filenames retain `phase2-data-types`, `phase5-scale-types` and `composition-phase10-types`, conflicting with capability-oriented naming. Several type fixtures are compressed to very long lines, making failures and diffs harder to interpret.
- Fix: a small shared compiler harness, normal fixture files, uniform strict options/diagnostics/timeouts and capability names. Batch compilation only after measuring runtime, preserving fixture-specific diagnostics and negative cases. Acceptance: intentional positive/negative mutations are detected; all current cases remain reachable; run receipts expose compiler version and each fixture result.
