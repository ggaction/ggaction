# Choose how numeric time inputs are interpreted

The [public program](./program.js) uses the same two source values, `1000` and
`2000`, for all three [variants](./data.js). Run from the repository root after
`npm install`:

```sh
node --input-type=module <<'JS'
import { createTemporalInput } from "./examples/temporal-input/program.js";
import { cases } from "./examples/temporal-input/data.js";
import { renderToPNG } from "./src/renderers/png.js";
for (const variant of cases) {
  await renderToPNG(createTemporalInput(variant), {
    output: `.artifacts/examples/temporal-input/${variant.id}.png`
  });
}
JS
```

1. Create the canvas and original numeric data.
2. `createScatterPlot` forwards `x.temporalUnit` to its lower `encodeX` action.
   `timestamp` means Unix milliseconds: the events are one second apart in 1970.
   `year` places them at UTC January 1 in years 1000 and 2000. Explicit `auto`
   retains the existing four-digit numeric year interpretation.
3. Axis tick values are already normalized timestamps. They are not interpreted
   again with the input unit. `nice: false` keeps the exact observed domain.
4. The source rows remain unchanged. Channel selectors read normalized values;
   raw-field selectors still read the original numbers.

The same-field reassignment preserves an explicit unit if omitted. A different
field or a field-to-datum change without a unit returns to automatic parsing.
Non-temporal bindings reject `temporalUnit`. Explicit timestamp mode accepts
finite numbers in the Date range, never numeric strings or seconds inference.

For calendar bucketing, `createTimeUnitData({ field: "time", temporalUnit:
"timestamp", unit: "second", as: "bucket", id: "seconds" })` keeps input units
separate from bucket units. Bind the generated `bucket` field using
`fieldType: "temporal", temporalUnit: "timestamp"`.

The browser registry serves `examples/browser-host/?chart=temporal-input`.
`test/charts/temporal-input/` compares all three public programs with independently
normalized primitive inputs, exact graphics, draw order, Canvas calls and decoded
PNG pixels from the same run.
