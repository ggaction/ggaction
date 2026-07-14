# Roadmap 2 — Phase 1 Goal

## 목표

Cars scatterplot을 canonical equivalence oracle로 바로잡고, point chart에 필요한 scale editing,
appearance vocabulary, encoding reassignment, continuous color와 field-driven opacity를 구현한다.

완전한 variant 계약은 다음 문서에서 관리한다.

- [`../chart/cars-scatterplot-variants.md`](../chart/cars-scatterplot-variants.md)

## 진행 상태

- [x] Phase 1 범위와 variant 재설계
- [x] Contract 충돌과 Phase 10 경계 명시
- [x] STEP1~STEP8 실행 계획
- [x] Canonical baseline primitive 승인과 equivalence
- [x] Primitive batch A 승인
- [x] `editScale`, point shape, `editPointMark`, palette 구현
- [x] Reassignment primitive 승인과 구현
- [x] Continuous appearance primitive 승인과 구현
- [ ] Public docs, contract 승격과 Phase closeout

## 실행 순서

```text
STEP1  baseline audit, canonical primitive와 equivalence
  ↓ Gate 0: baseline visual confirmation
STEP2  primitive batch A — scale/shape/palette
  ↓ Gate A: four primitive variants visual confirmation
STEP3  editScale, shape grammar, editPointMark와 palette 구현
STEP4  primitive batch B — encoding reassignment
  ↓ Gate B: reassignment visual confirmation
STEP5  X/Y/color/size/shape reassignment 구현
STEP6  primitive batch C — continuous color와 field opacity
  ↓ Gate C: two primitive variants visual confirmation
STEP7  sequential color/gradient legend와 opacity/legend 구현
STEP8  integration, docs, contract promotion과 cleanup
```

사용자 승인 전에는 해당 gate의 user-facing action 구현이나 `user-facing.png`를 만들지 않는다.
승인받은 primitive가 바뀌면 primitive와 metadata를 먼저 수정하고 다시 확인한다.

## Visual variant와 coverage 원칙

Phase 1 gallery는 baseline을 포함해 8개 variant를 가진다. Gallery에는 시각적으로 의미 있는 대표값만
둔다. 다음처럼 가능한 값이 많은 vocabulary는 exhaustive machine coverage로 보완한다.

- 12개 point shape: geometry, area normalization, mark/encoding/legend parity
- 68개 palette name: family resolution, count/extent, cycling, reverse와 invalid name
- 8개 continuous interpolation token: concrete color endpoints와 representative midpoint
- `editScale`: domain/range auto reset, nice/zero/clamp/reverse, inference/ambiguity와 shared consumers
- Reassignment: current/new scale, guide title policy, Canvas resize와 atomic failure

## 완료 조건

- Baseline을 포함한 모든 primitive/public pair가 concrete state와 Canvas calls에서 동일하다.
- User-facing action은 필요한 field 외에는 target, scale, coordinate와 guide를 가능한 한 infer한다.
- Semantic 변경은 등록된 materialization plan을 통해 mark와 guide consumer를 명시적으로 갱신한다.
- Sequential color의 내부 grammar는 재사용 가능하지만 general public scale expansion은 Phase 10 경계를
  침범하지 않는다.
- Unit, contract, chart, docs, coverage, render와 desktop/mobile gallery 검증이 모두 통과한다.
- 관련 Planned 항목만 실제 evidence와 함께 Implemented로 승격한다.

## STEP 문서

- [`STEP1.md`](STEP1.md)
- [`STEP2.md`](STEP2.md)
- [`STEP3.md`](STEP3.md)
- [`STEP4.md`](STEP4.md)
- [`STEP5.md`](STEP5.md)
- [`STEP6.md`](STEP6.md)
- [`STEP7.md`](STEP7.md)
- [`STEP8.md`](STEP8.md)
