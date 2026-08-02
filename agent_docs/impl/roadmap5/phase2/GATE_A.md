# Gate R5-P2-A — Semantic Category Ordering

## Gate state

`approved` — 2026-08-02 사용자 승인

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
- Independent primitive source: `test/charts/ordered-category-bar/primitive.program.js`
- Manifest and displayed calls: `test/charts/ordered-category-bar/manifest.js`
- Primitive PNG:
  `.artifacts/test/png/charts/category-order/ordered-category-bar/automatic-ordered-reset/primitive.png`
- Public PNG:
  `.artifacts/test/png/charts/category-order/ordered-category-bar/automatic-ordered-reset/user-facing.png`
- Physical size: 1872×664 at pixel ratio 2; logical size 936×332.
- Public PNG SHA-256:
  `d320b6c74503b4da89c34b2a79669a9a89dedd3aef1d2a0c5881a3894664da8b`.
- Public and primitive programs are render-equivalent; literal domain, total and displayed-call tests protect the visual.

## Verification

| Check | Result |
| --- | --- |
| Focused grammar/action/contract | 15 pass |
| Approved stable visual slice | 3 normal tests and 1 primitive/public render pair pass |
| Full repository suite | 1,964 pass, including approved stable visual slice |
| Full render suite | 126 pass; 125-variant charts gallery and empty review gallery verified |
| Documentation | 45 source tests; 113 built pages; built-site browser pass |
| Browser | Capability pages, packed browser entries and every public chart pass |
| Installed package | Runtime, strict TypeScript, export and browser-bundle checks pass |
| Package artifact | 403 entries; 374,382 packed bytes; 1,766,439 unpacked bytes |

Documentation build used repository-pinned `mise ruby@3.2.6`. Built-site and full browser checks were rerun outside the
filesystem sandbox only to permit the local `127.0.0.1` test server.

## Remote checkpoint

- Review commit: `2ef1b103` (`feat: add semantic category ordering`)
- Gate preparation commit: `45ff3d24` (`docs: prepare roadmap 5 phase 2 gate`)
- Approval/graduation commit: pending verified approval package commit
- Remote branch: `origin/codex/roadmap5-temporal-ordering-directional-marks`

## Approval effect

Phase 3 moving mean/sum window implementation이 열렸다. PR creation, publish, deployment와 release 권한은
포함하지 않는다.

## Work remaining blocked

- Phase 4 이후 capability implementation은 R5-P3-A 승인 전까지 차단한다.
