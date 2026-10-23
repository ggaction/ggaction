# Test Guide

Install dependencies and the browser runtime before running tests:

```sh
npm ci
npx playwright install chromium
```

The default suite runs unit, contract, chart, gate, and documentation tests.
Some unit support and documentation interaction tests launch Chromium, so the
browser runtime is required even when the separate browser suite is not selected:

```sh
npm test
```

The default suite deliberately excludes network-backed realistic corpus sweeps.
Fetch the checksum-pinned TidyTuesday corpus once, then run those contracts
explicitly:

```sh
npm run datasets:sync
npm run test:realistic
```

CI and the release preflight cache the verified corpus by the corpus manifest
hash and fetch it on a cache miss. `npm run test:coverage` instruments the default
suite and does not require the corpus. Run both `npm run test:coverage` and
`npm run test:realistic`: source coverage and realistic corpus sweeps are separate
validation gates, and neither replaces the other.

Every suite launched through `scripts/run-tests.js` runs at most four test files
concurrently, independent of the host CPU count. The limit does not change the
discovered file list or order, coverage policy, or concurrency managed inside an
individual test module.

Use a selector after `--` while developing one capability:

```sh
npm test -- chart:cars-histogram
npm test -- capability:selection
npm test -- unit/actions/scales
```

Selectors match an exact chart directory, a named capability in
`test/capabilities.json`, an exact test file, or a directory prefix relative to
`test/`. Each capability entry declares either `file` or `prefix`; unknown
capabilities and accidental filename substrings never match. Every normal test
belongs to at least one named capability, so focused runs remain complete as the
suite grows. Realistic corpus sweeps, browser tests, and PNG regressions remain
explicit because they require external data or rendering resources:

```sh
npm run test:browser
npm run test:render
npm run test:render -- chart:cars-histogram
```

A focused render clears generated PNGs, renders only the selected chart or
capability, and deliberately skips the full gallery. Running `npm run
test:render` without selectors rebuilds and validates the complete gallery.

Browser tests share `test/support/browser.js` for navigation, readiness, and
console/page error capture. Public example-specific state probes belong in the
example registry so the shared browser suite can verify them without adding a
new Chromium lifecycle per chart.

`npm run test:gates` reports `No active gate tests.` and succeeds when every
approved visual slice has graduated into `test/charts/`.

Every JavaScript module under `test/` must be reachable from a discovered test,
render entry, browser entry, or an HTML module script. An active `test/gates/`
directory must include an executable contract test, a PNG render entry, and a
manifest or primitive program; approval graduates the complete slice together.

`test/support/program-state.js` owns assertions for named program resources and
atomic rejection. The atomic helper snapshots every own program state field,
including private non-enumerable state, and can also verify caller-owned option
objects through each case's `inputs` list. Prefer those helpers when a test needs
an existing dataset, layer, scale, coordinate, or graphic, or when several
invalid calls must prove that the input program remains unchanged.

Visual manifests treat the `userFacing` factory as the canonical executable
program. Their displayed `callChain` is presentation metadata: the render harness
parses it without evaluation and requires its top-level actions to match the
factory trace exactly.

Approved representative charts may also declare a compact visual signature:
an ink-density range and logical ink bounds with either one small tolerance or
per-bound tolerances when platform font metrics affect only selected edges.
Signatures catch major layout regressions without committing platform-sensitive
full PNG snapshots; primitive and user-facing renders must still match
pixel-for-pixel on the same platform.

Artifact scope shape is owned by `test/support/artifact-schema.js`. Approved
artifacts live under `charts/<capability>/<chart>/<variant>/`, while active
review artifacts live under `review/<chart>/<variant>/`. Paths,
metadata validation, render manifests, and gallery generation consume that
registry so new capabilities do not add independent conditionals across the
test infrastructure. Run `npm run artifacts:clean` to remove generated output.

Reference datasets are registered lazily in `test/support/data.js`. Use
`fixtureRows(id)` for a shared frozen oracle and `loadDataset(id)` or the named
loaders when a test specifically needs caller-owned mutable rows.

Independent expected-value algorithms live in `test/oracles/`. Oracle modules
must not import from `src/`: they are a separate mathematical implementation
used to catch shared implementation mistakes rather than repeat production
helpers. Keep a few representative literal expectations in chart tests as
anchors for the oracle itself and for important public examples.

Full coverage output and runtime receipts are retained in `.artifacts/coverage/`,
including when critical thresholds fail.

Critical coverage is owned by `scripts/coverage-policy.js`. Family rules apply
minimum floors to every current and future file under high-risk boundaries;
explicit per-file overrides are reserved for modules that warrant stricter
thresholds. This prevents a newly split policy or renderer from escaping the
coverage contract.

Installed consumers use exact peer versions from `package-lock.json` by default.
Use `GGACTION_PEER_MODE=latest npm run test:package` (or `test:platform`) for a
separate latest-compatible peer check. Receipts record the resolved versions.
CI checks launched by `scripts/run-check.js` have a 90-minute deadline, preserve
timeout/cancellation identity, and terminate their child process tree.


The canonical suite runner also uses the process-tree deadline wrapper. Set
`GGACTION_CHECK_TIMEOUT_MS` to a positive millisecond value to shorten or extend a
local deadline; timeout exits with 124, interrupt with 130, and cancellation with
143. CI jobs have an additional 120-minute ceiling. Coverage writes the complete
Node report, per-file `metrics.json`, and a receipt with the commit, dirty paths,
and tracked-diff digest under `.artifacts/coverage/`. CI retains these on success
and failure for 14 days. The separate peer-compatibility job exercises the latest
compatible native peer; baseline qualification remains lockfile-pinned.


Installed package qualification is owned by `scripts/consumers/`: Node public
contracts, MCP transport, declarations, and optional peer installation have
separate runners. Editable Node fixtures are grouped by contract owner and
registered in `fixtures/node/manifest.json`. Every case gets its own status,
duration, and original error in `.artifacts/consumers/node-cases.json`; independent
qualification phases continue after a failure and write `qualification.json`.
The package install is shared and its directory is always reclaimed.

Type contract tests use `test/support/typescript.js`, which preserves each
fixture's compiler options and negative assertions, invokes the compiler through
Node on every platform, applies a 60-second deadline, and records compiler
version, arguments, diagnostics, and status under `.artifacts/types/`.

`test/charts/baseline-evidence.json` lists every primitive baseline's transitive
production imports and independent oracle imports. Regenerate it with
`node scripts/baseline-evidence.js`. Equality with a primitive proves equivalent
construction and same-run output; it does not establish independence of shared
layout, scale, or shape calculations. In particular, mark-selection baselines
reuse production point-shape construction, and composition references reuse the
production layout resolver. Their selection/order and composition-equivalence
assertions are complemented by literal shape/geometry tests in the owning slices
and `test/unit/layout/composition-layout.test.js`.

`corpus-mutation-relations.test.js` reports bounded input-size tiers and pathology
postconditions separately from real-source sampling. Its 32/512/4096-row point
cases are stress witnesses, not a scalability benchmark. Seed, original and
mutated rows, sample/source counts, category counts, missing/duplicate/negative/
constant-value dimensions, and explicit aggregate expectations are retained in
`.artifacts/corpus/`. Rename collisions and finite-number overflow fail before a
mutation can silently destroy evidence.

Realistic runs preload `scripts/test-file-metrics.js` in each isolated test
process. `.artifacts/timings/` records file elapsed time after preload, peak RSS,
exit status, exact Node/platform/architecture, and CI run identity. CI retains
these records for 30 days. Summarize downloaded runs with
`node scripts/summarize-test-timings.js <directory> ...`; medians and p95 values
use successful samples, report failures separately, and never pool different
environments. Keep the committed scheduling weights until repeated comparable
CI samples justify an update. Local measurements do not replace Ubuntu weights.

Documentation programs declare `environment`, `mode`, `rendering`, and result
bindings. A `renders-canvas` example must paint its own Canvas; the browser
consumer renders returned programs only for `authoring-only` examples. Node
execution accepts only the documented Canvas selectors and exact dataset URL.
Node and packed-browser receipts retain stable case IDs and exact code hashes.
`node scripts/doc-snippet-coverage.js` reports registration, current observed
passing execution, generated reference blocks, and contextual exceptions as
separate counts. Hash-pinned exceptions and generated blocks are not execution
evidence. README Quick start and immutable branches now have executable cases
and explicit three-mark expectations.
