# Phase 4 Goal — Grouped Bar Chart

**상태: 완료**

## 목표

`jobs.json`의 `year`, `perc`, `sex`를 사용해 year별 mean percentage를 sex에
따라 나란히 배치한 grouped bar chart를 구현한다.

최종 사용자는 다음 action chain만 작성하면 된다.

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 40, right: 140, bottom: 70, left: 80 }
  })
  .createData({ id: "jobs", values: jobs })
  .createBarMark({ id: "bars" })
  .encodeX({
    field: "year",
    fieldType: "ordinal"
  })
  .encodeY({
    field: "perc",
    aggregate: "mean",
    scale: {
      nice: true,
      zero: false
    }
  })
  .encodeColor({
    field: "sex",
    layout: "group",
    scale: {
      palette: "tableau10"
    }
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides();
```

## 진행 상태

- [x] Primitive grouped bar contract
- [x] Ordinal bar `encodeX`
- [x] Aggregate bar `encodeY`
- [x] Bar color `layout: "stack" | "group"`
- [x] Internal `encodeXOffset`
- [x] Band-based `encodeBarWidth`
- [x] Grouped/stacked bar materialization
- [x] Ordinal x axis
- [x] Grouped bar legend
- [x] `createGuides` integration
- [x] Browser example, tutorial, PNG regression
- [x] 사용자 문서와 LLM reference

## Semantic 목표

```javascript
{
  mark: { type: "bar" },

  encoding: {
    x: {
      field: "year",
      fieldType: "ordinal",
      scale: "x"
    },

    y: {
      field: "perc",
      fieldType: "quantitative",
      aggregate: "mean",
      stack: null,
      scale: "y"
    },

    color: {
      field: "sex",
      fieldType: "nominal",
      scale: "color"
    },

    xOffset: {
      field: "sex",
      fieldType: "nominal",
      scale: "xOffset"
    }
  }
}
```

`layout: "group"`은 `y.stack = null`과 같은 field의 `xOffset`을 만든다.

`layout: "stack"`은 `y.stack = "zero"`를 사용하며 `xOffset`을 만들지 않는다.

## Action 구조

```text
encodeColor({ field, layout: "group" })
├─ color encoding 저장
├─ color scale 생성
├─ y.stack = null
├─ encodeXOffset({ field })
└─ rematerializeBarMark
```

```text
encodeColor({ field, layout: "stack" })
├─ color encoding 저장
├─ color scale 생성
├─ y.stack = "zero"
└─ rematerializeBarMark
```

`encodeXOffset`은 advanced action으로 존재하지만 일반 사용자는 직접 호출하지 않아도
된다.

## Graphical 목표

- `year × sex`별 `mean(perc)`를 계산한다.
- Group layout은 하나의 year band를 sex domain별 slot으로 나눈다.
- `band: 0.72`는 각 group slot에서 bar가 차지하는 비율이다.
- 최종 `graphicSpec`에는 concrete `x`, `y`, `width`, `height`, `fill`만 저장한다.
- 누락된 category 조합은 placeholder 없이 생략한다.
- Source dataset은 변경하지 않는다.

## Scale과 guide

- x는 ordinal position scale이다.
- xOffset은 x band 내부에서만 사용되는 ordinal scale이다.
- y는 mean 결과로 계산한 linear scale이다.
- `zero: false`이면 plot bottom을 resolved y domain의 최솟값으로 사용한다.
- x axis tick은 각 year band 중앙에 배치한다.
- y axis title은 `mean(perc)`로 추론한다.
- `createGuides()`는 ordinal x axis, quantitative y axis, horizontal grid, sex
  color legend를 생성한다.

## 재사용 범위

- `createCanvas`, `createData`, `createBarMark`
- Rect primitive와 Canvas renderer
- Linear/ordinal scale 계산
- Mean aggregation 개념
- `encodeColor`와 `tableau10`
- y axis와 horizontal grid
- Categorical swatch legend
- `createGuides`
- Canvas 변경 rematerialization

## 제외 범위

- Multiple grouping fields
- Nested offsets
- Horizontal grouped bars
- Negative-value baseline
- Interactive selection과 tooltip
- Animation
- Explicit per-row bar positioning
