# Roadmap and Implementation Record Instructions

Apply these instructions to roadmaps, Phase records, STEP documents, chart contracts, Gate evidence, and release plans.

## Planning Records

- Write each chart implementation contract in Korean at `agent_docs/impl/roadmapN/chart/<chart-name>.md`, with its chart description, final user-facing API, important action hierarchy, and stored-result contract together.
- A Phase may contain any number of chart cycles. Use `phaseM/GOAL.md` and `STEPn.md` flexibly for shared prerequisites, execution order, integration, and cleanup rather than forcing one chart per STEP.
- Put a `진행 상태` checklist near the beginning of every STEP and keep it current. Link coordinated chart contracts without splitting one chart's complete contract across STEP files.

## Approval Gates

- Every roadmap Phase declares named approval Gates before implementation begins, including exact scope, required evidence, and post-Gate work that remains blocked.
- Use `planned | ready-for-review | approved | changes-requested` for Gate state. Never record approval without explicit user approval.
- Treat Gates as hard execution boundaries. Add intermediate Gates for independent public decisions, findings, or visual targets and stop at the first unapproved Gate.
- Make each review package self-contained: exact executable source or public call chain, semantic or architectural result, focused and cumulative tests, compatibility and documentation impact, and rendered output when appearance is in scope.
- Before requesting Gate approval, commit and push the complete verified scope and record that commit in the Gate document. Publishing, deployment, and PR creation remain separately authorized operations.
- After approval, update the Gate record before beginning unblocked work.

## Visual Review Evidence

- Author and render the graphical primitive variant first, then pause for visual confirmation before implementing its public action flow. Revise and reconfirm when feedback changes the target.
- For every visual Gate, show the exact target public call chain or executable source with the rendered image and explain the semantic result being approved.
- Keep active review evidence under `.artifacts/test/png/review/<chart>/<variant>/`; graduate approved pairs to `.artifacts/test/png/charts/<capability>/<chart>/<variant>/` and remove the review subtree. The artifact tree remains gitignored.
- Give every variant one generated `variant.json` with stable capability/chart/variant identity, display title, and exact target public call chain. Never persist roadmap, Phase, or completed Gate identity in approved metadata.
- Keep programs, metadata, dimensions, and visual expectations in one manifest. Require plot-region ink and exact same-run decoded primitive/public pixel equality.
- Verify that displayed action calls match the public program's top-level trace.

## Closeout and Release

- At Phase closeout, prove every assigned action and capability is Current or intentionally removed and none remains Planned in the completed scope.
- Resolve remaining entries explicitly: promote implementation to Current, move approved long-range deferrals to Maybe Future, or remove rejected and obsolete entries.
- Synchronize declarations, current contracts, public support docs, architecture records, generated catalogs, and Phase/roadmap status in the same closeout change; enforce mechanical parts with tests.
- Treat a new mark family as complete only after resolving its consumer matrix across encodings, guides, selection/highlighting, rematerialization, renderers, types, package boundaries, documentation, and executable evidence. Mark inapplicable cells explicitly.
- Remove stable executable dependencies on completed roadmap directories. Migrate durable assertions to capability-oriented owners before archival or reorganization.
- Dispatch protected release workflows from the exact annotated tag ref. Gate evidence must identify the canonical runtime artifact reused by publish; a locally repacked equivalent is not byte-identical registry evidence.
