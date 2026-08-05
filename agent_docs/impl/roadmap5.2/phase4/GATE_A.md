# Gate R52-P4-A — Supported CI, Compatible Dependencies, and Browser Bundle Budgets

## Gate state

`ready-for-review`

## Review target

1. Release workflow의 first-party actions가 supported Node 24 revisions를 사용한다.
2. Exact annotated tag, single reviewed artifact, protected publish와 Pages dependency chain이 유지된다.
3. Compatible direct/transitive dependencies가 갱신되고 production/full audit가 0이다.
4. Vite와 `es-module-lexer` major update는 근거와 함께 명시적으로 연기된다.
5. Installed `ggaction/basic` minimal Vite consumer가 120,000-byte gzip ceiling 이하이다.
6. Full/basic/SVG ceiling은 225,000/120,000/25,000으로 executable source와 docs가 일치한다.
7. Existing public API, program state, action trace, package entries와 renderer pixels는 바뀌지 않는다.

## Required evidence

- Official action release/runtime evidence and focused release-workflow contract
- Exact direct/transitive dependency diff and npm production/full audits
- Focused native, browser, package and TypeScript compatibility results
- Installed full/basic/SVG minified/gzip measurements
- Basic public capability/export parity and existing semantic/trace evidence
- Cumulative normal, coverage, documentation, package and renderer suites
- Verified remote checkpoint on `origin/codex/roadmap5-2-hardening`

## Evidence

### Supported release workflow

- Official runtime audit selected `actions/upload-artifact@v7`, `download-artifact@v8`, `configure-pages@v6`,
  `upload-pages-artifact@v5` and `deploy-pages@v5`; each direct JavaScript action runs on Node 24 and the Pages upload
  composite uses upload-artifact v7.
- Existing artifact names and paths, annotated-tag verification, exact artifact identity, protected environments,
  permissions and publish/Pages dependency order remain unchanged.
- Focused release-workflow contract: 4/4 pass; workflow YAML parse pass.

### Compatible dependencies and security

- Installed compatible revisions: `@napi-rs/canvas@1.0.3`, `playwright@1.62.1`, `postcss@8.5.25`.
- `npm audit --omit=dev` and full `npm audit`: vulnerabilities 0.
- Vite 8 and `es-module-lexer` 2 remain explicit major-version deferrals.

### Basic bundle promise

- Basic registration retains the same `chart`/Canvas `render` exports and chart facade capability set while excluding
  full-only transform implementations, Parallel validation and selection-driven legend highlighting from its module graph.
- Representative Basic output matches full-entry semanticSpec and graphicSpec; Basic trace composition is locked by a
  focused regression test.
- Installed minimal Vite consumer: Basic 241 → 210 modules and 126,454 → 112,984 gzip bytes.
- Final installed measurements: full 222,930, Basic 112,984, SVG 5,760 gzip bytes, within executable ceilings
  225,000/120,000/25,000.
- Package artifact: 412 entries, 386,876 packed bytes and 1,827,671 unpacked bytes. Entry and packed ceilings stay fixed;
  the internal unpacked ceiling moves narrowly from 1,825,000 to 1,835,000 for the 3,748-byte source split.

### Cumulative verification

- `npm test`: 2,061/2,061 pass
- `npm run test:coverage`: 94.74% lines, 90.25% branches, 98.47% functions; 70 critical floors pass
- `npm run test:docs`: 45/45 pass
- `npm run contracts:catalog:check` and `npm run package:check`: pass
- `npm run test:package`: installed runtime/types/tutorial/native/browser consumers and all bundle budgets pass
- `npm run test:browser`: 53/53 pass
- `npm run test:render`: 136/136 pass; approved and active-review galleries verified
- `git diff --check`: pass

## Approval effect

Approval freezes the supported workflow, dependency set and browser bundle ceilings and opens Phase 5 integration and
closeout. It does not authorize PR creation, merge, publish, documentation deployment or release.

## Work blocked before approval

- Phase 5 integration/closeout and R52-Exit
- PR creation, merge, package publish, documentation deployment and release

## Remote checkpoint

- Implementation checkpoint: `8c4895daf2301c58ba63a913cdef883b7d7accd6`
- Remote branch: `origin/codex/roadmap5-2-hardening`
- Local and remote implementation checkpoint hashes matched before this Gate record was finalized.
