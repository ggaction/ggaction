# Roadmap 3 Phase 8 — Facet Resolution, Derived Replay, and Guide Composition

## 진행 상태

- [x] STEP 1 — Public contract, stored state와 Gate targets 확정
- [ ] STEP 2 — Dataset dependency DAG와 partition-anchor oracle
- [ ] STEP 3 — Requested/resolved density provenance
- [ ] STEP 4 — Shared/independent scale-resolution grammar
- [ ] STEP 5 — Outer-axis와 shared-guide layout grammar
- [ ] STEP 6 — Shared/independent regression facet primitives
- [ ] STEP 7 — Gate I-A visual approval
- [ ] STEP 8 — Derived replay와 scale-resolution public implementation
- [ ] STEP 9 — Outer axes와 shared gradient legend primitive
- [ ] STEP 10 — Gate I-B visual approval
- [ ] STEP 11 — Guide composition과 transform-family integration
- [ ] STEP 12 — Coverage, contracts, docs와 Phase closeout

## 목표

Phase 8은 Phase 7의 chainable `facet`을 확장한다. Channel별 shared/independent scale policy를 지원하고,
visible layer가 regression, density, interval 또는 box derived dataset을 사용해도 각 cell의 원본 행에서
dependency DAG를 다시 실행한다. Scale resolution과 guide composition은 별도 policy로 유지한다.

대표 계약은 [Gapminder Cluster Regression Facet](../chart/gapminder-cluster-regression-facet.md)이다.

## Public option extension

```typescript
type FacetScaleResolution = "shared" | "independent";

type FacetScaleResolutions = Partial<{
  x: FacetScaleResolution;
  y: FacetScaleResolution;
  xOffset: FacetScaleResolution;
  color: FacetScaleResolution;
  size: FacetScaleResolution;
  shape: FacetScaleResolution;
  opacity: FacetScaleResolution;
  strokeDash: FacetScaleResolution;
}>;

type FacetGuideOptions = {
  axes?: "each" | "outer";
  legend?: false | "shared";
};
```

`facet`의 기존 옵션과 lifecycle은 유지한다. 새 direct action은 추가하지 않는다.

## Resolution rules

- Omitted channel policy is `"shared"`.
- Shared auto domains are the deterministic union of cell results.
- Independent auto domains are resolved from each cell's filtered/replayed values.
- Explicit semantic domains always win over the resolution policy.
- Discrete union order follows the base/full-source first-appearance order.
- A requested channel must exist on at least one affected layer. Unknown keys and inapplicable channels fail before
  any child is created.
- When one scale ID is used by channels with conflicting policies, `facet` rejects the complete call.
- Polar channels remain Phase 10 cross-feature scope.

## Derived replay rules

Facet resolves one unique dependency subgraph for the visible layers. It inserts the cell filter after applicable
row-preserving ancestors and before the first statistical transform, then replays descendants topologically.

Supported transform registry entries are `filter`, `regression`, `density`, `interval`, `boxSummary` and
`boxOutlier`. Multiple independent roots, cycles, missing ancestors, a missing facet field and unsupported transform
types fail during preflight. Dataset and layer IDs are deterministically namespaced from facet/cell/owner roles and
never from raw facet values.

Density keeps requested `bandwidth`/`extent` (`"auto"` included) separate from its resolved values. Cell replay uses
the requested intent and records a new resolved result for each immutable child revision.

## Guide rules

- Omitted axes remain `"each"` for backward compatibility.
- `"outer"` retains x axes on the bottommost occupied cell in each column and y axes on the leftmost occupied cell
  in each row. It does not stretch one axis across unrelated cell ranges.
- A shared legend is parent-owned and is promoted from the canonical guide recipe; facet-specific duplicate legend
  rendering is not introduced.
- Shared categorical, continuous gradient, discretized color, size and opacity legends are eligible when every
  represented child scale is concretely compatible. Resolution flags alone do not imply compatibility.
- Child semantics are never merged to create a parent guide. Parent `graphicSpec` contains the final concrete guide.

## Hard Gates

Gate I-A approves the regression replay and shared/independent scale variants. No post-Gate public replay or scale
option implementation proceeds before approval.

Gate I-B separately approves outer-axis selection, incomplete final-row behavior and parent-owned shared continuous
legend. No public guide-composition implementation proceeds before approval.

## Closeout requirement

Phase closeout must promote `facet-scale-resolution`, `derived-facet-replay` and `parent-guide-composition` from
Planned to Current. Exact TypeScript, current contracts, docs, examples, architecture, browser/PNG pairs and installed
package consumers must agree, and no Phase 8 capability may remain Planned.
