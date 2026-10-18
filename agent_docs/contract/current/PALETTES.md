# Palette vocabulary contract

The internal palette registry is a frozen 68-name vocabulary. External palette-library releases do not
change this list automatically.

```typescript
type PaletteName =
  | "accent"
  | "category10" | "category20" | "category20b" | "category20c"
  | "observable10"
  | "dark2" | "paired" | "pastel1" | "pastel2"
  | "set1" | "set2" | "set3"
  | "tableau10" | "tableau20"
  | "blues" | "tealblues" | "teals" | "greens" | "browns"
  | "oranges" | "reds" | "purples" | "warmgreys" | "greys"
  | "viridis" | "magma" | "inferno" | "plasma" | "cividis" | "turbo"
  | "bluegreen" | "bluepurple"
  | "goldgreen" | "goldorange" | "goldred"
  | "greenblue" | "orangered"
  | "purplebluegreen" | "purpleblue" | "purplered" | "redpurple"
  | "yellowgreenblue" | "yellowgreen" | "yelloworangebrown" | "yelloworangered"
  | "darkblue" | "darkgold" | "darkgreen" | "darkmulti" | "darkred"
  | "lightgreyred" | "lightgreyteal" | "lightmulti" | "lightorange" | "lighttealblue"
  | "blueorange" | "brownbluegreen" | "purplegreen" | "pinkyellowgreen"
  | "purpleorange" | "redblue" | "redgrey"
  | "redyellowblue" | "redyellowgreen" | "spectral"
  | "rainbow" | "sinebow";

type Palette =
  | PaletteName
  | {
      name: PaletteName;
      count?: PositiveInteger;
      extent?: readonly [UnitInterval, UnitInterval];
    };
```

- Palette and explicit color `range` are mutually exclusive.
- Categorical schemes retain their native discrete order. Without `count`, their full native range is resolved.
- Continuous, diverging, and cyclical schemes are sampled as concrete colors for an ordinal domain. Without
  `count`, the resolved domain cardinality is used.
- `count` is a positive integer. Categorical counts shorter than the native range select a prefix; longer counts
  cycle deterministically. Sequential scales require at least two and use it as the concrete gradient-stop count;
  top-level `palette` and `range.palette` resolve identically.
- Continuous color and field-driven stroke declarations use the shared `Palette` type for both
  `scale.palette` and `scale.range: { palette }`, including `count` and `extent`. Explicit color arrays
  still require at least two stops; descriptors and wrappers retain closed property names.
- `extent` is accepted only for non-categorical schemes. Its two endpoints are distinct finite values in
  `[0, 1]`; descending extent reverses sampling direction.
- Scale `reverse` applies after palette resolution, including a descending extent, so two reversals intentionally
  restore the original order.
- `semanticSpec` stores the palette descriptor. `resolvedScales` stores only concrete CSS colors, and marks and
  legends never interpret the scheme name.
- The registry is internal, has no external palette runtime dependency, and exposes no runtime registration API.

## Coverage

- ✅ Covered: all 68 names, exact Set2 order, categorical and continuous family resolution.
- ✅ Covered: ordinal and sequential count, top-level/range descriptor parity, extent, descending extent,
  invalid family options and frozen returned arrays.
- ✅ Covered: color encoding range conflict, ordinal cycling, scale reverse, point fill and legend parity.
- Evidence: `test/unit/grammar/scales/palettes.test.js`,
  `test/unit/actions/encodings/color-encoding.test.js`,
  `test/unit/actions/scales/sequential-palette-count.test.js`,
  `test/contracts/continuous-palette-types.test.js`, and Roadmap 2 cars scatterplot variants.
