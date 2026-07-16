# Roadmap 2 — Phase 10 Step 7: Gate C Discretized-Color Primitive

## 목표

Gapminder scatterplot의 quantitative color를 quantize, quantile and threshold representative primitives로 만들고
class colors와 interval legend를 승인받는다.

## 진행 상태

- [x] Independent class-boundary and label fixtures
- [x] Quantize/quantile/threshold representative primitives
- [x] Discrete interval legend graphics and order
- [x] Exact future public call chains
- [x] Browser and PNG verification
- [ ] Gate C user confirmation
- [x] STEP status, conceptual commit and push

## 구현 결과

- `quantize`는 auto extent를 5개 동일 간격으로, `quantile`은 62개 point를 최대 1개 차이의 5개 class로,
  `threshold`는 `[60, 70, 75, 80]` 고정 경계로 분리한다.
- 세 variant는 동일한 5색 range, point geometry, axes와 grid를 사용한다.
- 오른쪽 interval legend는 concrete swatch와 boundary label을 저장하며 renderer가 scale을 해석하지 않는다.
- 각 primitive trace는 `editSemantic`, `createGraphics`, `editGraphics`로만 구성된다.

## 검증

- `test/gates/gapminder-discretized-color-scales/primitive.test.js`
- `test/gates/gapminder-discretized-color-scales/png.render.js`
- `.artifacts/test/png/roadmap2/gapminder-discretized-color-scales/`

## 완료 조건

Every discrete color family has an unambiguous numeric and representative visual target.
