# Roadmap 2 — Phase 1 Step 3: Editing and Appearance Foundations

## 목표

Gate A에서 승인된 네 primitive를 재현하도록 `editScale`, shared point-shape grammar,
`editPointMark`와 Vega palette registry를 구현한다.

## 진행 상태

- [x] `editScale` selector, patch normalization과 atomic validation
- [x] Linear/time/ordinal domain/range/policy editing
- [x] Scale materialization plan과 deterministic consumer deduplication
- [x] Shared `PointShape` 12종 validation과 geometry recipes
- [x] Shape target-area normalization과 Canvas path parity
- [x] `createPointMark`, `editPointMark`, `encodeShape`, legend symbol 공유
- [x] `editPointMark` inference/conflict/rematerialization
- [ ] Frozen 68-name Vega palette registry와 sampling
- [ ] Palette count/extent/range conflict/cycling/reverse coverage
- [ ] 네 approved variant의 user-facing programs와 PNG pair
- [ ] Primitive/public exact equivalence와 trace tests
- [ ] Public declarations/docs와 conceptual commits/push

## `editScale` 범위

- Existing `linear | time | ordinal` scale만 선택한다.
- `domain`, `range`, `nice`, `zero`, `clamp`, `reverse` 중 최소 하나를 변경한다.
- `"auto"`는 domain/range reset이며 omission은 기존 값 보존이다.
- Explicit domain/range precedence와 shared-consumer compatibility를 patch 적용 전에 검사한다.
- Mark, axes, grids, legends를 registered plan 순서로 rematerialize한다.
- Scale type 변경, scale 삭제, consumer rebind와 `unknown`은 범위 밖이다.

## Shape와 palette 범위

- `editPointMark.shape`는 shared `PointShape` 12종을 받는다.
- Field-driven shape가 있는 mark에 constant shape edit를 적용하면 오류다.
- Shape recipe는 mark와 legend가 함께 사용하고 renderer는 semantic token을 해석하지 않는다.
- Palette registry는 accepted 68개 이름을 frozen snapshot으로 소유한다.
- Gallery는 대표 palette만 사용하지만 모든 이름과 family-specific option을 machine test로 검증한다.
- Shape/palette public variants는 최초 encoding에서 option을 지정하며 STEP5의 reassignment behavior를
  미리 구현하지 않는다.

## 검증 기준

- 모든 실패는 semantic, graphic, context와 trace를 변경하지 않는다.
- Canvas resize와 scale/mark edit 후에도 모든 affected consumer가 갱신된다.
- Earlier `ChartProgram`과 caller-owned scale arrays는 변경되거나 retain되지 않는다.
- Action trace는 public edit와 meaningful wrapped materialization hierarchy를 보여준다.

## 완료 조건

STEP2의 네 variant가 primitive/public pair로 전환되고 gallery에서 `Ready for equivalence review`가 된다.
