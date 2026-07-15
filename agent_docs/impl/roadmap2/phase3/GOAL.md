# Roadmap 2 — Phase 3 Goal

## 목표

Cars histogram과 jobs bar를 canonical oracle로 사용해 histogram bin/reassignment, normalized stack,
bar width와 offset padding, grouped reassignment, color layout vocabulary와 position field-type/orientation
compatibility를 구현한다.

완전한 chart와 variant 계약은 다음 문서에서 관리한다.

- [`../chart/cars-histogram-variants.md`](../chart/cars-histogram-variants.md)
- [`../chart/jobs-bar-variants.md`](../chart/jobs-bar-variants.md)

## 진행 상태

- [x] Phase 3 범위, variant와 approval gate 확정
- [x] 두 canonical baseline audit와 gallery pair
- [x] Histogram bin/reassignment primitive 승인과 public implementation
- [ ] Normalized stack/color layout primitive 승인과 public implementation
- [ ] Bar width/padding/reassignment primitive 승인과 public implementation
- [ ] Position compatibility primitive 승인과 public implementation
- [ ] Full parameter, failure, immutability와 rematerialization matrix
- [ ] Public docs, contract 승격과 Phase closeout

## 구현 범위

- `encodeHistogram`의 `binStep`, `binBoundaries`와 field reassignment
- `encodeY({ stack: "normalize" })`
- `encodeColor.layout: "fill" | "overlay" | "diverging"`
- `encodeBarWidth({ band? | pixels? })`
- `encodeXOffset({ paddingInner?, paddingOuter? })`와 reassignment
- `encodeColor({ layout: "group" })`가 소유하는 atomic color+xOffset reassignment
- Vertical/horizontal bar orientation inference
- Accepted mark × channel × fieldType compatibility matrix

Bin policy와 stack/layout은 semantic state다. Width mode와 resolved padding geometry는 graphical
materialization config이며 final rect에 concrete x/y/width/height로 저장된다. Renderer는 bin, stack,
orientation, field type 또는 padding을 해석하지 않는다.

## 실행 순서

```text
STEP1   histogram/bar canonical baseline audit와 Phase contract
STEP2   bin-step, boundaries, histogram-reassignment primitives
  ↓ Gate A: histogram visual confirmation
STEP3   bin controls와 encodeHistogram reassignment
STEP4   fill, overlay, diverging layout primitives
  ↓ Gate B: stack/layout visual confirmation
STEP5   normalized stack과 color layout vocabulary
STEP6   fixed width, offset padding, group-reassignment primitives
  ↓ Gate C: grouped-bar geometry visual confirmation
STEP7   bar width, offset padding과 xOffset reassignment
STEP8   temporal vertical bar와 horizontal bar primitives
  ↓ Gate D: position/orientation visual confirmation
STEP9   position field-type compatibility와 orientation
STEP10  integration, docs, contract promotion과 cleanup
```

Gate가 있는 STEP은 raw primitive, independent reference values, expanded target chain metadata와
`primitive.png`만 만든다. 사용자 승인 전에는 해당 user-facing implementation이나 `user-facing.png`를
만들지 않는다.

## Visual variant와 machine coverage

Phase 3 gallery는 baseline을 포함해 13개 variant를 목표로 한다.

- Histogram baseline 1개
- Histogram bin/reassignment 3개
- Normalized histogram 1개
- Bar baseline 1개
- Bar width/padding/reassignment 3개
- Overlay/diverging layout 2개
- Temporal vertical/horizontal position 2개

Mutually exclusive option, numeric boundary, full field-type matrix, area layout compatibility와 invalid
layout transition은 exhaustive machine coverage로 검증한다. Gallery에는 bin geometry, normalized or
signed partition, bar slot geometry와 orientation이 실제로 달라지는 representative class만 둔다.

## 범위 경계

- Continuous quantitative/temporal bar color는 Phase 10의 `continuous-color-bar-consumer`가 소유한다.
- Existing color layout 사이의 transition은 companion cleanup 계약이 구현되기 전까지 오류다.
- Missing categorical cells와 empty bins의 zero rect를 임의로 합성하지 않는다.
- Streamgraph `center` layout은 Proposed로 유지한다.
- Interaction, animation과 renderer-side semantic inference를 추가하지 않는다.

## 완료 조건

- 13개 primitive/public pair의 `semanticSpec`, `graphicSpec`, order와 Canvas calls가 정확히 같다.
- Bin/count/stack/layout reference는 production materializer와 독립된 fixture와 invariant를 가진다.
- Reassignment와 parameter change는 affected scales, marks, axes, grids와 legends를 deterministic plan으로
  rematerialize한다.
- Target inference, ambiguity, incompatible field/scale/layout, atomic failure와 earlier-program immutability가
  검증된다.
- Canvas resize와 action order가 달라도 equivalent final program은 같은 concrete output에 수렴한다.
- Types, examples, tutorials, API/reference/LLM docs와 action catalog가 구현 상태와 일치한다.
- Unit, contract, chart, docs, coverage, render, desktop/mobile gallery와 remote CI가 통과한다.

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
