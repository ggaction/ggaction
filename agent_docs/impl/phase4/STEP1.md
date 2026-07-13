# Phase 4 — Step 1: Primitive Grouped Bar Chart

## 목표

기존의 안정적인 `createCanvas`, `createData`, `createBarMark`를 재사용하고,
Phase 4에서 새로 도입하는 grouped bar semantic과 graphical contract를 primitive
action으로 완성한다.

```javascript
editSemantic()
createGraphics()
editGraphics()
```

## 진행 상태

- [x] Primitive grouped bar program/test skeleton
- [x] Deterministic jobs grouped-bar values helper
- [x] Ordinal/xOffset/nullable-stack semantic path와 validation
- [x] `year × sex` mean aggregation
- [x] Band와 xOffset 기반 concrete rect collection
- [x] Raw ordinal x / quantitative y axes
- [x] Raw horizontal grid와 right-side color legend
- [x] Acceptance, immutability, graphicSpec-only rendering
- [x] 2× PNG regression과 직접 확인
- [x] 기존 전체 test와 PNG regression 유지

## 재사용하는 action

```text
createCanvas
createData
createBarMark
```

새로운 high-level encoding이나 guide action은 STEP1에서 구현하지 않는다.

## Program 구조

```text
createCanvas
createData(jobs)
createBarMark(bars)
editSemantic(ordinal x, aggregate y, color, xOffset, scales, guides)
editGraphics(concrete grouped rects)
createGraphics(raw horizontal grid)
createGraphics(raw x/y axes)
createGraphics(raw sex legend)
```

Primitive user program은 하나의 명시적인 method chain을 사용한다. Fixture helper는
값만 계산하며 library implementation에서 import하지 않는다.

## Values helper

```text
valid jobs
→ year first-appearance domain
→ sex first-appearance domain
→ year × sex별 mean(perc)
→ nice non-zero y domain과 ticks
→ year band와 sex xOffset slot
→ band 0.72 concrete rect
→ axes, grid, legend coordinates
```

규칙:

- `year`와 `perc`는 finite number여야 한다.
- `sex`는 non-empty string이어야 한다.
- `band`는 0보다 크고 1 이하여야 한다.
- 누락된 `year × sex` 조합은 rect를 만들지 않는다.
- Source dataset은 변경하거나 aggregate rows로 대체하지 않는다.
- `zero: false`는 zero를 강제하지 않으며 nice domain의 하단을 bar baseline으로 쓴다.

## Semantic contract

```javascript
{
  mark: { type: "bar" },
  encoding: {
    x: { field: "year", fieldType: "ordinal", scale: "x" },
    y: {
      field: "perc",
      fieldType: "quantitative",
      aggregate: "mean",
      stack: null,
      scale: "y"
    },
    color: { field: "sex", fieldType: "nominal", scale: "color" },
    xOffset: {
      field: "sex",
      fieldType: "nominal",
      scale: "xOffset"
    }
  }
}
```

## Graphical contract

각 bar child는 concrete 값만 가진다.

```javascript
{
  x,
  y,
  width,
  height,
  fill,
  stroke,
  strokeWidth
}
```

Rendering order는 다음과 같다.

```text
canvas → horizontal grid → bars → axes → legend
```

## 제외 범위

- Ordinal bar `encodeX`
- Aggregate bar `encodeY`
- `encodeColor({ layout })`
- `encodeXOffset`
- `encodeBarWidth`
- Ordinal axis와 grouped legend action
- `createGuides` integration
- Browser example과 tutorial

## 검증 결과

- 전체 unit/acceptance/docs test 277개 통과
- PNG render test 10개 통과
- 2× PNG가 `1440×920`으로 생성되는 것 확인
- 15 year × 2 sex의 grouped rect 30개 확인
- Ordinal x axis, non-zero mean y scale, horizontal grid, right legend 직접 확인
- Source input ownership과 `graphicSpec`-only rendering 확인
