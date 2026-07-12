# ggaction

`ggaction` is a JavaScript library for representing chart authoring as immutable,
traceable actions.

The current vertical slice includes immutable programs, hierarchical action
traces, Canvas, data and point-mark actions, quantitative x/y encodings, and a
Canvas renderer for concrete `canvas`, `circle`, `line`, and `text` graphics.

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 },
    background: "white"
  })
  .createData({
    id: "cars",
    values: cars
  })
  .createPointMark({
    id: "points"
  })
  .encodeX({
    field: "Horsepower"
  })
  .encodeY({
    field: "Miles_per_Gallon"
  })
  .encodeColor({
    field: "Origin"
  })
  .encodeRadius({
    value: 3
  })
  .createXAxis({
    title: { text: "Horsepower" }
  })
  .createYAxis({
    title: { text: "Miles per Gallon" }
  });
```

See the runnable [cars scatterplot example](./examples/cars-scatterplot/),
which renders 392 rows from `data/cars.json` using chart actions for Canvas,
data, point marks, position, color, and radius.

Completed programs can also be exported directly in Node.js:

```javascript
import { renderToPNG } from "ggaction/png";

await renderToPNG(completedProgram, {
  output: "./output/chart.png",
  pixelRatio: 2
});
```

## Development

```bash
npm test
npm run test:render
```

## Documentation

- [Documentation home](./docs/index.md)
- [Core concepts](./docs/core-concepts.md)
- [Canvas actions](./docs/canvas-actions.md)
- [Data actions](./docs/data-actions.md)
- [Mark actions](./docs/mark-actions.md)
- [Position encodings](./docs/encoding-actions.md)
- [Axis component actions](./docs/guide-actions.md)
- [Action authoring](./docs/action-authoring.md)
- [PNG rendering](./docs/png-rendering.md)
