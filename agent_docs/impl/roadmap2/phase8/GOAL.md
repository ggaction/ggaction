# Roadmap 2 — Phase 8 Goal

## 목표

Cars vertical Tukey box plot을 새 canonical vertical slice로 추가하고 immutable box summary/outlier data,
ranged bar body, explicit error-bar whisker/caps, median rule, outlier points와 `createBoxPlot` hierarchy를
구현한다. Horizontal minmax와 option/style variants로 orientation, statistics, optional components와
rematerialization을 검증한다.

Complete chart contract:

- [`../chart/cars-box-plot.md`](../chart/cars-box-plot.md)

## 진행 상태

- [x] Canonical Cars chart와 shortest public chain 설계
- [x] `groupBy`를 initial contract에서 제외하고 category-only partition 확정
- [x] Public parameters, inference/default, hierarchy와 stored-result contract 설계
- [x] STEP1–STEP9와 three visual approval Gates 설계
- [x] Existing source/contract/data baseline audit
- [x] Canonical vertical Tukey primitive 승인
- [ ] Box data/ranged-bar foundation
- [ ] Vertical `createBoxPlot` public implementation
- [ ] Horizontal minmax primitive 승인과 public implementation
- [ ] Style/factor/outlier primitive 승인과 full option implementation
- [ ] Public docs, contract promotion, gallery와 Phase closeout

## 구현 범위

- Internal wrapped box-summary/outlier derived-data actions and pure deterministic grammar
- Linear `(n - 1) × p` quartiles, Tukey observed whiskers, configurable factor and minmax
- Bar-compatible `encodeYRange`/`encodeXRange` and ranged rectangle materialization
- Band-width-aware median rule rematerialization
- `createBoxPlot({ id?, target?, data?, x?, y?, ... })` with deterministic owner ID `boxPlot`
- Ordinary error-bar, bar, rule and point child resources with no composite registry
- Vertical/horizontal inference, encoded-layer source inference and documented scale defaults
- Box/median/outlier style, width and outlier enable/disable options

Additional subgroup `groupBy`, automatic offset/color/legend and `editBoxPlot` are outside Phase 8.

## 실행 순서

```text
STEP1  contract, implementation and independent-oracle baseline audit
STEP2  canonical vertical Tukey primitive
  ↓ Gate A: vertical box/outlier visual confirmation
STEP3  box summary/outlier data and ranged-bar/median foundations
STEP4  vertical createBoxPlot and canonical exact equivalence
STEP5  horizontal minmax primitive
  ↓ Gate B: orientation/minmax visual confirmation
STEP6  horizontal range and minmax public implementation
STEP7  factor/style and outliers-off primitive batch
  ↓ Gate C: option/style visual confirmation
STEP8  full options, optional components and robustness
STEP9  integration, docs, contract promotion and closeout
```

Gate STEP은 raw primitive, independent target values, exact future call-chain metadata와 `primitive.png`만 만든다.
사용자 승인 전에는 대응 public flow와 `user-facing.png`를 만들지 않는다.

## Reuse boundary

- Quartile/whisker/outlier 계산은 pure grammar, provenance/derived rows는 internal wrapped data actions가 소유한다.
- Whisker/caps는 explicit `createErrorBar`, body는 ordinary ranged bar, median은 ordinary rule, outlier는 ordinary
  point actions를 실제 wrapped children으로 재사용한다.
- Ranged-bar geometry와 median span만 shared materialization capability로 추가한다.
- Renderer는 final rect/line/point만 읽고 box-plot semantics를 추론하지 않는다.

## Visual and mechanical coverage

- Gate A: Cars Origin × MPG vertical Tukey, 10 visible outliers
- Gate B: Cars Origin × Horsepower horizontal minmax, no outlier component
- Gate C: factor 1.0 + custom width/style/diamond outliers, and `outliers: false`
- Mechanical: even/odd/duplicate/singleton/missing data, first-appearance order, exact fences/whiskers, ID/source/
  orientation ambiguity, reassignment, scale/Canvas rematerialization, trace and immutability

## 완료 조건

- Three visual Gates produce four approved primitive/public pairs with exact semantic/graphic/order/Canvas/pixel equality.
- Independent Cars and synthetic numeric oracles do not import production box calculations.
- Inferred IDs/resources and resolved statistical defaults are persisted deterministically.
- Range, width, scale and Canvas changes rematerialize body, median, whisker/caps and outliers in stable order.
- Disabled/minmax outliers leave no stale dataset, layer or graphic.
- Types, example, tutorial/API/reference/LLM docs and action catalog match current behavior.
- A Phase 8 closeout contract proves every assigned action/capability is Current or intentionally removed from Planned.
- Unit, contract, chart, docs, coverage, PNG, desktop/mobile browser and remote CI/Pages pass.

## STEP 문서

- [`STEP1.md`](STEP1.md)
- [`STEP2.md`](STEP2.md)
- [`STEP3.md`](STEP3.md)
- [`STEP4.md`](STEP4.md)
- [`STEP5.md`](STEP5.md)
- [`STEP6.md`](STEP6.md)
- [`STEP7.md`](STEP7.md)
- [`STEP8.md`](STEP8.md)
- [`STEP9.md`](STEP9.md)
