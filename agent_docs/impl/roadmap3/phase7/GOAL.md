# Roadmap 3 Phase 7 — Chainable Direct-source Facet

## 진행 상태

- [x] STEP 1 — Phase 계약과 Gate H target 확정
- [x] STEP 2 — Facet source/value resolution과 독립 oracle
- [x] STEP 3 — Facet grid, header와 parent title reference layout
- [x] STEP 4 — Cars Origin scatterplot facet primitive
- [x] STEP 5 — Cars Origin histogram facet primitive
- [x] STEP 6 — Gate H visual evidence와 사용자 승인
- [x] STEP 7 — Immutable facet child derivation
- [x] STEP 8 — Public `facet`과 composition materialization
- [x] STEP 9 — `editFacetHeaders`, title promotion과 layout edits
- [ ] STEP 10 — Coverage, contracts, docs와 Phase closeout

## 목표

Phase 7은 현재 unit `ChartProgram`을 field 값별 immutable child view로 반복하는 chainable
`.facet({ field })`를 구현한다. Facet은 `semanticSpec`의 layer grammar가 아니라 child program을 보존하는
composition parent이며, renderer가 해석할 complete nested Canvas snapshot을 parent `graphicSpec`에 가진다.

대표 계약은 [Cars Origin Scatterplot Facet](../chart/cars-origin-scatterplot-facet.md)과
[Cars Origin Histogram Facet](../chart/cars-origin-histogram-facet.md)이다.

## Phase 7 public target

```typescript
facet(options: {
  id?: string;
  field: string;
  data?: string;
  columns?: number;
  gap?: number;
  align?: "start" | "center" | "end";
  guides?: { legend?: false | "shared" };
  padding?: number | Partial<{
    top: number;
    right: number;
    bottom: number;
    left: number;
  }>;
}): ChartProgram;

editFacetHeaders(options: {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  offset?: number;
}): ChartProgram;
```

Defaults:

- `id: "facet"`
- omitted `data`: affected visible layers의 unique direct source
- values: source first-appearance order
- omitted `columns`: resolved value count, 즉 한 줄
- `gap: 16`, `align: "center"`, four-side zero padding
- shared scale domains and axes in every cell
- explicit `guides.legend: "shared"` creates one categorical legend on the parent; the base `createGuides` call
  uses `legend: false` because a shared legend is not a child-owned guide
- deterministic opaque child IDs

## First-slice boundary

이번 Phase는 direct-source point, ordinary bar와 histogram만 지원한다. Multiple source, missing field, empty
facet domain, derived transform dependency와 ambiguous source는 child를 하나도 만들기 전에 명확히 거부한다.
Regression, density, interval/error band와 box dependency replay, independent scales와 shared/outer-only guides는
Phase 8 범위다.

## Gate H

STEP 6은 hard pause다. 승인 전에는 `ChartProgram.prototype.facet`, facet stored state, public types 또는
`editFacetHeaders`를 구현하지 않는다. Gate H에서는 다음을 exact target call chain 및 PNG와 함께 승인한다.

1. Default one-row Cars Origin scatterplot facet
2. `columns: 2` Cars Origin histogram facet wrapping
3. Shared domains, per-cell axes, one parent-owned Cylinders legend, title와 headers

`guides.legend` exact syntax와 parent ownership은 2026-07-18 Gate H feedback에서 승인되었다.

Gate H primitive package는 `test/gates/direct-source-facet/`에 있으며 승인 뒤 추가된 public pair가 같은
concrete Canvas call sequence를 만드는 것도 확인한다.
