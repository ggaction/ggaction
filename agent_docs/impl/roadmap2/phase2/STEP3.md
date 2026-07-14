# Roadmap 2 — Phase 2 Step 3: Curve Primitives

## 목표

Curve public implementation 전에 representative step과 monotone target을 raw primitive commands로 만들고
시각적 계약을 승인받는다.

## 진행 상태

- [ ] `curve-step` reference values와 primitive chain
- [ ] Step midpoint command fixture
- [ ] `curve-monotone-edit` reference values와 primitive chain
- [ ] Monotone cubic command fixture
- [ ] Thick stroke와 axes/legend/title layout 확인
- [ ] Primitive metadata와 expanded target chains
- [ ] Browser와 2× primitive PNG 생성
- [ ] Gate A 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [ ] STEP 상태, conceptual commit와 push

## 제한

Primitive는 production curve helper나 future public action을 호출하지 않는다. 승인 전에는
`createLineMark.curve`, `editLineMark` 또는 user-facing PNG를 만들지 않는다.

## 완료 조건

두 primitive가 approved 상태이며 STEP4가 재현해야 할 exact commands와 visual appearance가 고정된다.
