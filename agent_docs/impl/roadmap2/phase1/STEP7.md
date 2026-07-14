# Roadmap 2 — Phase 1 Step 7: Continuous Color and Field Opacity

## 목표

Gate C primitive를 재현하도록 sequential color, gradient legend, field-driven opacity와 opacity legend를
구현한다.

## 진행 상태

- [ ] Quantitative/temporal sequential domain resolution
- [ ] Palette/range exclusivity와 interpolation grammar
- [ ] Concrete sequential color mapping과 point rematerialization
- [ ] Gradient legend inference, layout와 materialization
- [ ] Field/value opacity discriminated options
- [ ] Opacity linear scale와 point rematerialization
- [ ] Constant↔field, field↔field opacity reassignment
- [ ] Opacity sample legend inference/layout/materialization
- [ ] Scale/Canvas/legend edit rematerialization
- [ ] Shared consumer, invalid option와 atomic failure coverage
- [ ] Approved user-facing programs와 PNG pairs
- [ ] Public declarations/docs와 conceptual commits/push

## Continuous color 범위

- Point mark의 quantitative/temporal `encodeColor`만 지원한다.
- Sequential scale은 shared internal grammar로 계산하지만 general public scale type으로 확장하지 않는다.
- Default `viridis`, eight interpolation tokens, explicit multi-stop range, extent/reverse/clamp를 검증한다.
- Line/area gradient path와 color layout은 지원하지 않는다.
- Gradient legend는 categorical-only option인 `symbol`, `columns`, `direction`, `itemGap`을 거부한다.

## Field opacity 범위

- 첫 구현은 quantitative point mark만 지원한다.
- `field`와 `value`는 mutually exclusive이며 같은 action 재호출로 mode를 atomic하게 교체한다.
- Field scale range endpoint는 `[0, 1]` 안에 있어야 하며 descending range도 허용한다.
- Constant mode는 scale/legend를 만들지 않는다.
- Opacity legend는 color/shape/size가 field-driven이면 documented neutral point recipe를 사용한다.

## 검증 기준

- Eight interpolation token과 68 palette registry의 integration은 representative endpoint/midpoint로 검증한다.
- Quantitative와 temporal color, reverse/extent, four legend positions와 insufficient margin을 기계적으로
  검증하고 gallery에는 승인된 대표 layout만 둔다.
- Earlier program, caller rows, explicit range/palette arrays와 legend recipe는 immutable하다.

## 완료 조건

STEP6의 두 variants가 primitive/public exact pair가 되고 existing categorical color/legend behavior가
회귀하지 않는다.
