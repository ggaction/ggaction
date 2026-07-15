# Roadmap 2 — Phase 3 Step 8: Position and Orientation Primitives

## 목표

Broader position compatibility 구현 전에 vertical temporal bar와 horizontal ordinal bar의 final scale,
rect, axes와 grid geometry를 raw primitive로 승인받는다.

## 진행 상태

- [ ] `temporal-x` jobs-derived UTC-compatible reference
- [ ] `horizontal-bar` quantitative x/ordinal y reference
- [ ] Orientation inference target state
- [ ] Temporal/ordinal/quantitative scale domain과 range fixtures
- [ ] Rect x/y/width/height reference
- [ ] Top-level drawing order, axes와 directional grids
- [ ] Inferred guide title/format target
- [ ] Expanded target chain metadata
- [ ] Browser와 2× primitive PNG 생성
- [ ] Gate D 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [ ] STEP status, conceptual commit와 push

## Primitive 원칙

- Reference scale mapping과 orientation은 production position/bar materializer와 독립적으로 계산한다.
- Primitive는 future broader field-type compatibility 또는 orientation inference를 호출하지 않는다.
- `temporal-x` input derivation은 manifest가 소유하고 normalized timestamps를 concrete values와 혼동하지 않는다.
- Horizontal bar는 x measure와 y category의 역할을 graphic dimensions까지 명시한다.

## 완료 조건

두 orientation primitive의 scale/rect/guide geometry와 target public chain이 승인된다.
