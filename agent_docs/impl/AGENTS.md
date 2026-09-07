# Roadmap and Implementation Record Instructions

Apply these instructions to roadmaps, Phase records, STEP documents, chart contracts, Gate evidence, and release plans.

## Planning Records

- Write each chart implementation contract in Korean at `agent_docs/impl/roadmapN/chart/<chart-name>.md`, with its chart description, final user-facing API, important action hierarchy, and stored-result contract together.
- A Phase may contain any number of chart cycles. Use `phaseM/GOAL.md` and `STEPn.md` flexibly for shared prerequisites, execution order, integration, and cleanup rather than forcing one chart per STEP.
- Put a `진행 상태` checklist near the beginning of every STEP and keep it current. Link coordinated chart contracts without splitting one chart's complete contract across STEP files.

## Approval Gates

- Before implementation, every roadmap Phase identifies any approval Gates required for unresolved material public, persisted-schema, architectural, release, or visual decisions. A Phase whose exact decisions are already covered by recorded approval links that evidence instead of creating a redundant approval request.
- Use `planned | ready-for-review | approved | changes-requested` for Gate state. Never record approval without explicit user approval.
- A declared Gate is a hard boundary only for work that depends on its decision. Add an intermediate Gate when a finding introduces a new material decision outside existing approval, not for routine findings or fixes within the approved contract. While approval is pending, continue independent authorized work and finish the review evidence; never cross the pending boundary or remove a declared approval requirement unilaterally.
- Make each review package self-contained: exact executable source or public call chain, semantic or architectural result, focused and cumulative tests, compatibility and documentation impact, and rendered output when appearance is in scope.
- Before requesting Gate approval, commit and push the complete verified review package. The Gate record identifies the code and evidence revision under review; a later metadata-only recording commit does not invalidate unchanged evidence. Publishing, deployment, and PR creation remain separately authorized operations under the repository root instructions.
- After approval, update the Gate record before beginning newly unblocked work. When an earlier explicit approval already covers the exact Gate, record and reuse it rather than asking again.

## Visual Review Evidence

- A new visual target requires explicit confirmation of its rendered graphical primitive before its public action flow is implemented. Reuse an earlier visual approval only when the target contract and visual expectations are unchanged, link the original evidence, and verify the current result. A changed target requires renewed confirmation; general implementation approval does not approve an unseen visual target.
- For every visual Gate, show the exact target public call chain or executable source with the rendered image and explain the semantic result being approved.
- Keep active review evidence under `.artifacts/test/png/review/<chart>/<variant>/`; graduate approved pairs to `.artifacts/test/png/charts/<capability>/<chart>/<variant>/` and remove the review subtree. The artifact tree remains gitignored.
- Give every variant one generated `variant.json` with stable capability/chart/variant identity, display title, and exact target public call chain. Never persist roadmap, Phase, or completed Gate identity in approved metadata.
- Keep programs, metadata, dimensions, and visual expectations in one manifest. Require plot-region ink and exact same-run decoded primitive/public pixel equality.
- Verify that displayed action calls match the public program's top-level trace.

## Closeout and Release

- At Phase closeout, prove every assigned action and capability is Current or resolved by an explicit user-approved scope change, with none left Planned in the completed scope.
- Resolve remaining entries explicitly: promote implementation to Current, move user-approved long-range deferrals to Maybe Future, or remove user-rejected and obsolete entries. Internal duplicates may be removed without a scope change only when every approved behavior remains covered.
- Keep deferred integration obligations visible. Do not declare a user-selected requirement or the overall roadmap complete while a required behavior or integration cell remains unresolved.
- Synchronize declarations, current contracts, public support docs, architecture records, generated catalogs, and Phase/roadmap status in the same closeout change; enforce mechanical parts with tests.
- Treat a new mark family as complete only after resolving its consumer matrix across encodings, guides, selection/highlighting, rematerialization, renderers, types, package boundaries, documentation, and executable evidence. Mark inapplicable cells explicitly.
- Remove stable executable dependencies on completed roadmap directories. Migrate durable assertions to capability-oriented owners before archival or reorganization.
- Dispatch protected release workflows from the exact annotated tag ref. Gate evidence must identify the canonical runtime artifact reused by publish; a locally repacked equivalent is not byte-identical registry evidence.
