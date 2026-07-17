# Roadmap 3 Phase 6 — Child Programs and Concat Composition

## 진행 상태

- [x] STEP 1 — Phase 계약과 target dashboard 확정
- [x] STEP 2 — Pure concat layout grammar와 reference invariants
- [x] STEP 3 — Namespaced child graphic snapshot
- [x] STEP 4 — Nested Canvas primitive와 renderer
- [x] STEP 5 — Gate G primitive dashboard variants
- [x] STEP 6 — Gate G visual evidence와 사용자 승인
- [x] STEP 7 — Immutable child-program state와 concat materialization
- [x] STEP 8 — Public `hconcat`/`vconcat`과 trace hierarchy
- [ ] STEP 9 — Layout edit, child replacement와 public surface
- [ ] STEP 10 — Coverage, contracts, docs와 Phase closeout

## 목표

Phase 6는 여러 완성 `ChartProgram`을 하나의 immutable composition parent로 결합한다. Package-level
`hconcat`과 `vconcat`은 child semantics를 합치지 않고 named child programs를 보존하며, parent
`graphicSpec`에는 namespaced child Canvas snapshot과 concrete placement를 완전히 materialize한다.

대표 chart 계약은 [Mixed Program Dashboard](../chart/mixed-program-dashboard.md)다. Cars scatterplot,
Jobs grouped bar, Gapminder line chart와 Cars donut을 사용해 unequal-size layout, nested composition과
child replacement를 검증한다.

## Public API target

```typescript
hconcat(options: CompositionOptions): ChartProgram;
vconcat(options: CompositionOptions): ChartProgram;

interface CompositionOptions {
  id?: string;
  programs: Array<ChartProgram | { id?: string; program: ChartProgram }>;
  gap?: number;
  align?: "start" | "center" | "end";
  padding?: number | Partial<{
    top: number;
    right: number;
    bottom: number;
    left: number;
  }>;
}

editCompositionLayout(options: {
  gap?: number;
  align?: "start" | "center" | "end";
  padding?: CompositionOptions["padding"];
}): ChartProgram;

replaceCompositionChild(options: {
  target: string;
  program: ChartProgram;
}): ChartProgram;
```

- `hconcat`/`vconcat`은 최소 두 개의 renderable program을 요구한다.
- 기본값은 `gap: 16`, `align: "center"`, four-side zero padding이다.
- Parent Canvas width/height는 normalized child extents, gap과 padding에서 자동 추론한다.
- `hconcat`은 auto-height child를 가장 큰 cross-axis height로, `vconcat`은 auto-width child를 가장 큰
  cross-axis width로 맞춘다. Explicit child dimension은 보존한다.
- Cross-axis size가 바뀐 child는 snapshot 전에 Canvas, scale, guide와 mark를 함께 rematerialize한다.
- `align`은 explicit dimension 때문에 normalized 뒤에도 남은 cross-axis 여백에만 적용한다.
- 생략된 child ID는 deterministic opaque ID를 받는다. Stable replacement가 필요하면 explicit ID를 쓴다.
- Replacement는 target slot ID와 순서를 유지하고 새 child 크기에 맞춰 전체 layout을 다시 계산한다.

## State와 renderer boundary

```text
composition parent
├─ children: child ID → immutable ChartProgram
├─ compositionSpec: direction, ordered IDs, gap, align, padding
└─ graphicSpec: namespaced child Canvas snapshots + concrete placement
```

- Pure composition parent는 unit child의 `semanticSpec`, scales 또는 guides를 merge하지 않는다.
- Renderer는 parent `graphicSpec`만 읽으며 `children`과 `compositionSpec`을 해석하지 않는다.
- Physical Canvas resize와 clear는 root Canvas에서 한 번만 수행한다.
- Nested Canvas는 local translate, clip, background와 balanced save/restore scope를 가진다.
- Composition parent에 unit-only action을 호출하는 contract는 이번 Phase에서 지원하지 않는다.

## Gate G boundary

STEP 6 승인 전에는 `ChartProgram.children`, `compositionSpec`, public `hconcat`/`vconcat`, layout edit,
replacement action과 public types/docs를 구현하지 않는다. STEP 2~5에서는 pure reference calculation,
shared concrete graphic validation, extension primitive chain, nested Canvas renderer와 PNG만 작성한다.

Gate G는 다음 세 결과를 승인한다.

1. Unequal-size horizontal dashboard의 cross-axis alignment
2. `vconcat(hconcat(...), ...)` nested dashboard의 local clipping과 background
3. Stable detail slot을 grouped bar에서 Polar donut으로 교체한 뒤의 deterministic relayout

## 제외 범위

- Chainable `facet`과 facet header
- Shared/independent facet scales
- Parent-owned shared legend 또는 outer-only axes
- Parent에서 child unit action을 암묵적으로 broadcast하는 기능
- Child semantic state 병합
