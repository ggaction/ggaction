# Internal Documentation Instructions

Apply these instructions to architecture records, implementation plans, roadmaps, and action contracts under `agent_docs/` in addition to the repository root instructions.

## Scoped Internal Instructions

- Read `agent_docs/impl/AGENTS.md` for roadmaps, Phase goals, STEP documents, approval Gates, visual review evidence, and closeout.
- Read `agent_docs/contract/AGENTS.md` for action inventory, current/planned contracts, lifecycle, status, coverage evidence, and generated catalogs.
- For a change spanning implementation history and current contracts, apply both nested files and keep each fact in one canonical record.

## Architecture Records

- Write internal collaboration and implementation records in Korean unless a machine-readable format or public identifier requires English.
- Preserve `agent_docs/INITIAL_ARCHITECTURE.md` as the initial design record unless the user explicitly requests a revision.
- Treat `agent_docs/SECOND_ARCHITECTURE.md` as the current macro-architecture record. Update it for deliberate changes to ownership, state boundaries, materialization flow, renderer boundaries, or public package boundaries.
- Keep historical design rationale distinct from current observable behavior. Current action contracts, declarations, tests, and public documentation take precedence for exact supported behavior.
- Do not turn architecture records into a duplicate action catalog. Link to the owning current domain contract for exact parameters, values, defaults, and errors.
- Keep roadmap documents as collaboration history rather than executable product dependencies.
