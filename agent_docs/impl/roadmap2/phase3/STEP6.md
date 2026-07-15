# Roadmap 2 — Phase 3 Step 6: Grouped-Bar Geometry and Reassignment Primitives

## 목표

Fixed-pixel width, xOffset padding과 grouped field reassignment의 final slot/rect/legend target을 raw primitive로
고정한다.

## 진행 상태

- [x] `width-pixels` primitive와 logical 14px reference
- [x] `offset-padding` inner/outer band reference
- [x] `group-reassignment` three-job subset reference
- [x] Outer x band와 inner slot center/bandwidth fixtures
- [x] Color/xOffset matching domain과 first-appearance order
- [x] Missing group cell omission
- [x] Existing legend title/style preservation target
- [x] Expanded target chain metadata
- [x] Browser와 2× primitive PNG 생성
- [x] Gate C 사용자 visual confirmation
- [x] Feedback 반영과 primitive 재확인
- [x] STEP status, conceptual commit와 push

## Primitive 원칙

- Slot step, bandwidth, padding과 final rect width는 production offset/bar-width helper와 독립적으로 계산한다.
- Pixel width는 Canvas logical coordinate이고 PNG pixel ratio를 곱해 semantic/graphic state에 저장하지 않는다.
- Group reassignment primitive는 final matching color/xOffset field만 저장하고 invalid intermediate state를
  표현하지 않는다.
- Primitive는 future padding, pixels 또는 reassignment behavior를 호출하지 않는다.

## Gate C 대상

- `width-pixels`: 15개 year × `men → women`, 모든 rect의 logical width `14`.
- `offset-padding`: `paddingInner: 0.2`, `paddingOuter: 0.1`, offset step `16.666…`, bandwidth
  `13.333…`, final band width `9.6`. Baseline slot center는 유지한다.
- `group-reassignment`: first-appearance order `Actor → Agent → Author`인 90-row subset, 45개 observed
  rect, color/xOffset matching domain과 explicit `Occupation` legend title을 유지한다.
- 세 결과는 720×460 logical Canvas와 1440×920 PNG를 사용하며 gallery browser console 오류가 없다.

## 완료 조건

세 primitive의 slot geometry, rect width, group order와 target chain이 승인된다.
