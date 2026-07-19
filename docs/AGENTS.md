# Public Documentation Instructions

Apply these instructions to `docs/`, `README.md`, public documentation generators, and user-facing documentation artifacts in addition to the repository root instructions.

## Documentation and Implementation Consistency

- Update public documentation source during development whenever a public action, behavior, default, limitation, example,
  or supported value changes. Keep `docs/`, `README.md`, generated public references, public examples, declarations, and
  executable documentation checks consistent with the current implementation.
- Keep documentation deployment release-scoped. Release preparation verifies the already-current documentation together
  with package metadata and the exact release artifact; it must not be the first point at which implemented APIs are documented.
- Deploy the public documentation site only from the exact approved release commit or tag. Ordinary `main` pushes may build
  and test documentation but must not change the published site.
- Write public-facing files such as `README.md` and pages under `docs/` in English.
- Treat `docs/` as user documentation: prioritize installation, user-facing APIs, observable behavior, examples, and the minimum core concepts users need.
- Let one canonical reference page own the normative signature and behavioral contract for each public API. Tutorials, recipes, and overview pages should teach or route to that owner rather than duplicate the full contract.
- Organize public documentation through progressive disclosure: getting started and tutorials first, then task-oriented recipes, chart API, advanced chart API, extension API, and finally the canonical action reference. Do not require ordinary chart authors to understand primitive actions or internal architecture before they can produce a chart.
- Give tutorials and recipes distinct roles. Tutorials teach a complete, ordered workflow with explanation; recipes solve one narrowly scoped task with prerequisites, the minimal code, and the expected result. Do not duplicate an entire tutorial as a recipe or scatter one workflow across unrelated pages.
- Every public code sample must be directly runnable in its stated environment. Include the required imports, data-loading assumptions, and invocation context; when a deliberately incomplete excerpt is clearer, label it as a fragment and state its prerequisites explicitly.
- When a tutorial demonstrates an edit action, continue from its canonical runnable program and choose values that produce the observable change being taught. Do not present a no-op option listing as an edit example.
- Use one canonical public program for each documented chart and reuse it across the example, tutorial, acceptance test, and generated image whenever those artifacts demonstrate the same workflow. Do not maintain independently copied action chains that can drift.
- Keep one canonical action reference with exact signatures for discovery by users and language models. Every action exported from a public entry point and declared in TypeScript must be classified as chart authoring, advanced chart authoring, or extension authoring and documented in the matching public API section.
- Whenever a public action is added, removed, renamed, reclassified, or changes signature, update its JavaScript export,
  TypeScript declaration, `docs/reference/actions.md`, relevant API page, examples, and generated LLM documentation in the
  same development phase.
- Whenever the public scale vocabulary or mapping contract changes, update the implementation-facing type declaration, canonical compatibility/precedence/error tables, current contract inventory, and generated LLM documentation together. These surfaces must describe the same accepted values, consumer limits, fallback behavior, and transition errors.
- Keep navigation generated from a consistent information architecture. Avoid arbitrary per-page menu exceptions, duplicated catalog entries, or navigation labels that expose repository structure instead of user tasks.
- Organize documentation around user tasks and recognizable public API families rather than implementation-module boundaries. When a reference page becomes difficult to scan, split it by coherent feature family while retaining an overview page that explains the whole family and routes readers onward.
- Present every documented action with a clearly distinguishable action name, complete signature, and API classification. On long action references, provide search or filtering instead of relying on an oversized table of contents.
- Curate galleries as an intentional set of representative, complete charts rather than an inventory of every implemented example. Keep experimental, visually ambiguous, or incomplete-looking results away from the primary discovery path.
- Maintain chart-example presentation metadata, including the image, title, description, destination, and representative actions, in one canonical catalog. Gallery cards, tutorial indexes, recipe indexes, and API-page figures must consume that catalog instead of duplicating metadata.
- Give each task-oriented public page a purposeful chart image or explanatory diagram when a visual materially helps the reader understand the outcome or structure. Do not add decorative images solely to satisfy a coverage count.
- Keep pages where visuals would add no explanatory value, such as exhaustive references, support matrices, or troubleshooting indexes, on an explicit and reviewed visual-coverage exception list.
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
