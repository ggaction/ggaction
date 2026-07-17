# Cars Polar Scatterplot

## 목적

Cars의 `Acceleration`을 clockwise theta position, `Horsepower`를 radial position, `Origin`을 color로 표현한다.
Phase 2의 canonical Gate C chart다.

## 최종 user-facing API

```javascript
chart()
  .createCanvas({ width: 520, height: 520, margin: 48 })
  .createData({ values: cars })
  .createPointMark()
  .encodeTheta({ field: "Acceleration" })
  .encodeR({ field: "Horsepower" })
  .encodeColor({ field: "Origin" })
  .encodePointRadius({ value: 3 });
```

## Stored result contract

- layer coordinate: `polar`
- theta scale: `theta`, auto domain, auto `[0, 360]` degree range
- radius scale: `radius`, auto domain, auto plot-relative pixel range
- point graphics: final backend-neutral `x`, `y`, radius and color only
- one incomplete Polar position channel: semantic state only, no visible point geometry
