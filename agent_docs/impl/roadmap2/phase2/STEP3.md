# Roadmap 2 — Phase 2 Step 3: Curve Primitives

## 목표

Curve public implementation 전에 representative step과 monotone target을 raw primitive commands로 만들고
시각적 계약을 승인받는다.

## 진행 상태

- [x] `curve-step` reference values와 primitive chain
- [x] Step midpoint command fixture
- [x] `curve-monotone-edit` reference values와 primitive chain
- [x] Monotone cubic command fixture
- [x] Thick stroke와 axes/legend/title layout 확인
- [x] Primitive metadata와 expanded target chains
- [x] Browser와 2× primitive PNG 생성
- [ ] Gate A 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [x] STEP 상태, conceptual commit와 push

## 제한

Primitive는 production curve helper나 future public action을 호출하지 않는다. 승인 전에는
`createLineMark.curve`, `editLineMark` 또는 user-facing PNG를 만들지 않는다.

## 구현 결과

`curve-step`은 adjacent point의 x midpoint에서 이전 y를 유지한 뒤 새 y로 수직 이동하고 endpoint로
진행하는 세 개의 `L` command를 구간마다 저장한다. 각 12-point series는 initial `M`과 33개의 `L`을
가진다.

`curve-monotone-edit`은 strictly increasing x를 전제로 weighted harmonic tangent를 계산한 monotone cubic
Hermite reference를 사용한다. 각 구간은 하나의 `C` command이며 세 series의 stroke width는 4다. 두
reference 계산은 production curve helper를 import하지 않는다.

두 primitive는 baseline과 같은 semantic state, axes, grid, legend, title과 drawing order를 유지한다.
Gallery metadata는 helper가 아니라 future expanded public chain을 저장하며 user-facing slot은 Gate A 승인
전까지 비워 둔다. Desktop/mobile browser에서 두 1440×920 primitive image, code block, awaiting status와
horizontal overflow 부재를 확인했다.

## 완료 조건

두 primitive가 approved 상태이며 STEP4가 재현해야 할 exact commands와 visual appearance가 고정된다.
