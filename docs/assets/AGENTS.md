# Documentation Site Instructions

Apply these instructions to documentation layouts, includes, Sass, JavaScript, navigation, search, assets, and built-site interaction tests.

- Treat the built Jekyll site as the documentation product. Render and inspect HTML, links, assets, scripts, and interaction; Markdown-only checks are insufficient.
- Keep navigation generated from the canonical page manifest. Avoid per-page tree exceptions, duplicate entries, and repository-oriented labels.
- Verify interaction changes on desktop and mobile with keyboard operation, focus management, Escape recovery, visible labels, touch targets, and correct ARIA state.
- Keep closed off-canvas navigation out of the accessibility tree and tab order. When open, manage focus, background inertness, active-page visibility, and close recovery as one contract.
- Preserve usable native navigation when JavaScript is unavailable; enhancements must not make content or navigation inaccessible.
- Build compact section-level search from canonical visible content and generated page metadata. Do not load or parse the full corpus, front matter, Liquid, or duplicate page copies at runtime.
- Route search results to canonical pages and sections. Keep user-facing aliases and result kinds in generated search metadata, not duplicated runtime lists.
- Generate page descriptions and social metadata from canonical page content and reuse them for HTML discovery and search summaries.
- Keep heavy search data and non-leading gallery media off the initial path. Load search on demand, lazy-load non-leading images, and preserve dimensions to avoid layout shift.
- Contain code, tables, images, references, and page navigation within the content column at narrow mobile, standard mobile, and tablet widths.
- Use accessible contrast and a non-color cue for inline links. Preserve visible focus indicators and readable text when muted, selected, disabled, or highlighted.
- Run Axe or equivalent automated accessibility checks on representative desktop and mobile pages, while retaining explicit keyboard and state assertions for interactive behavior.
- Run documentation environment preflight before full local verification and keep Node, Ruby, dependencies, and browser requirements aligned with CI.
- Validate generated image freshness through platform-independent manifests rather than cross-platform PNG byte equality.
- A site change is complete only after source contracts, Jekyll build, built links/assets, search, responsive containment, accessibility, and browser smoke tests pass.
