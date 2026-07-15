# Roadmap 2 — Phase 7 Goal

## 목표

Gapminder grouped error-band chart를 새 canonical vertical slice로 추가하고 statistical/explicit interval,
vertical/horizontal ranged area, optional boundary line과 `createErrorBand` hierarchy를 구현한다. Cars를
horizontal variant로 사용해 데이터 형태와 orientation이 달라도 같은 계약이 작동함을 검증한다. Generic
error band가 안정된 뒤 existing regression band composition을 이 action으로 위임한다.

Complete chart contract:

- [`../chart/gapminder-error-band.md`](../chart/gapminder-error-band.md)

## 진행 상태

- [x] Canonical Gapminder chart와 Cars horizontal variant 설계
- [x] Public parameter, inference/default와 error contract 설계
- [x] Interval/area/range/boundary/regression 재사용 경계 설계
- [x] Existing source, dataset과 Planned inventory baseline audit
- [x] STEP1–STEP9와 three visual approval Gates 설계
- [x] Gapminder vertical primitive 승인과 vertical ranged-area implementation
- [x] Cars horizontal primitive 승인과 horizontal ranged-area implementation
- [ ] Curved boundary primitive 승인과 full option/rematerialization implementation
- [ ] Regression band delegation compatibility
- [ ] Public docs, contract promotion, gallery와 Phase closeout

## 구현 범위

- `createErrorBand({ id?, target?, data?, x?, y?, groupBy?, ... })`
- Existing immutable `createIntervalData` reuse for statistical mode
- Existing explicit center/lower/upper rows for explicit mode
- `encodeYRange` full reassignment and area `encodeY2` support
- New `encodeXRange` and area `encodeX2` support
- Closed area path materialization in both orientations
- Area curve and optional lower/upper line boundaries
- Existing `encodeColor` reuse for field-driven fill and legend
- `createRegressionBand → createErrorBand(explicit)` delegation

## 실행 순서

```text
STEP1  contract, datasets and implementation baseline audit
STEP2  Gapminder grouped vertical error-band primitive
  ↓ Gate A: canonical vertical visual confirmation
STEP3  vertical ranged area and statistical/explicit createErrorBand
STEP4  Cars horizontal error-band primitive
  ↓ Gate B: horizontal visual confirmation
STEP5  horizontal range action and horizontal createErrorBand
STEP6  curve and boundary primitive batch
  ↓ Gate C: boundary/curve visual confirmation
STEP7  area curve, boundary components and rematerialization
STEP8  regression-band delegation and compatibility
STEP9  integration, docs, contract promotion and closeout
```

Gate STEP은 raw primitives, independent target values, executable target call-chain metadata와
`primitive.png`까지만 만든다. 사용자 승인 전에는 대응 public action flow와 `user-facing.png`를 만들지 않는다.

## Reuse boundary

- Interval derivation은 `createIntervalData`, independent/range binding은 positional encoding actions가 소유한다.
- Error band는 ordinary area와 optional ordinary line layers를 wrapped actions로 조합한다.
- Group은 path segmentation, `encodeColor`는 visible fill/legend를 소유한다.
- Renderer는 final path/style만 읽으며 `semanticSpec.composites`는 만들지 않는다.
- Regression wrapper는 provenance/inference를 유지하고 generic error band에는 explicit interval만 전달한다.

## Visual and mechanical coverage

- Gapminder: numeric temporal x, cluster grouping/color, vertical life-expectancy band
- Cars: ISO-like temporal string y, ungrouped Acceleration x interval, horizontal band
- Gapminder styled variant: curve inheritance/override, custom boundary styles and drawing order
- Mechanical: statistical/explicit convergence, source inference, ambiguity, empty/sparse groups, interval ordering,
  all curve/dash options, reassignment, scale/Canvas rematerialization, trace and immutability

## 완료 조건

- Three approved primitive/public pairs match semantic state, graphics, order, Canvas calls and decoded pixels.
- Cars and Gapminder independent numeric oracles do not import production interval calculations.
- Omitted IDs/resources resolve deterministically and every inferred resource is persisted.
- Range/scale/Canvas/data/style edits rematerialize all area and boundary consumers in stable order.
- Regression output, drawing order and public trace remain compatible after delegation.
- Types, examples, user docs, contracts, generated gallery and package exports match implemented behavior.
- Phase 7 closeout contract proves every assigned action/capability is Current or intentionally removed from Planned.
- Unit, contract, chart, render, coverage, desktop/mobile docs and remote CI pass.

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
