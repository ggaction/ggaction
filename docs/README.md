# Documentation development

The public site is generated from this directory with the same pinned Jekyll
runtime used by continuous integration.

The locked GitHub Pages toolchain requires Node.js 20+ and the exact Ruby
version in `.ruby-version` (currently 3.2.6). Check the active runtimes first:

```bash
node --version
ruby --version
```

If Ruby does not match `.ruby-version`, install and activate that version with
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
