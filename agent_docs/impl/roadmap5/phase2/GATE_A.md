# Gate R5-P2-A — Semantic Category Ordering

## Gate state

`ready-for-review` — 2026-08-02 remote checkpoint

## Review target

Approved `orderCategories` and `removeCategoryOrder` contract의 complete vertical slice다.

## Exact public calls

```javascript
const ordered = program.orderCategories({
  target: "bars",
  channel: "x",
  by: { field: "value", aggregate: "sum" },
  direction: "descending"
});

const automatic = ordered.removeCategoryOrder({
  target: "bars",
  channel: "x"
});
```

Explicit values, category, count와 `sum | mean | min | max` summary intent를 semantic encoding에 저장한다.
Omitted explicit values와 computed ties는 source first appearance로 안정적으로 완성하며, removal은 automatic
first-appearance domain을 복원한다. Scale, 모든 connected mark, guide와 selection item order는 하나의
domain action에서 같이 rematerialize된다.

## Review evidence

- Explicit complete/partial order, category/count/summary modes, ascending/descending, stable ties와 caller ownership을
  independent literal fixtures로 검증했다.
- Cartesian categorical `x | y`, vertical/horizontal bars, points, axis labels, selection items, reassignment/reset을
  검증했다.
- Shared scale는 compatible dataset/field consumers만 허용하고, facet replay에서 shared order와 cell-local independent
  order를 각각 검증했다.
- Missing/ambiguous target, incompatible channel/consumer, unknown/duplicate values, missing assignment와 explicit-domain
  conflict를 atomic errors로 검증했다.
- Runtime registration, strict declarations, Current contract, generated action/reference/search/LLM docs와 installed
  package consumer를 같은 vertical slice로 동기화했다.

## Visual review evidence

승인용 차트는 동일한 orange bar dataset을 세 패널로 보여준다.

1. `Automatic`: source first appearance인 Support → Product → Sales → Operations
2. `Descending total`: `orderCategories`로 Product → Sales → Operations → Support
3. `Reset`: `removeCategoryOrder`로 automatic order 복원

- Executable public source: `examples/ordered-category-bar/program.js`
- Independent primitive source: `test/gates/ordered-category-bar/primitive.program.js`
- Manifest and displayed calls: `test/gates/ordered-category-bar/manifest.js`
- Review PNG: `.artifacts/test/png/review/ordered-category-bar/automatic-ordered-reset/user-facing.png`
- Physical size: 1872×664 at pixel ratio 2; logical size 936×332.
- Public PNG SHA-256:
  `d320b6c74503b4da89c34b2a79669a9a89dedd3aef1d2a0c5881a3894664da8b`.
- Public and primitive programs are render-equivalent; literal domain, total and displayed-call tests protect the visual.

## Verification

| Check | Result |
| --- | --- |
| Focused grammar/action/contract | 15 pass |
| Stable and active visual slice | 6 pass, including two render executions |
| Full repository suite | 1,966 pass |
| Documentation | 45 source tests; 113 built pages; built-site browser pass |
| Browser | Capability pages, packed browser entries and every public chart pass |
| Installed package | Runtime, strict TypeScript, export and browser-bundle checks pass |
| Package artifact | 403 entries; 374,382 packed bytes; 1,766,439 unpacked bytes |

Documentation build used repository-pinned `mise ruby@3.2.6`. Built-site and full browser checks were rerun outside the
filesystem sandbox only to permit the local `127.0.0.1` test server.

## Remote checkpoint

- Review commit: `2ef1b103` (`feat: add semantic category ordering`)
- Remote branch: `origin/codex/roadmap5-temporal-ordering-directional-marks`

## Approval effect

승인하면 Phase 3 moving mean/sum window implementation을 시작할 수 있다. PR creation, publish, deployment와
release 권한은 포함하지 않는다.

## Work blocked before approval

- `movingMean`/`movingSum` runtime implementation
- Phase 4 이후 capability implementation
