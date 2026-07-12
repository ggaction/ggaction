# ggaction

`ggaction` is a JavaScript library for building charts through immutable,
traceable actions.

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createAxes({
    x: { title: { text: "Horsepower" } },
    y: { title: { text: "Miles per Gallon" } }
  });

render(program, document.querySelector("#chart").getContext("2d"));
```

The renderer reads only fully materialized, backend-neutral graphics. Semantic
state is never automatically compiled during rendering.

## Documentation

- [Getting started](./docs/getting-started.md)
- [Cars scatterplot tutorial](./docs/tutorials/scatterplot.md)
- [Chart concepts](./docs/concepts/chart-program.md)
- [Complete action reference](./docs/reference/actions.md)
- [Supported features](./docs/supported-features.md)
- [Documentation index](./docs/index.md)

The runnable [cars scatterplot](./examples/cars-scatterplot/) uses 392 rows from
`data/cars.json`. Completed programs can also be exported through
[`ggaction/png`](./docs/api/rendering.md#png-output).

## Development

```bash
npm install
npm test
npm run test:render
```
