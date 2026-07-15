# Roadmap 2 — Phase 3 Step 10: Integration and Closeout

## 목표

Phase 3의 모든 variant, numeric policy, cross-feature dependency와 public documentation을 통합 검증하고
실제 evidence가 있는 Planned contract만 Current로 승격한다.

## 진행 상태

- [x] 13개 gallery variant metadata, image와 pair state
- [x] 모든 primitive/public semantic/graphic/order/Canvas-call equivalence
- [x] Bin/count/normalized/diverging independent numeric fixtures
- [x] Width/padding/position exact geometry fixtures
- [x] Call-order convergence와 Canvas resize
- [x] Reassignment target inference, explicit target, no candidate와 ambiguity
- [x] Missing/empty/zero/negative/boundary failure matrix
- [x] Unsupported layout transition과 shared-scale conflict
- [x] Trace hierarchy와 deterministic materialization plan order
- [x] Caller input ownership, earlier-program immutability와 atomic failure
- [x] Public TypeScript declarations와 package exports
- [x] Examples/tutorials/API/recipes/reference/LLM docs freshness
- [x] ACTION_INDEX evidence와 Planned → Implemented promotion
- [x] Intermediate files와 generated artifact cleanup
- [x] Unit, contract, chart, docs, coverage, render와 remote CI
- [x] Desktop/mobile gallery browser verification
- [x] Roadmap/GOAL/STEP final status, conceptual commit와 push

## 통합 검증

- Equivalent bin/width/padding call order는 같은 final boundaries와 rect geometry에 수렴해야 한다.
- Histogram field reassignment는 color stack과 explicit guide appearance를 보존한다.
- Grouped field reassignment는 color/xOffset domain을 함께 갱신하며 partial mismatch를 남기지 않는다.
- Layout별 y domain, stacking order와 render order는 numeric reference와 같아야 한다.
- Canvas resize는 auto ranges, band widths, marks와 guides를 갱신하되 fixed logical-pixel width는 유지한다.
- Missing cells와 empty bins는 explicit completion policy 없이 graphic으로 합성되지 않는다.

## Contract 승격 대상

- `encodeHistogram` reassignment
- `encodeXOffset` reassignment
- Histogram bin controls
- Normalized stack mode
- Color layout vocabulary
- Bar width modes
- Offset padding controls
- Position field-type compatibility

`continuous-color-bar-consumer`, layout transition cleanup과 transformed scale vocabulary는 evidence가 없으므로
Planned 상태를 유지한다.

## Phase 완료 조건

모든 gallery pair와 full verification이 통과하고 Roadmap, GOAL, STEP, current contracts와 generated catalog가
같은 완료 상태를 나타낸다.

## 완료 증거

- Phase 3 gallery: histogram 5개와 jobs bar 8개, 모두 primitive/public pair와 exact pixel parity.
- Local suites: `npm test` 648개, `npm run test:render` 178개, source coverage 94.87%.
- Browser: Chromium 1440×1000과 390×844에서 image load, responsive 2열→1열과 horizontal overflow를 검증했다.
- Contract: Phase 3의 implemented note를 Current encoding contract로 단일화하고 Planned 중복을 제거했다.
- Position closeout에서 horizontal temporal category가 실제 rect를 만들도록 회귀를 수정하고 고정 테스트를 추가했다.
