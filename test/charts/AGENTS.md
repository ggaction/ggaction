# Chart Test Instructions

Apply these instructions to chart slices, examples, primitive baselines, manifests, and PNG regression tests.

- Keep each public user program at `examples/<chart>/program.js`; chart tests and public documentation must consume that same program rather than copy its action chain.
- Keep a chart's primitive baseline, public contract tests, deterministic references, and PNG regression in one stable capability-oriented slice under `test/charts/`. Name the explicit primitive chain `primitive.program.js`.
- One capability slice may own several public chart variants, but every chart keeps its own public program and primitive/public equivalence assertion.
- Keep shared inputs, expected geometry, displayed call chains, dimensions, artifact paths, and variant metadata in one manifest or fixture owner.
- Preserve one primitive baseline and one evolving high-level program while replacing primitive calls with public actions. Do not create a new representative program for every implementation step.
- Require primitive and public programs for the same chart contract to converge on exact concrete graphic properties, structure, explicit drawing order, renderer calls, and same-run decoded pixels. Independently allocated logical identities and private child IDs may be normalized for this comparison; test their uniqueness and revision correspondence separately without normalization.
- Keep primitive demonstration programs as explicit method chains without batching helpers or test-only syntactic sugar.
- Keep user programs realistic and assertion-free. Mocks, probes, and test-only inspection belong in importing tests.
- Test the shortest valid public call for every high-level action after its prerequisites are present.
- Complete each public chart vertical slice with one shared API flow across its standalone program, acceptance test, browser example, PNG regression, and tutorial.
- Co-locate PNG tests as `png.render.js` and write generated output only below the gitignored `.artifacts/test/png/` tree.
- Store approved artifacts by stable capability, chart, and variant. Reserve `.artifacts/test/png/review/` for active review and remove or graduate it after approval.
- Use compact ink-density and logical-bounds signatures only for representative approved charts with a small raster tolerance. Keep primitive/public pixels exact for one chart contract.
- Establish deterministic numeric fixtures for statistical transforms before relying on graphical or PNG evidence.
- Cover complete vocabularies with pure fixtures, boundaries, and invariants; use render pairs for representative consumers rather than multiplying screenshots for every accepted value.
- For selection, filtering, and highlighting, assert exact item identities and grain separately from concrete emphasis, legend synchronization, drawing order, and representative pixels.
- Ensure the example description, selector, selected items, and visible emphasis tell one unambiguous story; replace technically valid but misleading examples.
