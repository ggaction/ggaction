# Documentation development

The public site is generated from this directory with the same pinned Jekyll
runtime used by continuous integration.

The required minimum is Node.js 20+ and Ruby 3.2+, with a resolvable locked bundle
and installed Playwright Chromium. CI pins the recommended Ruby version in
`.ruby-version` (currently 3.2.6). A newer compatible Ruby may pass local preflight;
use the pinned version when reproducing CI exactly. Check the active runtimes first:

```bash
node --version
ruby --version
```

If Ruby is below 3.2, or you need to reproduce CI exactly, activate `.ruby-version` with
your preferred version manager, such as rbenv, mise, or asdf. Then install the
JavaScript, Ruby, and browser dependencies once:

```bash
npm ci
bundle install
npx playwright install chromium
```

Run the complete documentation pipeline:

```bash
npm run docs:verify
```

The command regenerates exact TypeScript signatures, chart images and
thumbnails, and the LLM bundle before checking Markdown contracts. It then
builds `_site`, verifies rendered links and assets, and exercises search,
navigation, keyboard behavior, and responsive containment in Chromium.
It begins with a preflight that reports the exact missing runtime, bundle, or
browser dependency before generation starts.

For a build without browser verification, run `npm run docs:build` followed by
`npm run test:docs:built`.

## Verification evidence and recovery

`docs:generate` refreshes provenance, canonical program snippets, action/type and
capability references, images with source hashes, discovery metadata, and LLM files.
`test:docs` checks sources and executes every registered tutorial/recipe. `docs:build`
writes fresh HTML into `_site`; `test:docs:built` checks rendered links, assets, and
metadata; `test:docs:browser` checks exact search, failure recovery, keyboard state,
Axe accessibility, and every page at 320, 390, and 768 pixels. Browser screenshots
are written under `.artifacts/docs/`. `test:package` additionally executes the same
program registry through an installed package in a browser build.

Fix the first failing stage, regenerate its owned output, then rerun its checks.
Do not treat screenshots from a previous build as current evidence. If preflight
reports only an exact-version recommendation, compatible Ruby is allowed; a missing
runtime, unresolved bundle, or missing browser is a required dependency failure.

Provenance generation reads Git history to distinguish the published baseline,
runtime source, and example source. Use a full checkout (`git fetch --unshallow`
for a shallow clone); the documentation CI job sets `fetch-depth: 0`. Chromium
is required before the source tests because search regressions execute in a
real browser, as well as in the later built-site checks.

For a release, update the package and site versions, then pin that version's
runtime contract fingerprint in `_data/release_contract.json`. Keep the earlier
`release_baseline.json` for migration comparisons. The release status requires
both a matching version and the exact contract fingerprint; later runtime edits
automatically return the documentation to development status. The release workflow
deploys this documentation only after publishing the same annotated tag to npm.
