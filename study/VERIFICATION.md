# Verification record

Date: 2026-10-23 (Europe/Copenhagen). Repository commit: `202b7afd4146a691c136964c4cc53f9c37444513`.

## Local environment

- macOS arm64; Node `v23.5.0`; npm `11.18.0`.
- `npm ci` completed. Installation reported zero audit vulnerabilities. The npm install-script allow-list warning is retained in the log; subsequent installed-package and browser tests succeeded.
- System default Ruby is 2.6.10. Documentation was built with the existing `mise` Ruby **3.2.6** and a satisfied locked gem bundle.
- Playwright Chromium was already installed. These local runs used Chromium, not a new local Firefox/WebKit matrix.
- Final local HEAD equals `git ls-remote origin refs/heads/main`; `git status --short` is empty.

## Completed checks

| Command / experiment | Result | Evidence |
| --- | --- | --- |
| `npm ci` | Exit 0 | [installation log](logs/npm-ci.log) |
| `npm test` | **5,499 passed; 0 failed/skipped**, 258.0s | [normal suite](logs/npm-test.log) |
| `npm run test:browser` | **163 passed; 0 failed/skipped**, 145.6s | [browser suite](logs/test-browser.log) |
| `npm run test:render` | **261 passed; 0 failed/skipped**, 82.0s; 205 approved gallery variants and gallery validation | [render suite](logs/test-render.log) |
| `mise exec ruby@3.2.6 -- npm run docs:build` | Exit 0; Jekyll build completed in 24.1s | [build](logs/docs-build.log) |
| `npm run test:docs:built` | **150 built pages checked** | [HTML checks](logs/test-docs-built.log) |
| `npm run test:docs:browser` | Exit 0; desktop search and all tested documentation pages at **320/390/768px**; keyboard/accessibility/no-JS paths included by the harness | [docs browser](logs/test-docs-browser.log) |
| `npm run test:package` | Exit 0; installed JS, extension, types, browser, output and local MCP consumers | [package consumer](logs/test-package.log) |
| `npm run package:check` | Exit 0; **621 entries**, **894,925 packed bytes**, **4,254,609 unpacked bytes** | [package audit](logs/package-check.log) |
| `npm run benchmark:authoring` | **15/15 expected cases pass**, executable 15, fulfilled 10, falseComplete 0 | [resolver evaluation](logs/benchmark-authoring.log) |
| `node ../study/probe.mjs` | 11 focused checks and 6 program renders complete | [probe](logs/probe.log), [structured result](probe-output/results.json) |

`npm test` includes documentation source tests. A second isolated `test:docs` run was unnecessary. The source was not changed during the study, and no repeated verification is being substituted for new evidence.

The installed-package minimal consumer measured gzip sizes of 446,830 bytes for Full, 229,814 for Basic, and 7,566 for the SVG entry. These are the measured fixtures and local toolchain, not a universal application bundle size.

The first custom probe used an incorrect `hconcat({children: ...})` option. That was a study-script error; inspection of the current API established `hconcat({programs: ...})`. The corrected probe passes. The initial error log is retained as [probe-initial-error.log](logs/probe-initial-error.log), and is not reported as a library regression.

## Direct probe coverage

1. Mutating caller rows does not mutate a created dataset.
2. Editing a derived program preserves the earlier serialized program.
3. A style/scale branch retains identity of unchanged dataset state.
4. Editable persistence round trip preserves the exact SVG string.
5. Graphic-only persistence renders the same SVG without semantic state.
6. A primitive semantic-only change does not implicitly materialize graphics.
7. A domain `encodeX` change does materialize graphics.
8. An invalid opacity action rejects without changing the original state/trace.
9. Source revision recomputes a regression program.
10. Facet and concat programs render through SVG and PNG.
11. A Canvas transition scene is cached by program identity and survives structured cloning.

The descriptor example intentionally demonstrates a static-versus-runtime boundary: `describeAction` can return `supported` with execution `not_run`, while the actual action rejects an invalid numeric value. The resolver example separately records a natural-language field extraction error together with its unresolved warning; the analysis does not count that request as fulfilled.

## Visual evidence

- The generated [original and edited chart comparison](probe-output/composition.png) was opened and visually inspected.
- Fresh [documentation desktop screenshot](../ggaction/.artifacts/docs/desktop.png) and [mobile screenshot](../ggaction/.artifacts/docs/mobile.png) come from the completed built-site harness.
- [Approved render gallery](../ggaction/.artifacts/test/png/charts/index.html) contains the 205 generated variants. The whole gallery is checked by the repository harness; the study does not claim individual human-style inspection of every image.

## Remote evidence, separate from local execution

[Release run 39881207750](https://github.com/ggaction/ggaction/actions/runs/39881207750) targets the cloned commit and completed successfully. All 22 jobs were read through GitHub: candidate, documentation, dataset acquisition, coverage, macOS/Windows, Firefox/WebKit, package/source, seven realistic shards, aggregate verification, publish, Pages build/deploy and Context7 refresh.

[PR CI run 39879409933](https://github.com/ggaction/ggaction/actions/runs/39879409933) succeeded on the final PR head. The separate main push run 39881202375 was cancelled; it is not labeled successful.

This study did **not** rerun local source coverage, the network-backed 50-source realistic suite, the 3,600-scenario artifact runner, the Node 20/22/24 compatibility matrix, or local Firefox/WebKit and Windows tests. The GitHub jobs above are distinct remote evidence for the release. No test results were inferred from an old memory snapshot.

No source fixes, commits, pushes, issue/PR writes, package publications, or documentation deployments were performed. The cloned repository contains only ignored dependency/build/test output beyond the original checkout; the study artifacts are in the sibling `study/` folder.
