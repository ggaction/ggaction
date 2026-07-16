# Roadmap 2 — Phase 10 Step 9: Gate D Continuous-Color Bar Primitive

## 목표

Gapminder aggregate bars에 one-value-per-final-rect sequential color와 gradient legend를 primitives로 만들고
aggregate inheritance target을 승인받는다.

## 진행 상태

- [x] Independent bar measure/color aggregate rows
- [x] Matching-field inherited aggregate and explicit alternate aggregate targets
- [x] Concrete rect colors and gradient legend
- [x] Edit-scale rematerialization target
- [x] Exact future public call chain
- [x] Browser and PNG verification
- [ ] Gate D user confirmation
- [x] STEP status, conceptual commit and push

## 구현 결과

- 1995–2005의 8개 국가를 country grain으로 집계해 모든 bar가 정확히 3개 source row를 소유한다.
- `matching-population`은 height와 color가 함께 `sum(pop)`을 사용한다.
- `mean-life-expectancy`는 height `sum(pop)`과 explicit color `mean(life_expect)`를 분리한다.
- `reversed-life-expectancy`는 동일 aggregate geometry에서 color range와 gradient만 뒤집는다.
- 세 primitive trace는 `editSemantic`, `createGraphics`, `editGraphics`로만 구성된다.

## 검증

- `test/gates/gapminder-continuous-color-bars/primitive.test.js`
- `test/gates/gapminder-continuous-color-bars/png.render.js`
- `.artifacts/test/png/roadmap2/gapminder-continuous-color-bars/`

## 완료 조건

Each final rectangle has one justified semantic color value and the complete target is visually approved.
