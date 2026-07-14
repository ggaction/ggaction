# Roadmap 2 — Phase 1 Step 8: Integration and Closeout

## 목표

Phase 1의 모든 variant와 Planned contract evidence를 통합 검증하고 public documentation과 catalog를
실제 구현 상태로 정리한다.

## 진행 상태

- [x] Eight gallery variants의 metadata, image와 pair state 확인
- [x] 모든 primitive/public graphic/order/Canvas-call equivalence
- [x] Cross-feature appearance call-order invariance
- [x] Canvas resize와 shared scale consumer rematerialization
- [x] Action trace hierarchy와 deterministic plan order
- [x] Immutability, invalid/ambiguous target와 atomic failure audit
- [x] Public TypeScript declarations와 package exports
- [x] Actions, marks, encodings, scales, guides와 recipes docs
- [x] Canonical examples/tutorial/LLM docs freshness
- [x] ACTION_INDEX evidence와 Planned → Implemented promotion
- [x] Intermediate program/snapshot/generated artifact cleanup
- [x] Unit, contract, chart, docs, coverage, render와 CI
- [x] Desktop/mobile gallery browser verification
- [x] GOAL/STEP final results, conceptual commit와 push

## 통합 검증

다음 조합을 별도 PNG variant로 늘리지 않고 executable contract로 검증한다.

- Shape + size + color + opacity의 action call-order permutation
- Scale edit 뒤 Canvas resize와 Canvas resize 뒤 scale edit
- Shared scale의 compatible consumers와 one incompatible consumer
- Inferred target, explicit target, no candidate와 ambiguous candidates
- Auto→explicit→auto domain/range lifecycle
- Constant↔field appearance mode change와 existing legend cleanup/preservation
- Inferred guide title과 explicit custom title/style preservation

## Documentation 정리

- Public docs에는 실제 user-facing/advanced extension API와 accepted values만 노출한다.
- 12개 shape, 68개 palette, interpolation과 opacity range를 searchable reference로 정리한다.
- Internal registry, geometry helper와 materialization implementation을 user docs에 나열하지 않는다.
- Gallery target chain과 canonical example/tutorial chain이 drift하지 않게 executable test를 둔다.

## Contract 승격

다음 항목은 구현과 evidence가 모두 존재할 때만 Implemented로 이동한다.

- `editScale`, `editPointMark`
- X/Y/color/size/shape reassignment
- Point shape vocabulary
- named palette vocabulary
- Continuous point color와 gradient legend
- Field-driven opacity와 opacity legend

General sequential scale editing과 Phase 10 scale vocabulary는 Planned 상태를 유지한다.

## Phase 완료 조건

- Gallery의 모든 Phase 1 pair가 `Ready for equivalence review`이고 browser error가 없다.
- Full test와 coverage threshold가 통과한다.
- Roadmap, GOAL, STEP과 contract catalog가 같은 완료 상태를 나타낸다.
- Working tree에는 final source/test/docs만 남고 generated gallery/PNG는 gitignored artifact로 재현 가능하다.

## 완료 결과

- Gallery의 Phase 1 여덟 variant는 모두 metadata, expanded target chain, primitive/public PNG와
  `Ready for equivalence review` 상태를 가진다.
- Primitive/public program은 `graphicSpec`, rendering order와 Canvas calls가 동일하다.
- 통합 테스트는 scale edit/Canvas resize 순서 독립성, 이전 program 불변성, deterministic
  rematerialization order와 continuous guide title/style 보존을 검증한다.
- Current contract는 point continuous color와 field opacity evidence를 소유한다. 남은 continuous bar
  consumer와 general sequential scale editing은 Phase 10 Planned 범위다.
- 전체 490개 테스트와 PNG render가 통과했다. Coverage는 lines `94.26%`, branches `89.71%`,
  functions `98.09%`다.
- Desktop `1440×1000`, mobile `390×844`에서 여덟 pair, 16개 image load, call chain,
  responsive columns와 horizontal overflow 부재를 실제 browser로 확인했다.
- 문서 image/LLM output과 generated action catalog는 재생성 후 diff가 없다.
