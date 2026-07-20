# Roadmap 4 Phase 9 — Atomic Horizon encoding

## 목표

NCP-005를 `encodeHorizon({ x, y })`와 `editHorizon()`으로 구현한다. Raw source를 immutable derived
sign×band×segment rows로 변환하고, 기존 area path와 Canvas/PNG renderer를 재사용한다.

대표 계약은 [Gapminder Horizon](../chart/gapminder-horizon.md)이다.

## 진행 상태

- [x] P8-Exit 사용자 승인
- [x] x/y 중심 public candidate와 inference/default/error boundary 승인
- [x] independent Horizon oracle과 literal anchors
- [x] Gapminder primitive target과 P9-A review package
- [ ] transform/provenance와 `encodeHorizon`
- [ ] `editHorizon`, facet/consumer lifecycle과 P9-B
- [ ] types/contracts/docs/package closeout와 P9-Exit

## 핵심 계약

- `x`/`y`는 string shorthand 또는 기존 field-encoding object이며 compatible stored encoding에서 추론한다.
- x는 temporal/quantitative, y는 quantitative다. Internal `time`/`field` alias를 노출하지 않는다.
- `bands=3`, `baseline=0`, `extent="auto"`, `resolve="shared"`, `missing="break"`,
  `overflow="clip"`가 기본이다.
- Positive/negative palettes는 기존 Palette vocabulary를 재사용한다.
- Path interpolation은 target area의 기존 `curve`를 재사용하며 Horizon-specific curve option을 만들지 않는다.
- `editHorizon`은 partial revision이고 original source에서 새 immutable derived dataset을 만든다.
- Renderer는 Horizon을 모르며 materialized ordinary closed path만 읽는다.
- Default guide는 x축만 소유하고 folded y축과 automatic legend는 만들지 않는다.

## 실행 순서

1. [STEP1](./STEP1.md) — exact candidate contract와 independent oracle
2. [STEP2](./STEP2.md) — Gapminder primitive visual과 P9-A
3. [STEP3](./STEP3.md) — transform/provenance와 generated rows
4. [STEP4](./STEP4.md) — `encodeHorizon`과 area materialization
5. [STEP5](./STEP5.md) — `editHorizon`, facet와 consumer matrix, P9-B
6. [STEP6](./STEP6.md) — declarations/docs/package/cumulative closeout와 P9-Exit

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P9-A | ready-for-review | exact API/default/error/state, independent oracle, primitive source와 PNG | production grammar/action 구현 |
| P9-B | planned | public lifecycle, primitive/public parity, edit/facet consumer matrix | Phase closeout |
| P9-Exit | planned | Current inventory, architecture, docs/types/package와 cumulative verification | Phase 10 |

모든 Gate는 hard pause다.

## Non-goals

- `createHorizonPlot` facade
- Temporal aggregation/resampling/data smoothing
- Ordinal crossing interpolation와 Horizon-specific curve option
- Automatic Horizon legend, interactions 또는 animation
- Renderer 전용 Horizon primitive
