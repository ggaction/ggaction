# Roadmap 2 — Phase 10 Step 6: Time, Band and Point Integration

## 목표

UTC-only time semantics and explicit band/point consumers를 encoding, marks and guides에 통합한다.

## 진행 상태

- [x] Existing ordinal-position migration
- [x] Bar band and layered point-position inference
- [x] UTC time domain, nice, ticks and labels
- [x] Scale/Canvas edit rematerialization
- [x] Gate B exact public equivalence
- [x] Migration and compatibility errors
- [x] Types, public docs and current-contract promotion
- [x] STEP status, conceptual commit and push

## 구현 결과

- Category bar position은 `band`, width가 필요 없는 point/rule position은 `point`를 기본으로 저장한다.
- Band/point는 explicit domain/range, padding, align, reverse와 guide rematerialization을 공유한다.
- 새 ordinary point layer는 current, otherwise unique compatible source에서 data, coordinate와 x/y scale을
  추론한다. Aggregate/bin/stack은 새 point recipe로 복사하지 않는다.
- Shared band scale edit는 bars, point centers와 guides를 한 materialization plan으로 갱신하고 bar consumer가
  남아 있는 point-type 전환은 atomic하게 거부한다.
- Gapminder band+point와 UTC time variants는 public/primitive semantic, graphic state, order, Canvas calls와
  decoded PNG pixels가 exact하게 일치한다.

## 검증

- `test/unit/actions/scales/discrete-position-scales.test.js`
- `test/unit/actions/marks/layered-mark-inference.test.js`
- `test/charts/gapminder-temporal-discrete-scales/public.test.js`
- `test/charts/gapminder-temporal-discrete-scales/png.render.js`

## 완료 조건

Position consumers persist the correct scale type and approved primitive/public pairs converge exactly.
