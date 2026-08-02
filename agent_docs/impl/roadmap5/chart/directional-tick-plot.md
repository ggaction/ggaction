# Directional Tick Plot

## 차트 목적

x/y 위치마다 짧은 Tick을 놓고 direction field를 degree로 회전한다. 같은 위치의 rotated point variant와 비교해
두 mark가 동일한 angle convention을 쓰는지 검증한다. 별도 actual-data variant는 fixed baseline y를 명시해
Tick rug distribution을 보여준다.

## Proposed final user-facing API

```javascript
chart()
  .createCanvas({ width: 720, height: 480 })
  .createData({ id: "directions", values })
  .createTickMark({
    id: "ticks",
    length: 14,
    stroke: "#111827",
    strokeWidth: 2
  })
  .encodeX({ target: "ticks", field: "x", fieldType: "quantitative" })
  .encodeY({ target: "ticks", field: "y", fieldType: "quantitative" })
  .encodeAngle({ target: "ticks", field: "direction" })
  .createPointMark({ id: "points", data: "directions", shape: "triangle-up" })
  .encodeX({ target: "points", field: "x", fieldType: "quantitative" })
  .encodeY({ target: "points", field: "y", fieldType: "quantitative" })
  .encodeAngle({ target: "points", field: "direction" })
  .createGuides();
```

## Action hierarchy

```text
createTickMark
└─ createGraphics when x/y are complete

encodeAngle
├─ editSemantic(angle assignment)
└─ rematerializePointMark | rematerializeTickMark
```

## Stored-result contract

- Tick layer stores mark identity/appearance plus ordinary x/y and optional angle encoding.
- Point uses the same angle encoding shape.
- Constant angle stores a finite degree value; field angle stores a quantitative field binding.
- Concrete Tick endpoints and rotated point path commands are fully materialized in `graphicSpec`.
- Renderer reads neither angle semantic nor shape rotation rules.

## Visual acceptance

- 0°, 90°, 180° and 270° point upward, right, down and left respectively.
- Tick and triangle point agree at every direction.
- Length/area and center remain invariant under rotation.
- Canvas, SVG, PNG and PDF align when shown side by side.
- Actual-data rug variant는 각 observation을 하나의 Tick으로 보존하고 explicit fixed-y anchor를 사용한다.

## Non-goals

- x-only plot-edge rug placement automation or one-axis Tick inference
- Angle scale/legend, radians or data-domain normalization
- Rotation for text, line, rule, bar, area, rect or arc
