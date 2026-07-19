# Basic Scatter Plot

## 목적

Point mark와 Cartesian x/y를 직접 조립하지 않고 최소 두 field로 scatter plot을 만든다.

## 후보 API

```javascript
program.createScatterPlot({
  id?, data?, coordinate?,
  x, y,
  color?, size?, shape?,
  point?: { shape?, fill?, opacity?, stroke?, strokeWidth? },
  guides?: false | CreateGuidesOptions
});
```

- `x`, `y`: field string 또는 point-compatible position option.
- `color`: field string 또는 existing `ColorEncodingOptions` without target.
- `size`: quantitative field string 또는 existing size option without target.
- `shape`: nominal field string 또는 existing shape option without target.
- Constant point shape는 `point.shape`; field-driven shape는 top-level `shape`다.

## Shortest chain과 hierarchy

```javascript
program.createScatterPlot({ x: "Horsepower", y: "Miles_per_Gallon" });
```

`createPointMark → encodeX → encodeY → optional encodings → createGuides` 순서다. Omitted size는 Phase 1의
materialized default radius `3`을 사용한다.

## 저장 결과와 오류

별도 scatter state는 없다. Point layer, encodings, scales, coordinate와 guides만 저장한다. Constant fill과
field color, constant shape와 field shape 같은 child-action conflict는 전체 call을 변경 없이 거부한다.
