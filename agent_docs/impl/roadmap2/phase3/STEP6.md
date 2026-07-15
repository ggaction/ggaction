# Roadmap 2 — Phase 3 Step 6: Grouped-Bar Geometry and Reassignment Primitives

## 목표

Fixed-pixel width, xOffset padding과 grouped field reassignment의 final slot/rect/legend target을 raw primitive로
고정한다.

## 진행 상태

- [ ] `width-pixels` primitive와 logical 14px reference
- [ ] `offset-padding` inner/outer band reference
- [ ] `group-reassignment` three-job subset reference
- [ ] Outer x band와 inner slot center/bandwidth fixtures
- [ ] Color/xOffset matching domain과 first-appearance order
- [ ] Missing group cell omission
- [ ] Existing legend title/style preservation target
- [ ] Expanded target chain metadata
- [ ] Browser와 2× primitive PNG 생성
- [ ] Gate C 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [ ] STEP status, conceptual commit와 push

## Primitive 원칙

- Slot step, bandwidth, padding과 final rect width는 production offset/bar-width helper와 독립적으로 계산한다.
- Pixel width는 Canvas logical coordinate이고 PNG pixel ratio를 곱해 semantic/graphic state에 저장하지 않는다.
- Group reassignment primitive는 final matching color/xOffset field만 저장하고 invalid intermediate state를
  표현하지 않는다.
- Primitive는 future padding, pixels 또는 reassignment behavior를 호출하지 않는다.

## 완료 조건

세 primitive의 slot geometry, rect width, group order와 target chain이 승인된다.
