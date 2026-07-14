# Roadmap 2 — Phase 2 Step 12: Integration and Closeout

## 목표

Phase 2의 모든 variant, vocabulary, cross-feature dependency와 public documentation을 통합 검증하고 실제
구현 evidence가 있는 Planned contract만 Current로 승격한다.

## 진행 상태

- [ ] 13개 gallery variant metadata, image와 pair state
- [ ] 모든 primitive/public graphic/order/Canvas-call equivalence
- [ ] Curve/dash/group/aggregate call-order invariance
- [ ] Canvas resize와 shared scale/series/guide rematerialization
- [ ] Target inference, explicit target, no candidate와 ambiguity
- [ ] Field↔constant dash와 legend cleanup/preservation
- [ ] Aggregate empty/singleton/missing/boundary matrix
- [ ] Trace hierarchy와 deterministic plan order
- [ ] Immutability와 atomic failure audit
- [ ] Public TypeScript declarations와 package exports
- [ ] Examples/tutorials/API/recipes/reference/LLM docs freshness
- [ ] ACTION_INDEX evidence와 Planned → Implemented promotion
- [ ] Intermediate files와 generated artifact cleanup
- [ ] Unit, contract, chart, docs, coverage, render와 remote CI
- [ ] Desktop/mobile gallery browser verification
- [ ] Roadmap/GOAL/STEP final status, conceptual commit와 push

## 통합 검증

- Scale/Canvas 변경 순서가 달라도 final commands와 graphics가 같아야 한다.
- Curve edit는 field/group/scale를, dash edit는 unrelated color/group를 임의로 바꾸지 않는다.
- Shared aggregate scale은 compatible final grain만 공유한다.
- Inferred guide title은 aggregate/field 재할당을 따르고 explicit title/style은 유지된다.
- Renderer는 command, concrete dash와 final text만 읽는다.

## Contract 승격

- `editLineMark`
- `encodeGroup`와 `encodeStrokeDash` reassignment
- Curve interpolation과 concrete path commands
- Named/constant stroke dash vocabulary
- Scalar/parameterized aggregate vocabulary
- Point-composite top/bottom legends

Evidence가 없는 broader mark/scale/guide behavior는 Planned 또는 Proposed 상태를 유지한다.

## Phase 완료 조건

모든 gallery pair와 full verification이 통과하고 Roadmap, GOAL, STEP, current contracts와 generated catalog가
같은 완료 상태를 나타낸다.
