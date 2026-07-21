# Action Contract Instructions

Apply these instructions to action inventory, current and planned contracts, coverage evidence, and generated catalogs.

- Keep `ACTION_INDEX.json` as the canonical machine-readable inventory for direct user actions, public primitives, planned direct actions, planned capabilities, and internal wrapped actions.
- Keep allowed lifecycle, layer, status, readiness, planned-kind, and coverage vocabularies in `ACTION_INDEX.json.contractSchema`; tests consume that schema rather than copy closed lists.
- Store implemented contracts in `current/`, accepted future contracts in `planned/`, and wrapped-action inventories in `internal/`. Every direct implemented action has exactly one current owner.
- Treat `ACTION_CATALOG.md` as a compact generated index. Regenerate it with `npm run contracts:catalog` and never maintain duplicate status tables by hand.
- Keep lifecycle exhaustive: every declared direct action appears exactly once, and every stable resource without an edit path has an explicit accepted gap or lifecycle explanation.
- Keep an action's parameters, accepted values, defaults, inference, interactions, semantic and graphical effects, rematerialization, errors, formal values, coverage ledger, and evidence together in its owning domain contract. State shared family rules once.
- Mark only implemented behavior as `Implemented`, only explicitly user-approved future behavior as `Planned`, and unresolved candidates as `Proposed` outside the current public API.
- Before a proposal Gate, keep unresolved candidates in a phase-local machine-readable inventory and prove they have not entered the Planned inventory. Promote only the approved subset.
- Mark coverage complete only when matching executable evidence exists. Keep missing and partial cases explicit rather than estimating percentages.
- Update the index, owning contract, generated catalog, declarations, docs, and contract tests together whenever supported behavior, lifecycle, status, inference, effects, or public/private classification changes.
- Enforce inventory, classification, links, statuses, evidence paths, and generation freshness mechanically. Do not test Korean prose placement.
