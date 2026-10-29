# Native API and qualification policy

## Current API scope

- Pyramid is the native stage-chart name. `createPyramidPlot` and `editPyramidPlot` preserve explicit stage/value roles, input order, gaps, orientation, and the width/area contracts in [PYRAMID.md](PYRAMID.md). Stage display labels are not row identity. No alternate facade is required.
- Marginal, Bullet, and Combo are compositions of current domain actions. They have no dedicated built-in constructor. The canonical public chains are `examples/marginal/program.js`, `examples/bullet/program.js`, and `examples/linked-overlay/program.js`. A host example function is not a library export. Independent measures use separate panels; overlays in one Cartesian frame share the existing Y mapping under [AXES.md](AXES.md#single-y-per-cartesian-frame).
- Dedicated KPI and Gauge APIs are excluded from the built-in chart surface. Set-intersection visualization is deferred and is not a current action, stored resource kind, default, or qualification requirement. Extension authors may compose the public primitives; this does not add a built-in supported family.
- These exclusions cannot be bypassed by inserting an unknown stored resource kind. Stored-resource admission remains closed and rejects before changing the immutable receiver.

## Native independence

Public authoring, events, defaults, data preparation, rendering, persistence, and release qualification do not require an external chart engine, a translation adapter, upstream chart changes, or reference-corpus parity. The native concrete graphic contract remains the renderer input.

Reusable geographic mathematics and optional native raster/font and protocol providers are implementation dependencies, not another chart engine or an alternative chart-authoring schema. Their current dependency and public-entry boundaries are checked by package/source contracts. Host-supplied loaders remain explicit preparation inputs; they are not implicit adapters.

`test/native-capabilities.json` is the single machine-readable native requirement, acceptance-group, consumer, and qualification-check owner. `scripts/native-capability-completion.js` validates its evidence. Historical external reference rows are reference-only: they cannot become a required native target or a passed result. Excluded or deferred families are not counted as success. Assigning an executable owner does not mark an acceptance group passed, and focused checks do not substitute for final candidate-wide qualification.

## Executable owners

- `test/contracts/native-api-policy.test.js`: actual Full/Basic action and stored-resource admission, public import closure and required dependency roles.
- `test/contracts/composition-recipes.test.js`, `test/unit/composition-recipes.test.js`: public-domain action chains, source/scale/role/selection semantics and immutable failures.
- `test/unit/pyramid-plot.test.js`, `test/charts/pyramid/primitive.test.js`, `test/charts/pyramid/public.test.js`: exact stage geometry and lifecycle.
- `test/contracts/native-capability-completion.test.js`: unchanged native scope, reference-only rejection, real candidate hashes, executed owner receipts, and incomplete-qualification rejection.
