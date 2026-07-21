# Public Documentation Instructions

Apply these instructions to `docs/`, `README.md`, public documentation generators, and user-facing documentation artifacts in addition to the repository root instructions.

## Scoped Documentation Instructions

- Read `docs/assets/AGENTS.md` when changing documentation layouts, includes, Sass, JavaScript, navigation, search, responsive behavior, accessibility, performance, or built-site browser tests.
- Public content and site behavior are one documentation product, but each rule has one canonical owner.

## Public Content

- Write `README.md` and pages under `docs/` in English for chart authors and extension authors.
- Update documentation source during development whenever a public action, signature, default, inference, limitation, supported value, or example changes.
- Keep implementation, declarations, public examples, current contracts, generated references, and documentation consistent in the same development phase.
- Treat `docs/` as user documentation. Prioritize installation, user tasks, observable behavior, examples, and only the core concepts required to use the library.
- Use progressive disclosure: getting started and tutorials, task recipes, chart APIs, advanced APIs, extension APIs, then canonical action reference.
- Give tutorials and recipes distinct roles. Tutorials explain a complete ordered workflow; recipes solve one narrow task with prerequisites, minimal code, and expected output.
- Every public sample is runnable in its stated environment with imports, data assumptions, and invocation context. Label incomplete excerpts as fragments and state their prerequisites.
- Reuse one canonical public program across its example, tutorial, acceptance test, and generated image when they demonstrate the same workflow.
- Give each public API one normative reference owner for exact signature and behavior. Overviews route and teach instead of duplicating that contract.
- Classify every exported and declared action as chart authoring, advanced chart authoring, or extension authoring and document it in the matching API section.
- When a public surface changes, update runtime exports, TypeScript declarations, current contracts, canonical reference sources, relevant API pages and examples, and generated LLM documentation together.
- Organize navigation and pages around user tasks and recognizable API families, not repository modules. Split long references by coherent family and retain a routing overview.
- Present every action with a distinguishable name, full signature, and classification. Long references need search or filtering rather than an oversized table of contents.
- Curate primary galleries as representative complete charts, not an implementation inventory. Keep experimental or visually ambiguous results out of the primary path.
- Keep chart image, title, description, destination, tasks, and representative actions in the canonical chart catalog consumed by all indexes and figures.
- Add a purposeful chart or diagram when it materially explains a task. Keep exhaustive references and support indexes on the explicit visual-exception list when visuals add no value.
- Keep unimplemented roadmap ideas out of current public documentation except for concise limitations required to explain behavior or errors.
- Do not document private helpers, modules, schemas, or implementation mechanics unless users need them to use the library correctly.

## Canonical Generation and Release

- Generate action references and family pages from their canonical sources; never hand-edit generated outputs.
- Give every generated artifact one source and reproducible generator. Regenerate chart images with `npm run docs:images`, LLM files with `npm run docs:llms`, and other references with their owning scripts.
- Keep `docs/llms.txt` as a concise routing index and `docs/llms-full.txt` as the generated canonical-order bundle.
- Keep navigation hierarchy, order, breadcrumbs, previous/next routing, and LLM order in the page manifest rather than parallel hand-authored trees.
- Keep scale vocabulary and mapping changes synchronized across types, compatibility and error tables, current contracts, references, and generated LLM content.
- Documentation deployment is release-scoped and must use the exact approved release commit or tag. Ordinary development pushes update and test sources but do not publish the site.
