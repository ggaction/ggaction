# Basic Line Plot

## 목적

Direct 또는 aggregate x/y series를 existing line action으로 조립한다.

## 후보 API

```javascript
program.createLinePlot({
  id?, data?, coordinate?,
  x, y,
  color?, groupBy?, strokeDash?,
  line?: { strokeWidth?, curve?, stroke?, opacity?, closed? },
  guides?: false | CreateGuidesOptions
});
```

- `x`, `y`: field string 또는 line-compatible position option. Aggregate는 existing y policy를 따른다.
- `color`: categorical/continuous color option; categorical color는 series grain에 참여한다.
- `groupBy`: `encodeGroup` field.
- `strokeDash`: exact `StrokeDashEncodingOptions`; plain string shorthand는 dash style/field ambiguity 때문에 없다.
- `closed: true`는 existing rule에 따라 Polar에서만 가능하므로 이 Cartesian facade에서는 preflight error다.

## Shortest chain과 hierarchy

```javascript
program.createLinePlot({ x: "Horsepower", y: "Acceleration" });
```

`createLineMark → encodeX → encodeY → optional color/group/dash → createGuides` 순서다. Phase 1의 x/y
order-independent position policy와 existing series compatibility를 그대로 사용한다.

## 저장 결과와 오류

별도 line-plot state는 없다. 같은 series 안에서 group/color/dash 값이 모순되거나 aggregate x/y 조합이
지원되지 않으면 child action과 같은 명시적 오류를 내며 partial facade trace를 남기지 않는다.
