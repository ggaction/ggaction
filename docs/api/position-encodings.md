---
layout: default
title: Position Encodings
---

# Position Encodings

## Point `encodeX(options)` and `encodeY(options)`

Map a quantitative field to concrete point positions.

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | point mark ID | current mark |
| `fieldType` | `"quantitative"` | `"quantitative"` |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale` | continuous scale options | channel defaults |

```javascript
program.encodeX({
  field: "Horsepower",
  scale: { domain: [0, 250] }
});
```

Automatic domains combine fields that share a scale. Automatic ranges use the
current plot bounds; y runs bottom-to-top. Every encoded point value must be
finite.

x/y encodings ensure a Cartesian coordinate exists and attach it to the layer.
An explicitly selected coordinate is created if missing. A conflicting layer
coordinate or non-Cartesian coordinate produces an error.

## Binned bar `encodeX(options)`

Create a quantitative histogram bin encoding and resolve its horizontal scale.

```javascript
program.encodeX({
  field: "Displacement",
  bin: { maxBins: 10 },
  scale: { nice: true, zero: false }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | bar mark ID | current mark |
| `fieldType` | `"quantitative"` | `"quantitative"` |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `bin` | `{ maxBins? }` | required |
| `bin.maxBins` | positive integer | `10` |
| `scale.id` | scale ID | `"x"` |
| `scale.type` | `"linear"` | `"linear"` |
| `scale.domain` | `"auto"` or two ascending finite numbers | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | `true` |
| `scale.zero` | boolean | `false` |

Automatic nice bins use `1, 2, 3, 5 × 10ⁿ` steps and never exceed
`maxBins`. An explicit domain is kept exactly and takes precedence over
`nice` and `zero`. The resolved x domain spans bin boundaries, while the
automatic range uses current plot bounds.

This action intentionally leaves the bar's rect collection empty. Bar y
count/stack encoding and automatic rectangle materialization are not yet
implemented.

## Temporal line `encodeX(options)`

Map a temporal field to the horizontal position scale of a line mark.

```javascript
program.encodeX({
  field: "Year",
  fieldType: "temporal",
  scale: { nice: true }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | line mark ID | current mark |
| `fieldType` | `"temporal"` | required for line marks |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale.id` | scale ID | `"x"` |
| `scale.type` | `"time"` | `"time"` |
| `scale.domain` | `"auto"` or two finite timestamps | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | omitted |

Temporal fields contain parseable date strings or finite timestamps. Values
are normalized to timestamps for scale resolution without changing the source
dataset. The path remains empty until y and any series grouping are known.

## Aggregate line `encodeY(options)`

After temporal x is encoded, aggregate a quantitative field and materialize a
renderable line.

```javascript
program.encodeY({
  field: "Acceleration",
  aggregate: "mean",
  scale: { nice: true, zero: false }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | line mark ID | current mark |
| `fieldType` | `"quantitative"` | `"quantitative"` |
| `aggregate` | `"mean"` | required for line marks |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale.id` | scale ID | `"y"` |
| `scale.type` | `"linear"` | `"linear"` |
| `scale.domain` | `"auto"` or two finite numbers | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | omitted |
| `scale.zero` | boolean | omitted |

The source dataset remains unchanged. The action groups by encoded
non-aggregate fields, computes each mean, and sorts every series by temporal x.
Automatic y domains use aggregate means rather than raw rows.

See [Scale options](./scales.md) for domain and range precedence.
