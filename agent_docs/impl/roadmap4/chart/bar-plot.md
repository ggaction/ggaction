# Basic Bar Plot

## 목적

Vertical/horizontal aggregate bar와 existing color layout을 하나의 create action으로 조립한다.

## 후보 API

```javascript
program.createBarPlot({
  id?, data?, coordinate?,
  x, y,
  color?,
  width?: { band?: number } | { pixels: number },
  bar?: { fill?, opacity?, stroke?, strokeWidth? },
  guides?: false | CreateGuidesOptions
});
```

- `x`, `y`: field string 또는 bar-compatible complete position option.
- Aggregate와 stack은 해당 x/y option이 existing position policy에 전달한다.
- Group/stack/fill/overlay/diverging은 `color.layout`이 소유한다. 별도 facade `layout` vocabulary는 없다.
- `width`는 existing `encodeBarWidth` 계약을 그대로 사용한다.

## Shortest chain과 hierarchy

```javascript
program.createBarPlot({
  x: { field: "year", fieldType: "ordinal" },
  y: { field: "perc", aggregate: "mean" }
});
```

`createBarMark → encodeX → encodeY → optional encodeColor/encodeBarWidth → createGuides` 순서다.

## 저장 결과와 오류

별도 bar-plot state가 없으며 bar grain, baseline, stacking과 offset은 child actions의 semantic/materialization
state다. Incomplete grain, incompatible layout와 explicit domain conflict는 facade 시작 전에 preflight한다.
