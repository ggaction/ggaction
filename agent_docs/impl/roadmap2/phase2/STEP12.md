# Roadmap 2 — Phase 2 Step 12: Integration and Closeout

## 목표

Phase 2의 모든 variant, vocabulary, cross-feature dependency와 public documentation을 통합 검증하고 실제
구현 evidence가 있는 Planned contract만 Current로 승격한다.

## 진행 상태

- [x] 13개 gallery variant metadata, image와 pair state
- [x] 모든 primitive/public graphic/order/Canvas-call equivalence
- [x] Curve/dash/group/aggregate call-order invariance
- [x] Canvas resize와 shared scale/series/guide rematerialization
- [x] Target inference, explicit target, no candidate와 ambiguity
- [x] Field↔constant dash와 legend cleanup/preservation
- [x] Aggregate empty/singleton/missing/boundary matrix
- [x] Trace hierarchy와 deterministic plan order
- [x] Immutability와 atomic failure audit
- [x] Public TypeScript declarations와 package exports
- [x] Examples/tutorials/API/recipes/reference/LLM docs freshness
- [x] ACTION_INDEX evidence와 Planned → Implemented promotion
- [x] Intermediate files와 generated artifact cleanup
- [ ] Unit, contract, chart, docs, coverage, render와 remote CI
- [x] Desktop/mobile gallery browser verification
- [ ] Roadmap/GOAL/STEP final status, conceptual commit와 push

## Closeout evidence

- Cars line chart 아래 13개 variant 모두 `variant.json`, `primitive.png`, `user-facing.png`를 가진다.
- Phase test는 모든 pair의 `semanticSpec`, `graphicSpec`, explicit order와 Canvas calls를 정확히 비교한다.
- 전체 fast suite는 555개 test, coverage는 lines 94.54%, branches 90.16%, functions 98.26%를 통과한다.
- Roadmap 2 전체 21개 variant gallery와 PNG render suite가 통과한다.
- Headless Chromium 1440×900과 390×844에서 21개 call chain과 42개 image, responsive pair layout,
  horizontal overflow와 console/page error 부재를 확인했다.
- 최종 closeout commit의 GitHub Actions test/coverage/documentation 결과만 원격 확인 대상으로 남긴다.

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
