# Contributing to ggaction

Thank you for helping improve ggaction. Small, focused contributions are the
easiest to review and the most likely to land quickly.

## Before you start

- Search the existing issues before opening a new one.
- For a bug, include a minimal program, the expected result, the actual result,
  your Node.js version, and whether the problem affects Browser Canvas, SVG,
  Node PNG, vector PDF, or more than one output.
- Open an issue before making a material change to the public API, persisted
  program state, package boundaries, or core architecture. These changes need an
  agreed direction before implementation.
- Keep each contribution to one coherent conceptual change.

## Development setup

ggaction is ESM-only and requires Node.js 20 or later. Documentation work also
uses the Ruby version pinned in `.ruby-version` and Chromium through Playwright.

```bash
npm ci
bundle install
npx playwright install chromium
npm test
```

Use a focused selector while developing:

```bash
npm test -- chart:cars-histogram
npm test -- capability:selection
npm test -- unit/actions/scales
```

Rendering and browser-facing changes may also need:

```bash
npm run test:browser
npm run test:render
```

For a quick content check while editing documentation, run:

```bash
npm run test:docs
```

Before opening a pull request with documentation changes, run the complete
generated-content, site-build, link, and browser check:

```bash
npm run docs:verify
```

See `docs/README.md` for documentation runtime setup and `test/README.md` for
selector, rendering, and artifact details.

## Change expectations

- Preserve `ChartProgram` immutability and do not mutate caller-owned input.
- Keep chart terminology source-neutral.
- Keep source, tests, TypeScript declarations, current contracts, public docs,
  generated references, and examples synchronized when a user-facing behavior
  changes.
- Add or update tests that fail without the change and pass with it.
- Do not mix unrelated refactors into the same contribution.

## Pull requests

In the description, explain:

1. the user-visible problem or capability;
2. the chosen behavior and any important tradeoffs;
3. the tests and documentation you updated; and
4. the commands you ran to verify the change.

If the change affects rendered output, include the relevant visual evidence and
state whether Browser Canvas, SVG, Node PNG, and vector PDF remain aligned.

By contributing, you help make chart authoring more inspectable, traceable, and
useful to everyone.
