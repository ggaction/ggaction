# Cars Polar Guides

## 목적

Cars의 `Acceleration`을 theta, `Horsepower`를 radius로 배치하고 Polar axes와 grids로 두 quantitative mapping을
읽을 수 있게 한다. Phase 3의 canonical Gate D chart다.

## 최종 user-facing API

```javascript
chart()
  .createCanvas({ width: 620, height: 620, margin: 78 })
  .createData({ values: cars })
  .createPointMark({ opacity: 0.78 })
  .encodeTheta({ field: "Acceleration" })
  .encodeR({ field: "Horsepower", scale: { zero: true } })
  .encodeColor({ field: "Origin" })
  .encodePointRadius({ value: 3 })
  .createGuides();
```

## Default guide contract

- theta ticks: six-count automatic policy; labels show source-domain values
- radius ticks: five-count automatic policy; zero is retained at the center
- theta grid: one center-to-edge spoke per theta tick
- radial grid: one concentric path per positive radius tick
- theta axis: outer circular baseline, outward ticks and perimeter labels
- radial axis: center-to-right baseline at `90°`, perpendicular ticks and labels
- inferred titles: `Acceleration` and `Horsepower`
- grids draw behind points; axes draw above points

## Public action hierarchy

The shortest call uses `createGuides()`. Direct `createThetaAxis`, `createRadialAxis`, `createThetaGrid` and
`createRadialGrid` actions remain available for selective authoring. Focused component actions edit visible guide
parts without exposing raw graphic IDs.
