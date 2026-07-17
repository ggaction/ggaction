# Internal Documentation Instructions

Apply these instructions to architecture records, implementation plans, roadmaps, and action contracts under `agent_docs/` in addition to the repository root instructions.

## Architecture and Implementation Records

- Write each new chart implementation contract in Korean at `agent_docs/impl/roadmapN/chart/<chart-name>.md`. Keep the complete chart description, final user-facing API, important action hierarchy, and stored-result contract readable in that one chart document.
- A phase may contain any number of chart development cycles. Use `agent_docs/impl/roadmapN/phaseM/GOAL.md` and `STEPn.md` flexibly to manage that phase's chart set, shared prerequisites, execution order, integration work, and cleanup; do not impose a fixed mapping between chart cycles and STEP documents.
- Every Phase STEP document must place a `진행 상태` checklist near the beginning and keep it updated. Phase documents should link the chart contracts they coordinate, but must not split one chart's complete specification across STEP files.
- At Phase closeout, require a contract test to prove that every action and capability assigned to the completed Phase is current or intentionally removed and that none remains in the Planned inventory. Do not mark the Phase complete based only on prose checklists.
- Resolve every completed Phase's remaining Planned entries explicitly: promote implemented work to Current, move intentionally deferred long-range ideas to Maybe Future, or remove rejected and obsolete entries. A completed capability must never remain Planned, and each closeout classification must be enforced by the executable inventory audit.
- For roadmap visual work, author the graphical primitive variant first, render its browser/PNG result, and pause for user confirmation before implementing the corresponding user-facing action flow. Revise and reconfirm the primitive when feedback changes the intended appearance.
- Treat every declared visual Gate as a hard pause. Before requesting approval, show the exact target user-facing call chain or executable source together with the rendered image and explain the specific semantic result being approved; do not implement the post-Gate public flow or advance to a later Gate until the user explicitly approves it.
- Store Roadmap 2 visual pairs under `.artifacts/test/png/roadmap2/<chart>/<variant>/` and Roadmap 3 pairs under `.artifacts/test/png/roadmap3/<capability>/<chart>/<variant>/`. Generate a hierarchical gallery for each roadmap and keep the entire artifact tree gitignored.
- Give every roadmap visual variant one generated `variant.json` containing its display title and exact target user-facing action call chain. Roadmap 3 metadata must additionally record its Phase and capability. Show the chain beside the primitive/public pair in the gallery, and reject metadata drift between render paths.
- Keep each roadmap variant's programs, metadata, dimensions, and visual expectations in one manifest. Render primitive and user-facing results from that manifest, require plot-region ink, and compare their decoded same-run pixel hashes exactly.
- Verify that the action calls displayed by roadmap variant metadata match the user-facing program's top-level trace; gallery code must not drift into an unexecutable description.
- Preserve `agent_docs/INITIAL_ARCHITECTURE.md` as an initial design record unless the user explicitly asks to revise it; it does not need to mirror every later implementation decision.
- Keep historical design references distinct from documentation of the current behavior.

## Action Contract Catalog

- Keep `agent_docs/contract/ACTION_INDEX.json` as the canonical machine-readable inventory for every direct user-facing action, public primitive, planned direct action, planned capability, and internal wrapped-action inventory.
- Keep allowed lifecycle, layer, status, readiness, planned-kind, and coverage vocabularies in `ACTION_INDEX.json.contractSchema`; contract tests must consume that schema rather than repeat closed lists in test code.
- Keep current action contracts under `agent_docs/contract/current/`, planned contracts under `agent_docs/contract/planned/`, and internal inventories under `agent_docs/contract/internal/`. Every implemented direct action must have exactly one owning current contract.
- Treat `agent_docs/contract/ACTION_CATALOG.md` as a generated compact index. Regenerate it with `npm run contracts:catalog`; do not maintain duplicate status tables by hand.
- Keep the lifecycle audit exhaustive: every declared direct action must appear exactly once in the manifest, and every stable resource without an edit path must remain visibly marked Planned or Proposed.
- Keep an action's parameter status, types, accepted values, defaults and inference, interactions, semantic and graphical effects, rematerialization impact, errors, formal values, coverage ledger, and executable evidence together in its owning domain contract. State shared family rules once per domain.
- Distinguish `Implemented`, `Planned`, and `Proposed` contracts. Only behavior present in the implementation may be marked `Implemented`; only behavior explicitly agreed with the user may be marked `Planned`; unresolved candidates remain `Proposed` and must not appear as current public API.
- Mark a coverage case complete only when a matching executable test exists. Keep missing and partial cases visible rather than estimating a coverage percentage.
- Update the manifest, owning contract, generated catalog, and contract tests in the same conceptual commit whenever a supported action, parameter, accepted value, default, inference rule, precedence rule, effect, lifecycle, coverage, or public/private classification changes.
- Enforce mechanically verifiable inventory, classification, contract-link, status, evidence-path, and generation-freshness rules through contract tests; do not test Korean prose placement.
