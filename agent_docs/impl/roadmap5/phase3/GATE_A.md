# Gate R5-P3-A — Moving Window Operations

## Gate state

`approved` — 2026-08-02 explicit user approval

## Review target

Approved `movingMean` and `movingSum` extension을 포함한 `createWindowData` complete vertical slice다.

## Public contract

```javascript
monthly.createWindowData({
  id: "trailingMean",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean", // or "movingSum"
    field: "passengers",
    as: "movingMean",
    frame: { preceding: 2, following: 0 }
  }]
});
```

- `preceding`은 required non-negative integer이고 `following`은 optional이며 default `0`이다.
- Sorted partition의 current row를 항상 포함하고 양쪽 edge에서는 available rows로 truncate한다.
- Input과 output은 finite number여야 한다.
- Earlier operation output을 later moving operation이 읽을 수 있고 final rows는 source order를 보존한다.
- Normalized provenance는 explicit `following`을 저장하며 source program과 caller input은 immutable이다.

## Implementation evidence

- Grammar and derivation: `src/grammar/window.js`
- Public action and materialization: `src/actions/data/window.js`
- Direct schema and replay: `src/grammar/transforms.js`
- Strict declarations: `types/program.d.ts`
- Current contract: `agent_docs/contract/current/CORE.md#createwindowdata`
- Public guide: `docs/api/data/window.md`
- Canonical example: `examples/airline-passenger-moving-windows/program.js`
- Stable chart slice: `test/charts/airline-passenger-moving-windows/`

## Behavioral results

- Trailing, centered와 zero-width frames, partition보다 큰 frame과 truncated edges를 검증했다.
- Partition, ascending/descending sort, stable ties, negative/zero/decimal input과 sequential dependencies를 검증했다.
- Missing/non-finite field, non-finite output, malformed frame, output collision과 unknown option을 atomic하게 거부한다.
- Direct `createDerivedData`, registered `materializeWindowData`, facet-local replay와 installed package가 같은 normalized
  transform을 사용한다.
- Phase 1 `createTimeUnitData` output을 세 moving option이 소비하며 primitive와 public program의 semantic/graphic
  state가 일치한다.

## Visual and renderer evidence

- Canvas logical size: 1192×372; PNG physical size: 2384×744 at pixel ratio 2.
- PNG primitive/public SHA-256:
  `faba89412e35ade4ab229482c3e21aaa1df7c9cbd1297fe54ab6da1757f4392f`
- SVG primitive/public SHA-256:
  `08ded1014e7547bd647009c3ecc7c8e9763d64cf6c700b3fe530bc72cf50985d`
- PDF primitive/public SHA-256:
  `a87dce2371d29495210e0f212fee1dd789a778f8a3abe4c27fef3c744f919606`
- Stable PNG:
  `.artifacts/test/png/charts/data/airline-passenger-moving-windows/trailing-centered-and-sum/user-facing.png`
- Four-renderer evidence:
  `.artifacts/test/renderers/charts/data/airline-passenger-moving-windows/`

## Verification

| Check | Result |
| --- | --- |
| Focused grammar/action/schema/registry | 22 pass |
| Stable chart reference/primitive/public/discovery | 13 pass |
| Focused PNG + Canvas/SVG/PNG/PDF equivalence | 2 pass |
| Public chart contract renderer checks | 15 pass |
| Documentation checks | 45 pass |
| Browser public examples | 50 pass |
| Full repository suite | 1,974 pass |
| Native coverage | 94.7% lines, 90.06% branches, 98.44% functions; 68 critical floors |
| Installed package runtime/types/renderers | pass |

Package verification produced `ggaction-0.0.7.tgz` SHA-256
`3075f970d00c10814d34eef045af3e925ff907682f51a3afe156728a4e0da7ef`. Minimal browser gzip measurements are
215,034 bytes (`ggaction`), 121,066 bytes (`ggaction/basic`)과 5,760 bytes (`ggaction/svg`); tracked limits are
216,000, 122,000과 25,000 bytes다.

## Compatibility and documentation impact

- Existing `createWindowData` method와 immutable create-only lifecycle은 그대로이고 operation union만 additive 확장했다.
- Module ownership, state boundary, materialization flow와 renderer boundary는 바뀌지 않았다.
- Current/planned contracts, strict types, generated action reference, search/LLM docs와 browser registry를 동기화했다.
- Approved Gate slice를 `data` capability stable chart로 승격하고 active review artifact path를 제거했다.

## Remote checkpoints

- Visual approval record: `68dbde72`
- Moving grammar: `0e22c7f6`
- Public flow, replay, declarations and package: `e4b3e4bc`
- Stable chart and renderer equivalence: `4ddfdb89`
- Current contract, docs and browser example: `6ae0f61e`
- Exact approved dataset IDs and final renderer parity: `19b2a2a4`
- Remote branch: `origin/codex/roadmap5-temporal-ordering-directional-marks`

## Approval effect

승인하면 Phase 4 Tick primitive visual Gate와 Tick/Angle implementation을 시작할 수 있다. PR creation,
publish, deployment와 release 권한은 포함하지 않는다.

## Work blocked before approval

- Tick primitive and renderer visual evidence
- `createTickMark`, Tick edits/removal and point/tick `encodeAngle`
- Phase 5 이후 capability implementation
