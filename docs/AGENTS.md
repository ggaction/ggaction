# Public Documentation Instructions

Apply these instructions to `docs/`, `README.md`, public documentation generators, and user-facing documentation artifacts in addition to the repository root instructions.

## Documentation and Implementation Consistency

- Do not leave known contradictions between the implementation and its documentation.
- Documentation updates must always accompany the implementation change they describe and must be included in the same conceptual commit.
- When behavior, APIs, stored structures, or implementation contracts change, update the relevant README or current documentation before considering the change complete.
- Write public-facing files such as `README.md` and pages under `docs/` in English.
- Treat `docs/` as user documentation: prioritize installation, user-facing APIs, observable behavior, examples, and the minimum core concepts users need.
- Let one canonical reference page own the normative signature and behavioral contract for each public API. Tutorials, recipes, and overview pages should teach or route to that owner rather than duplicate the full contract.
- Organize public documentation through progressive disclosure: getting started and tutorials first, then task-oriented recipes, chart API, advanced chart API, extension API, and finally the canonical action reference. Do not require ordinary chart authors to understand primitive actions or internal architecture before they can produce a chart.
- Give tutorials and recipes distinct roles. Tutorials teach a complete, ordered workflow with explanation; recipes solve one narrowly scoped task with prerequisites, the minimal code, and the expected result. Do not duplicate an entire tutorial as a recipe or scatter one workflow across unrelated pages.
- Every public code sample must be directly runnable in its stated environment. Include the required imports, data-loading assumptions, and invocation context; when a deliberately incomplete excerpt is clearer, label it as a fragment and state its prerequisites explicitly.
- When a tutorial demonstrates an edit action, continue from its canonical runnable program and choose values that produce the observable change being taught. Do not present a no-op option listing as an edit example.
- Use one canonical public program for each documented chart and reuse it across the example, tutorial, acceptance test, and generated image whenever those artifacts demonstrate the same workflow. Do not maintain independently copied action chains that can drift.
- Keep one canonical action reference with exact signatures for discovery by users and language models. Every action exported from a public entry point and declared in TypeScript must be classified as chart authoring, advanced chart authoring, or extension authoring and documented in the matching public API section.
- Whenever a public action is added, removed, renamed, reclassified, or changes signature, update its JavaScript export, TypeScript declaration, `docs/reference/actions.md`, relevant API page, examples that use it, and the current scope in `docs/llms.txt` in the same conceptual commit.
- Keep navigation generated from a consistent information architecture. Avoid arbitrary per-page menu exceptions, duplicated catalog entries, or navigation labels that expose repository structure instead of user tasks.
- Treat the built site as the documentation product. Documentation validation must render Jekyll and inspect the resulting HTML, links, assets, and scripts; source-Markdown checks alone are not sufficient.
- Verify documentation interaction changes on desktop and mobile, including keyboard operation, focus behavior, Escape handling, visible labels, and appropriate ARIA state. Mouse-only success is not sufficient.
- Build search indexes from rendered user-visible content. Do not index raw front matter, Liquid templates, source-only directives, or duplicate copies of the same page, and verify that search results route to the canonical page.
- Treat every generated documentation artifact as having one canonical source and one reproducible generator. Regenerate public chart images with `npm run docs:images` and LLM documentation with `npm run docs:llms`; do not hand-edit generated outputs. Validate chart-image freshness through the platform-independent manifest rather than cross-platform PNG byte equality.
- Keep `docs/llms.txt` as a concise routing index and regenerate `docs/llms-full.txt` from the canonical page order with `npm run docs:llms`.
- A documentation change is not complete until Markdown contracts, the Jekyll build, built-link and asset checks, search-index checks, and desktop/mobile browser smoke tests pass.
- Contain long code, tables, images, and generated references inside the content column at every supported viewport. Test every built documentation page at narrow mobile, standard mobile, and tablet widths instead of treating the homepage as representative.
- Keep off-canvas documentation navigation out of the accessibility tree and keyboard order while closed; when open, manage focus, background inertness, Escape recovery, active-page visibility, and touch-sized controls as one interaction contract.
- Keep heavy documentation search data and non-leading gallery media out of the initial page path. Load one rendered-content search index on demand, lazy-load non-leading images, and preserve explicit media dimensions to avoid layout shift.
- Keep unimplemented roadmap ideas out of current API documentation except where a concise limitation is required to explain an accepted value or error.
- Do not exhaustively document internal modules, helper functions, data structures, or implementation mechanics in public docs unless users must understand them to use the library correctly.
