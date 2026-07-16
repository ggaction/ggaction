# Test and Example Instructions

Apply these instructions to tests, fixtures, examples, generated chart artifacts, and test infrastructure in addition to the repository root instructions.

## Tests and Example Programs

- Encode mechanically verifiable architectural rules in focused contract tests rather than relying on prose documentation alone. At minimum, keep selector behavior, public package boundaries, shared concrete-graphic validation, and materialization-plan ordering and deduplication executable.
- Write source code, test descriptions, fixtures, and example-program code in English. Implementation step documents remain in Korean.
- Keep each public user-authored program under `examples/<chart>/program.js`; chart tests must import that same program instead of copying its action chain.
- Keep each chart's primitive baseline, public contract tests, deterministic reference values, and PNG regression together under `test/charts/<chart>/`. Name the explicit primitive chain `primitive.program.js`.
- For a new chart whose primitive has not yet received visual approval, stage its executable primitive, reference values, manifest, normal tests, and render test under `test/gates/<chart>/`. The `gates` suite must run in normal and render discovery. After approval and user-facing implementation, move the complete slice into `test/charts/<chart>/` and remove the gate directory; never place skipped or placeholder public tests in `test/charts/`.
- Give shared chart inputs, expected geometry, displayed call chains, artifact locations, and variant metadata one canonical fixture or manifest owner. Tests and generators must consume that owner instead of maintaining synchronized copies.
- Organize unit tests by reusable capability under `test/unit/`, not by implementation phase or a mechanically mirrored source tree. Keep cross-cutting architecture invariants under `test/contracts/`.
- When progressively replacing a primitive contract with higher-level actions, preserve the primitive baseline and maintain one evolving high-level action program per chart development cycle. Do not create separate representative program files for every implementation unit unless the user explicitly requests snapshots.
- Require a representative high-level program and its primitive baseline to converge on the same concrete `graphicSpec`, explicit rendering order, and renderer calls when they describe the same chart. Visual similarity alone is not sufficient regression evidence.
- Co-locate each chart's PNG export test as `test/charts/<chart>/png.render.js`; write generated images to the gitignored `.artifacts/test/png/` directory.
- Use `.test.js` for the normal fast suite and `.render.js` for expensive renderer regressions. Keep both suites explicitly selected by package scripts so helper and program modules are never discovered as tests accidentally.
- When a representative program is intended to demonstrate primitive usage, write one explicit method chain and do not hide primitive calls behind batching helpers or other syntactic sugar.
- Keep the user program focused on realistic library usage. Assertions, mocks, and test-only inspection belong in the importing test file rather than in the user program.
- For every high-level user-facing action, test its shortest valid call after the required prerequisites are present so the default API does not become progressively more verbose.
- Complete each chart development cycle with one public vertical slice whose browser example, standalone user program, acceptance test, PNG regression, and tutorial use the same chart-authoring API flow.
- Verify browser Canvas and PNG output separately. Browser checks must cover logical Canvas dimensions and console/page errors; PNG checks must cover `pixelRatio` and physical output dimensions.
- Establish deterministic numeric fixtures for statistical transforms before relying on graphical or PNG verification. Test quantities such as coefficients, confidence bounds, sample positions, and density values independently from their materialization.
- Match option coverage to the layer it affects: use independent numeric oracles for statistical options, resource presence/absence and drawing-order assertions for structural options, concrete-property plus rematerialization assertions for geometry and style options, and primitive/public pixel pairs only for representative values that produce meaningfully distinct visuals.
- Pair fixed numeric fixtures with deterministic mathematical invariants for continuous mappings, bins, densities, intervals, and ordering; examples include monotonicity, mass/count conservation, non-negativity, interval containment, and stable group order.
- Do not rely on snapshots or example images alone. Pair them with focused assertions for invariants, selectors, package boundaries, shared validation, materialization plans, and critical-file coverage.
- Keep the global source coverage threshold and explicit critical-file floors. Do not let high-coverage modules hide regressions in immutable state, statistical grammar, concrete schemas, renderer dispatch, or the PNG adapter.
