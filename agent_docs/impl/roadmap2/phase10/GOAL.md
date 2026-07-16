# Roadmap 2 — Phase 10 Goal

## 목표

Gapminder transformed-scale variants를 통해 complete scale vocabulary, mapping policies, continuous-color bar와
atomic scale type editing을 구현한다.

Complete chart contract:

- [`../chart/gapminder-transformed-scale-variants.md`](../chart/gapminder-transformed-scale-variants.md)

## 진행 상태

- [x] Scale vocabulary, time/discrete ownership and editScale type policy designed
- [x] Four visual Gates and target public chains designed
- [x] Current implementation and contract baseline audit
- [x] Shared transformed-scale pure grammar
- [x] Gate A transformed scatterplot approval and public implementation
- [x] Gate B temporal/discrete position approval and public implementation
- [ ] Gate C discretized color approval and public implementation
- [ ] Gate D continuous-color bar approval and public implementation
- [ ] Mapping-policy, rematerialization and error matrix
- [ ] Types, docs, contract promotion and Phase closeout

## 실행 순서

```text
STEP1   contract, implementation and migration audit
STEP2   common scale grammar and compatibility matrix
STEP3   Gate A transformed scatterplot primitive
  ↓ Gate A
STEP4   transformed position API and editScale type editing
STEP5   Gate B temporal/discrete primitive
  ↓ Gate B
STEP6   time/band/point public integration
STEP7   Gate C discretized-color primitive
  ↓ Gate C
STEP8   quantize/quantile/threshold and interval legends
STEP9   Gate D continuous-color bar primitive
  ↓ Gate D
STEP10  continuous bar consumer and mapping policies
STEP11  rematerialization, error and coverage integration
STEP12  types, docs, contracts and closeout
```

Every Gate is a hard pause. Primitive source, exact target public chain and rendered image are shown before approval;
the corresponding public implementation begins only after explicit confirmation.

## 완료 조건

- All Phase 10 Planned capabilities become Current or are intentionally removed by executable closeout audit.
- Primitive/public pairs match semantic state, graphic state, trace, Canvas calls and decoded pixels.
- Pure numeric fixtures cover mapping/ticks independently from PNG evidence.
- Full local/remote test, coverage, render, built-doc, browser and Pages checks pass.

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
- [`STEP10.md`](STEP10.md)
- [`STEP11.md`](STEP11.md)
- [`STEP12.md`](STEP12.md)
