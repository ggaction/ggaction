# Roadmap 2 — Phase 1 Step 6: Continuous Appearance Primitives

## 목표

Quantitative color와 field-driven opacity의 목표 graphic/guide 결과를 두 primitive variant로 먼저 만든다.

## 진행 상태

- [x] `continuous-color-gradient` independent scale/color reference
- [x] Sequential point fill과 gradient strip/tick/label primitive
- [x] `field-opacity-legend` independent opacity reference
- [x] Per-point opacity와 sample symbol/label primitive
- [x] Rendering order, margin fit과 background interaction
- [x] 두 variant의 exact target user-facing call chain metadata
- [x] Primitive-only PNG와 responsive gallery verification
- [x] Gate C 사용자 visual confirmation
- [x] STEP 상태, conceptual commit와 push

현재 상태: primitive 구현과 기계적/시각 검증 완료. Gate C 사용자 승인 완료.

## `continuous-color-gradient`

- Field: `Acceleration`, field type: quantitative
- Auto domain: finite field extent
- Default palette: `viridis`
- Default interpolation: `rgb`
- Gradient legend: right, length `120`, thickness `12`, count `5`
- Legend endpoints는 final displayed palette direction과 일치한다.
- Canvas는 legend가 plot과 겹치지 않는 explicit right margin을 사용한다.

## `field-opacity-legend`

- Field: `Acceleration`, field type: quantitative
- Auto domain: finite field extent
- Auto range: `[0.2, 1]`
- Legend: right, representative count `5`
- Label order는 ascending domain이고 reversed range는 symbol appearance만 뒤집는다.
- Variant는 opacity contract를 고립시키기 위해 다른 field-driven appearance를 사용하지 않는다.
- Canvas는 legend가 plot과 겹치지 않는 explicit right margin을 사용한다.

## 검증 기준

- Primitive는 palette/interpolation token을 graphic에 남기지 않고 concrete CSS colors를 저장한다.
- Gradient는 adjacent concrete rect strips, tick lines와 text로 materialize한다.
- Opacity legend는 concrete point recipe와 explicit opacity values를 저장한다.
- Available margin이 부족하면 Canvas를 자동 확장하지 않고 명확히 실패한다.

## 승인 게이트

두 guide의 크기, 방향, label density와 point 가독성을 사용자에게 함께 확인받는다. 승인 전에는
continuous/opacity public action을 구현하지 않는다.
