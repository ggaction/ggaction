# Cars Error Bar

## 목적

Cars dataset의 `Origin`별 평균 `Acceleration`과 95% 신뢰구간을 error bar로 표현하는 첫 composite-rule
vertical slice를 정의한다. 이 차트는 semantic `rule` mark, secondary position endpoint, interval summary,
fixed-pixel cap과 `createErrorBar` hierarchy의 canonical oracle이다.

## Canonical target

- Data: finite `Acceleration`과 non-empty `Origin`을 가진 cars rows
- Independent position: x = nominal `Origin`
- Interval: y = `mean(Acceleration)` with two-sided 95% Student-t confidence interval
- Group order: source first appearance, `USA → Europe → Japan`
- Mark: one vertical main rule and lower/upper horizontal caps per valid group
- Rule appearance: stroke `#4c78a8`, stroke width `2`, solid dash, opacity `1`
- Caps: enabled, `8` logical pixels wide
- Scale: ordinal x and automatic quantitative y with `nice: true`, `zero: false`
- Guides: x/y axes and horizontal grid; no legend for constant stroke
- Axis titles: `Origin` and `mean(Acceleration)` inferred from source/interval provenance
- Canvas: `720×460`, margin `{ top: 90, right: 40, bottom: 70, left: 80 }`
- Title: `Mean Acceleration by Origin`; subtitle: `95% confidence intervals`

The renderer receives only concrete line/text geometry. It never reads the interval transform, error-bar role,
cap size, scale reference or grouping semantics.

## Final user-facing API

```javascript
const program = chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createErrorBar({
    x: {
      field: "Origin",
      fieldType: "nominal"
    },
    y: {
      field: "Acceleration"
    }
  })
  .createGuides()
  .createTitle({
    text: "Mean Acceleration by Origin",
    subtitle: "95% confidence intervals"
  });
```

`id`, `data`, `groupBy`, interval statistic, confidence level, caps and appearance are omitted intentionally.
They resolve respectively to `"errorBar"`, current data, the independent `Origin` field, mean/CI/0.95,
enabled 8px caps and the shared rule appearance defaults. A second error bar must provide an explicit `id`.

## Public parameter contract

```typescript
createErrorBar({
  id?: UserId;
  data?: UserId;
  x: PositionChannel | IntervalChannel;
  y: PositionChannel | IntervalChannel;
  groupBy?: FieldName;
  coordinate?: UserId;
  caps?: boolean;
  capSize?: PositiveFinite;
  stroke?: NonEmptyString;
  strokeWidth?: NonNegativeFinite;
  strokeDash?: DashPattern;
  opacity?: UnitInterval;
}): ChartProgram;
```

Exactly one of `x` and `y` is an interval channel. Statistical interval mode uses `{ field, center?, extent?,
level? }`; explicit mode uses `{ center, lower, upper }`. The other channel is an ordinary positional field.
The independent position field is always included in interval grouping; optional `groupBy` adds another field.

Defaults are:

```text
id          errorBar, only when unique
data        current or unique eligible source
center      mean
extent      ci
level       0.95
coordinate  main Cartesian
caps        true
capSize     8
stroke      #4c78a8
strokeWidth 2
strokeDash  solid
opacity     1
```

## Important action hierarchy

### Statistical vertical error bar

```text
createErrorBar
├─ createIntervalData(errorBarIntervalData)
│  ├─ createDerivedData
│  └─ materializeIntervalData
├─ createRuleMark(errorBar)
├─ encodeX(Origin)
├─ encodeY(interval lower)
├─ encodeY2(interval upper)
├─ encodeStroke(errorBar)
├─ encodeStrokeWidth(errorBar)
├─ encodeStrokeDash(errorBar)
├─ encodeOpacity(errorBar)
├─ createErrorBarCap(lower)?
│  ├─ createRuleMark(errorBarLowerCap)
│  ├─ encodeX(anchor)
│  ├─ encodeY(interval lower)
│  ├─ encodeStroke / encodeStrokeWidth / encodeStrokeDash / encodeOpacity
│  └─ materializeRuleSpan(horizontal, 8px)
└─ createErrorBarCap(upper)?
   ├─ createRuleMark(errorBarUpperCap)
   ├─ encodeX(anchor)
   ├─ encodeY(interval upper)
   ├─ encodeStroke / encodeStrokeWidth / encodeStrokeDash / encodeOpacity
   └─ materializeRuleSpan(horizontal, 8px)
```

Cap creation is conditional on `caps !== false`. The cap layers have ordinary semantic rule identity and
data-space anchors; their perpendicular `capSize` is graphical materialization intent. The aggregate invokes
the real wrapped assignment actions rather than writing their semantic or graphical results directly.

### Explicit interval mode

Explicit mode uses an existing dataset containing center/lower/upper fields and omits `createIntervalData`.
All remaining rule, endpoint, appearance and cap actions are identical.

### Horizontal orientation

If x is the interval channel and y is the independent position, the main rule uses `y + x + x2`. Caps are
vertical fixed-pixel spans. Orientation is inferred from which channel owns the interval and is never passed as
a separate option.

## Stored-result contract

### Semantic state

- Statistical mode stores one immutable derived dataset with source, input field, ordered grouping,
  mean/CI/0.95 convention, generated center/lower/upper fields and concrete rows.
- The representative main layer ID is the resolved error-bar ID. Its semantic mark type is `rule`.
- Main vertical rules share one coordinate and store x, y and y2 encodings; horizontal rules store y, x and x2.
- Secondary endpoints share the primary channel scale and coordinate exactly.
- Cap layers remain ordinary rule layers and reference the same source/derived dataset.
- No `semanticSpec.composites` registry is introduced.

### Graphical state

- Main and cap layers are homogeneous backend-neutral `line` collections.
- Every child has final finite `x1`, `y1`, `x2`, `y2`, stroke, stroke width, dash and opacity.
- Fixed cap size is resolved in logical Canvas pixels before storage.
- Drawing order is grid, main rules, lower caps, upper caps, axes, title.
- Empty/invalid statistical groups create no placeholder line.

### Internal identity

For the omitted canonical owner `errorBar`:

```text
errorBar                  representative main rule
errorBarIntervalData      derived interval rows, statistical mode only
errorBarLowerCap          lower cap rule
errorBarUpperCap          upper cap rule
```

Generated child IDs are deterministic implementation details. Explicit owner IDs use the same suffix rules.

## Visual variants

| Variant | Target capability | Distinct result |
| --- | --- | --- |
| `rule-geometry` | rule mark and endpoint assignments | full-span vertical/horizontal and diagonal concrete rules |
| `baseline` | computed vertical error bar | Origin mean Acceleration with default 95% CI and caps |
| `horizontal` | x/x2 interval orientation | Origin별 mean Horsepower horizontal intervals |
| `explicit-interval` | existing summary fields | no derived data and `caps: false` |
| `styled-caps` | cap/style parameter coverage | custom cap size, stroke, width, dash and opacity |

Each variant keeps independent primitive and user-facing programs. Only `primitive.png` is produced before its
visual Gate; the public action and `user-facing.png` follow approval.

### Horizontal target chain

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createErrorBar({
    x: { field: "Horsepower" },
    y: { field: "Origin", fieldType: "nominal" }
  })
  .createGuides()
  .createTitle({
    text: "Mean Horsepower by Origin",
    subtitle: "95% confidence intervals"
  });
```

### Explicit interval target chain

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: originAccelerationIntervals })
  .createErrorBar({
    x: { field: "Origin", fieldType: "nominal" },
    y: {
      center: "meanAcceleration",
      lower: "lowerAcceleration",
      upper: "upperAcceleration"
    },
    caps: false
  })
  .createGuides();
```

### Styled-cap target chain

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createErrorBar({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" },
    capSize: 16,
    stroke: "#d9485f",
    strokeWidth: 3,
    strokeDash: [8, 4],
    opacity: 0.8
  })
  .createGuides();
```

The `rule-geometry` target is a direct advanced-action program with three explicitly named rule marks so the
second-role ID rule is visible: a datum x-only vertical span, a datum y-only horizontal span and one diagonal
x/y/x2/y2 rule. Its exact expanded chain is owned by the future variant manifest.

## Numeric and behavioral contract

- Mean, sample standard deviation, standard error and Student-t critical value are computed by an independent
  reference fixture that does not import production interval grammar.
- The canonical vertical interval rows are fixed as follows:

| Origin | n | Mean | Lower | Upper |
| --- | ---: | ---: | ---: | ---: |
| USA | 254 | 14.942519685039 | 14.595961849125 | 15.289077520954 |
| Europe | 73 | 16.821917808219 | 16.119418784340 | 17.524416832098 |
| Japan | 79 | 16.172151898734 | 15.734269872553 | 16.610033924915 |

- CI requires enough valid finite samples; an invalid group is omitted rather than replaced by zero.
- Group order follows first appearance and output rows retain all grouping fields needed by position encodings.
- Statistical and explicit modes converge on identical semantic rule bindings and concrete graphics when their
  interval rows are equal.
- Canvas resize, positional scale edit and endpoint reassignment rematerialize main rules and caps completely.
- Validation failure, ambiguous source/target, incompatible endpoint or mid-plan failure leaves the earlier
  program unchanged.

## Scope boundary

- Center point symbols, asymmetric per-row cap sizes and field-driven rule width are not part of Phase 6.
- `encodeY2` support/reassignment for rule marks is implemented here; ranged-area reassignment remains Phase 7.
- `encodeX2` is introduced for horizontal rules here; `encodeXRange` and horizontal ranged areas remain Phase 7.
- Error bands, regression delegation and box plots remain Phases 7–8.
- Multiple independent guides on one channel, interaction, animation and renderer-side semantic inference remain
  out of scope.
