# Roadmap 2 — Phase 6 Goal

## 목표

Cars error-bar chart를 새 canonical vertical slice로 추가하고 semantic rule mark, field/datum endpoint,
constant rule appearance, interval summary와 composite `createErrorBar`를 구현한다. Vertical computed interval,
horizontal interval, explicit interval와 cap/style variants를 primitive-first workflow로 검증한다.

Complete chart contract:

- [`../chart/cars-error-bar.md`](../chart/cars-error-bar.md)

## 진행 상태

- [x] Canonical chart, shortest public chain과 inference/default contract 설계
- [x] Rule/error-bar action hierarchy와 stored-result contract 설계
- [x] STEP1–STEP8 및 three visual approval Gates 설계
- [x] Existing primitive/action/contract baseline audit
- [ ] Rule geometry primitive 승인과 public implementation
- [ ] Canonical vertical error-bar primitive 승인과 public implementation
- [ ] Horizontal/explicit/style primitive 승인과 public implementation
- [ ] Full numeric, parameter, error, immutability와 rematerialization coverage
- [ ] Public example/docs, contract promotion과 Phase closeout

## 구현 범위

- Semantic `rule` mark backed by concrete `line` collections
- `createRuleMark({ id?, data? })`, with unique default ID `rule`
- Rule field/datum position through `encodeX`, `encodeY`, `encodeX2`, `encodeY2`
- Full-span vertical/horizontal, bounded vertical/horizontal and diagonal geometry
- `encodeStroke`, `encodeStrokeWidth`; existing dash/opacity assignment reuse
- Immutable `createIntervalData` for mean/median and stderr/stdev/CI/IQR
- `createErrorBar({ id?, ... })`, with unique default representative ID `errorBar`
- Inferred orientation, source, grouping, coordinate, scale, statistics, caps and appearance
- Fixed-pixel cap materialization without fabricated data endpoints

## 실행 순서

```text
STEP1  contract/baseline audit and independent reference policy
STEP2  rule geometry primitive batch
  ↓ Gate A: rule geometry visual confirmation
STEP3  rule mark, endpoints and appearance assignments
STEP4  canonical computed vertical error-bar primitive
  ↓ Gate B: baseline visual confirmation
STEP5  interval summary and vertical createErrorBar
STEP6  horizontal, explicit and styled-cap primitive batch
  ↓ Gate C: variant visual confirmation
STEP7  horizontal/explicit/cap-style public implementation
STEP8  integration, docs, contract promotion and closeout
```

Gate STEP은 raw primitive, independent target values, target public chain metadata와 `primitive.png`만 만든다.
사용자 승인 전에는 해당 user-facing action이나 `user-facing.png`를 구현하지 않는다.

## Action hierarchy 경계

`createErrorBar`는 interval derivation, rule creation, endpoint assignment와 appearance assignment를 실제 wrapped
child action으로 호출한다. Composite 전용 semantic registry나 chart compiler를 만들지 않는다. Main/cap은
ordinary rule layer이고 derived interval은 ordinary immutable dataset이다.

Cap의 anchor는 semantic position으로 저장하지만 perpendicular `capSize`는 graphical materialization config다.
Canvas/scale 변경은 responsible action이 explicit dependency plan을 실행해 final concrete endpoints를 다시 쓴다.

## Visual variants와 machine coverage

Phase 6 gallery는 5개 variants를 목표로 한다.

- Rule geometry 1개
- Canonical vertical computed error bar 1개
- Horizontal computed error bar 1개
- Explicit interval without caps 1개
- Custom cap/style 1개

Field/datum exclusivity, endpoint compatibility matrix, statistic vocabulary, numeric boundaries, group ordering,
ID/source/target ambiguity와 invalid option combinations는 exhaustive unit/contract coverage로 보완한다.

## 완료 조건

- Five approved primitive/public pairs have identical semantic/graphic/order/Canvas-call results.
- Interval numeric fixtures remain independent from production calculation.
- Omitted ID/data/group/statistic/style values resolve deterministically and are persisted where semantic.
- Endpoint, scale, Canvas and derived-data changes rematerialize every main/cap consumer in deterministic order.
- Earlier programs and caller-owned source/explicit interval rows remain unchanged.
- Types, example, tutorial, API/reference/LLM docs and action catalog match current behavior.
- Unit, contract, chart, docs, coverage, render, desktop/mobile gallery and remote CI pass.
- A closeout contract proves every Phase 6 action/capability is current or intentionally removed from Planned.

## STEP 문서

- [`STEP1.md`](STEP1.md)
- [`STEP2.md`](STEP2.md)
- [`STEP3.md`](STEP3.md)
- [`STEP4.md`](STEP4.md)
- [`STEP5.md`](STEP5.md)
- [`STEP6.md`](STEP6.md)
- [`STEP7.md`](STEP7.md)
- [`STEP8.md`](STEP8.md)
