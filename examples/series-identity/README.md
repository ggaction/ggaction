# Keep series identity independent from appearance

This example uses [one public program](./program.js) with the shared [data and
three variants](./data.js). From the repository root, after `npm install`, run:

```sh
node --input-type=module <<'JS'
import { createSeriesIdentity } from "./examples/series-identity/program.js";
import { cases } from "./examples/series-identity/data.js";
import { renderToPNG } from "./src/renderers/png.js";
for (const variant of cases) {
  const program = createSeriesIdentity(variant);
  await renderToPNG(program, {
    output: `.artifacts/examples/series-identity/${variant.id}.png`
  });
}
JS
```

1. Create the canvas and data. Each country has four observations; two countries
   share each continent.
2. `createLinePlot` assigns positions and `groupBy: "country"` before color.
   Country identifies four paths while continent supplies two colors.
3. The tuple variant uses `groupBy: ["country", "scenario"]` to create eight
   paths. Color represents continent; dash represents observed or projected data.
4. The appearance variant keeps four country paths. `encodeStrokeWidth` maps
   weights to 2, 4, 6, and 8 logical pixels; `encodeOpacity` maps quality to
   0.25, 0.50, 0.75, and 1.00. Each appearance field has one value per country.
5. The program adds the same axes, continent legend, and title for both the
   browser and PNG consumers. The browser registry serves the default variant at
   `examples/browser-host/?chart=series-identity`.

An appearance field with multiple raw values in one series is an error, even
when its scale maps them to the same color. Change the grouping to represent the
intended paths. To return field width or opacity to a constant, use its encoder
with `{ value }`; scalar mark editors reject an active field assignment.

The stable slice at `test/charts/series-identity/` checks source membership,
independent geometry, exact graphics and drawing order, Canvas renderer calls,
and decoded primitive/public pixels for all three variants.
