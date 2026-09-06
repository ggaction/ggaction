# Roadmap 6 Phase 7 계약 — Polar와 1D chart facade

## 기준과 승인

- 기준 ref: `5b4e5a87c9aba1d3f47b5676db4ced4f28bdd132`.
- 사용자 승인: [전체 실행 승인](../APPROVAL.md)이 F20을 제외한 A/V/X, 구현과 필요한 검증을 포괄한다.
- 새 facade는 Full `ggaction`에만 추가한다. Basic과 renderer entry에는 노출하지 않는다.
- 기존 mark, encoding, scale, guide, derived-data, jitter owner를 wrapped child로 호출한다. 새 chart compiler나
  renderer 분기를 만들지 않는다.

## R6-P7-W1 — Polar Scatter와 Polar Line

### Public API

```ts
createPolarScatterPlot({
  id?, data?, coordinate?, theta, radius,
  color?, size?, shape?, point?, guides?
}): ChartProgram

createPolarLinePlot({
  id?, data?, coordinate?, theta, radius,
  groupBy?, color?, strokeDash?, line?, guides?
}): ChartProgram
```

- 기본 ID는 `polarScatterPlot`, `polarLinePlot`이다. Data는 explicit/current/unique 규칙을 따른다.
- `theta`는 field shorthand 또는 theta field/scale option이다. 숫자는 기존 `encodeTheta`의 clockwise degrees,
  temporal은 명시 unit, categorical은 stable scale domain을 사용한다. Facade가 radians를 추론하지 않는다.
- `radius`는 quantitative field shorthand 또는 radius field/scale option이다. Point glyph의 `point.radius`와
  `size`는 glyph 단위이며 radial position과 별개다. Constant glyph radius와 size encoding은 함께 쓸 수 없다.
- Line의 `groupBy`는 path identity, color/strokeDash는 appearance다. `line.closed`는 explicit boolean이고
  default false다. Seam을 자동으로 닫지 않는다.
- Guides는 theta/radius Polar axes, theta/radial grids와 applicable legend만 받는다. Cartesian x/y guide
  요청과 foreign coordinate/scale은 state change 전에 거부한다.
- Hierarchy는 mark → encodeTheta → encodeR → group/appearance → scoped guide fulfillment다.

## R6-P7-W2 — Radar

### Public API

```ts
createRadarPlot({
  id?, data?, coordinate?, category, value, groupBy?, order?,
  color?, strokeDash?, line?, guides?
}): ChartProgram

createRadarPlot({
  id?, data?, coordinate?, wide: { fields, as? }, groupBy?, order?,
  color?, strokeDash?, line?, guides?
}): ChartProgram
```

- Long form은 `category` nominal/ordinal theta와 quantitative `value` radius를 요구한다.
- Wide form의 `wide.fields`는 최소 세 selected measure field다. Facade는 deterministic
  `${id}FoldData`를 `createFoldData`로 만들고 `as` omission 때 `${id}Dimension`/`${id}Value`를 사용한다.
  원본 row가 둘 이상이면 series identity인 `groupBy`가 필수다. 임의 identifier field를 추론하지 않는다.
- `order`는 최소 세 distinct category value이며 source/fold dimension을 정확히 한 번씩 포함한다.
  모든 series는 같은 theta order를 사용한다. Duplicate series/category, missing dimension과 nonfinite radius는
  전체 호출을 거부한다.
- Radius 값은 이미 같은 단위이거나 caller가 명시적으로 정규화한 값이어야 한다. Facade는 min-max, z-score,
  per-dimension domain을 자동 적용하지 않는다.
- Line은 항상 `closed:true`로 생성한다. Caller가 `line.closed:false`를 요청하면 radar 의미와 충돌하므로
  거부한다. Group/color/strokeDash와 Polar guides는 W1과 같은 owner를 쓴다.

## R6-P7-W3 — Rug와 Strip

### Public API

```ts
createRugPlot({
  id?, data?, x, edge: "top" | "bottom", tick?, guides?
}): ChartProgram
createRugPlot({
  id?, data?, y, edge: "left" | "right", tick?, guides?
}): ChartProgram

createStripPlot({
  id?, data?, x, y?, color?, size?, shape?, point?, jitter?, guides?
}): ChartProgram
```

- Rug는 quantitative/temporal measure 하나와 plot-edge constant datum을 결합한다. x measure는 top/bottom,
  y measure는 left/right만 허용한다. Bottom/top tick은 0도, left/right는 90도로 기존 `encodeAngle`을
  호출한다. Dummy source field나 hidden dataset을 만들지 않는다.
- Strip은 하나 또는 두 position을 받는다. 하나면 그 field가 measure이고 반대 축의 center datum을 쓴다.
  둘이면 정확히 하나가 quantitative/temporal measure이고 다른 하나가 nominal/ordinal slot이어야 한다.
  두 quantitative 또는 두 categorical field는 ambiguity 오류다.
- `jitter` omission/false는 off다. Object는 `maxOffset`, `seed`, `key`를 기존 `jitterPoints`에 전달한다.
  Jitter channel은 category/constant slot이며 measure 좌표를 바꾸지 않는다. Category slot에는 band 단위,
  constant slot에는 pixel 단위만 허용한다.
- Rug 기본 guide는 measure axis 하나, Strip 기본 guide는 measure axis와 실제 category axis만 확보한다.
  Constant anchor용 scale의 axis/grid는 만들지 않는다. Legend는 explicit appearance encoding이 있을 때만 가능하다.
- Scale, Canvas, filter, jitter 제거와 mark appearance edit는 existing lower owner가 재물질화한다.

## 공통 오류·검증

- Unknown option, 잘못된 field/type/unit/scale, duplicate ID, mixed coordinate family, unsupported guide와
  ambiguous data/resource는 첫 child state를 반환하기 전에 preflight한다. Caller input과 이전 program/trace는
  바뀌지 않는다.
- H0 결과는 명시적 lower chain의 semanticSpec, graphicSpec, draw order와 같은 실행의 decoded PNG pixel이
  같아야 한다. Known theta/radius와 plot-edge/slot 좌표를 독립 oracle로 확인한다.
- Strict positive/negative declarations, action index/card, Current contract, API/reference/search/LLM docs,
  realistic scenario, Canvas/SVG/PNG/PDF, browser와 installed package를 각 conceptual change와 함께 갱신한다.
