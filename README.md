# ggaction

`ggaction` is a JavaScript library for representing chart authoring as immutable,
traceable actions.

The first vertical slice is implemented: immutable programs, hierarchical
action traces, the three authoring primitives, and a Canvas renderer for
concrete `canvas` and `circle` graphics.

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
  });
```

See the runnable [cars scatterplot example](./examples/cars-scatterplot/),
which renders 392 rows from `data/cars.json` through the low-level extension
API. Domain-specific chart actions will be added in later steps.

Completed programs can also be exported directly in Node.js:

```javascript
import { renderToPNG } from "ggaction/png";

await renderToPNG(program, {
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
- [Action authoring](./docs/action-authoring.md)
- [PNG rendering](./docs/png-rendering.md)
