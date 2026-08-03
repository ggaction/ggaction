# Gate R5-Exit — Roadmap 5 Integration and Closeout

## Gate state

`ready-for-review`

## Review target

Roadmap 5의 여섯 capability를 Current contract, declarations, public docs, stable examples, renderer parity와
installed-package evidence로 닫는다. 이 Gate는 구현 결과와 closeout 상태만 승인하며 PR, merge, release,
publish 또는 documentation deployment 권한을 포함하지 않는다.

## Capability result

1. `createTimeUnitData` UTC calendar derivation
2. semantic category ordering and reset
3. `createWindowData` moving mean/sum
4. Tick mark create/edit/remove lifecycle
5. point/tick `encodeAngle`
6. non-negative area `stack: "center"` and `layout: "center"`

`ACTION_INDEX.json`의 Roadmap 5 Planned capability 잔재는 모두 제거됐고 구현된 surface는 Current contract와
executable evidence가 소유한다.

## Center-layout evidence

- Public program: `examples/centered-area-stream/program.js`
- Stable capability slice: `test/charts/centered-area-stream/`
- Artifact: `.artifacts/test/png/charts/center-stacked-area/centered-area-stream/jobs-center-stack/primitive.png`
- Image: `1380 × 840`
- SHA-256: `ef370669089a899a8d2096e219c955bfb8d0999cf000d41c3d526dbfe80ddeb2`
- Implementation checkpoint: `49951629`

The direct `encodeY({ stack: "center" })` path and the wrapped
`encodeColor({ layout: "center" })` path resolve equivalent concrete area geometry. Selection/highlight,
filter/facet/Canvas/scale/guide replay and Canvas/SVG/PNG/PDF renderer boundaries are covered.

## Verification evidence

- Normal suite: 2,015/2,015
- Renderer suite: 133/133
- Stable gallery: 128 variants; active review gallery: 0 variants
- Package: 410 entries, 379,274 packed bytes, 1,794,457 unpacked bytes
- Strict declarations, JavaScript/TypeScript installed consumers, generated public docs and action catalog synchronized

## Remote checkpoint

- Phase 5 implementation: `49951629`
- Phase 6 integration and closeout: `909a5271`
- Remote branch: `origin/codex/roadmap5-temporal-ordering-directional-marks`

Both checkpoints are committed and pushed. User R5-Exit approval remains pending.

## Work blocked before approval

- Roadmap 5 completed declaration and active pointer removal
- PR creation or merge
- release, package publish or documentation deployment
