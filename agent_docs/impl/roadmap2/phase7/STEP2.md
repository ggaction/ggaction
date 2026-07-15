# Roadmap 2 — Phase 7 Step 2: Gapminder Vertical Primitive

## 목표

Public error-band actions 없이 raw semantic/graphic primitives로 Gapminder grouped vertical target를 만들고 Gate A에서
형태, layering, opacity와 guides를 승인받는다.

## 진행 상태

- [x] Independent year × cluster mean/CI expected rows
- [x] Raw derived dataset and area semantic bindings
- [x] Closed grouped y/y2 path geometry
- [x] Cluster fills through concrete palette values
- [x] Axes, horizontal grid, legend and title composition
- [x] Variant manifest and exact future call chain
- [x] `gapminder-vertical/primitive.png` and renderer/browser checks
- [ ] Gate A user confirmation
- [x] STEP status, conceptual commit and push

## Gate A

Primitive trace에는 future `createErrorBand`가 없어야 한다. Six cluster bands의 order, temporal spacing,
CI containment, overlap readability와 no-boundary default를 시각적으로 확인한다. 승인 전에는 corresponding
public program을 구현하지 않는다.

### Gate A candidate

- Artifact: `.artifacts/test/png/roadmap2/gapminder-error-band/gapminder-vertical/primitive.png`
- Independent rows: 66 year × cluster intervals
- First-appearance series order: `0 → 3 → 4 → 1 → 5 → 2`
- Scale domains: x `1955-01-01 → 2005-01-01`, y `[30, 90]`
- Sample sizes: every year uses stable cluster counts `4, 20, 9, 19, 6, 4`
- Concrete result: six closed linear paths, opacity `0.2`, no boundary paths
- Drawing order: horizontal grid, bands, axes, legend, title
- Trace exclusions: no `createErrorBand`, `createIntervalData`, or `encodeYRange`
- Local evidence: 3 Gate tests, 277 render tests and 56-variant gallery verification passed


## 완료 조건

Independent numeric rows와 final concrete paths가 일치하고 canonical visual target가 승인된다.
