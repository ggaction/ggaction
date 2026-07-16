# Gapminder Transformed Scale Variants

## 목적

Gapminder dataset으로 transformed quantitative position, UTC temporal position, explicit discrete position,
discretized color와 continuous-color bar를 검증하는 Phase 10 canonical variant family를 정의한다. 이 family는
scale type별 pure mapping, `editScale` type transition, shared-consumer rematerialization과 guide behavior의
visual oracle이다.

## 공통 계약

- Temporal token은 `time` 하나뿐이며 normalization, nice, ticks와 labels는 항상 UTC다.
- Category position은 width가 필요한 bar에서 `band`, center만 필요한 point/line에서 `point`를 사용한다.
- `ordinal`은 color, shape와 stroke-dash 같은 discrete appearance lookup만 소유한다.
- Explicit domain/range가 automatic inference와 nice/zero보다 우선한다.
- `editScale({ type })`는 complete next definition과 모든 consumer를 preflight한 뒤 atomic하게 semantic scale,
  resolved scale, marks와 guides를 갱신한다.
- Renderer는 resolved coordinate, color, gradient stop과 text만 읽고 scale type을 해석하지 않는다.

## Gate A — transformed scatterplot

- Data: Gapminder rows with `year === 2005`
- x: `pop`, quantitative log base 10
- y: `fertility`, quantitative sqrt
- color: `life_expect`, quantitative sequential `viridis`
- point: circle, radius 4, opacity 0.72, white 0.6px outline
- Canvas: `456×312`, margin `{ top: 57.6, right: 90, bottom: 43.2, left: 50.4 }`
- Guides: x/y axes, horizontal and vertical grids, right gradient legend
- Title: `Population, Fertility, and Life Expectancy`; subtitle: `Gapminder countries in 2005 · log population scale`

### Target public chain

```javascript
const program = chart()
  .createCanvas({
    width: 456,
    height: 312,
    margin: { top: 57.6, right: 90, bottom: 43.2, left: 50.4 }
  })
  .createData({ values: gapminder })
  .filterData({
    id: "gapminder2005",
    field: "year",
    predicate: { op: "eq", value: 2005 }
  })
  .createPointMark()
  .encodeX({
    field: "pop",
    fieldType: "quantitative",
    scale: { type: "log", base: 10, nice: true }
  })
  .encodeY({
    field: "fertility",
    fieldType: "quantitative",
    scale: { type: "sqrt", nice: true, zero: false }
  })
  .encodeColor({
    field: "life_expect",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  })
  .encodeRadius({ value: 4 })
  .editPointMark({ opacity: 0.72, stroke: "#ffffff", strokeWidth: 0.6 })
  .createGuides({
    axes: {
      x: {
        ticksAndLabels: {
          ticks: { length: 3.6, color: "#334155" },
          labels: { offset: 8.4, fontSize: 11 }
        },
        title: { text: "Population", offset: 31.2 }
      },
      y: {
        ticksAndLabels: {
          ticks: { length: 3.6, color: "#334155" },
          labels: { offset: 7.2, fontSize: 11 }
        },
        title: { text: "Fertility", offset: 36 }
      }
    },
    grid: { horizontal: {}, vertical: {} },
    legend: {
      title: "Life expectancy",
      offset: 21.6,
      gradient: { length: 132, thickness: 9.6 },
      labels: { offset: 7.2, fontSize: 11 },
      titleStyle: { fontSize: 10 }
    }
  })
  .createTitle({
    text: "Population, Fertility, and Life Expectancy",
    subtitle: "Gapminder countries in 2005 · log population scale",
    offset: -6,
    gap: 4.8,
    titleStyle: { fontSize: 16, fontWeight: 700 },
    subtitleStyle: { fontSize: 10 }
  });
```

`pow`, zero-crossing `symlog`, alternate log bases and invalid log domains receive independent exact fixtures.
Only visually distinct representative classes require PNG variants.

## Gate B — temporal and discrete position

Gapminder country/year subsets compare `band` bar slots, `point` series centers and UTC `time` positions. Exact
fixtures cover bandwidth, padding, point centers, year/date normalization, nice boundaries, ticks and Canvas resize.

### Target public chains

Band는 bar의 slot width와 같은 category의 point center를 함께 소유한다. 새 point layer는 유일한 기존 bar
layer에서 data, coordinate, x/y field와 scale을 추론하고, x-axis도 shared band scale `x`를 사용한다.

```javascript
const bandPoint = chart()
  .createCanvas({
    width: 456,
    height: 312,
    margin: { top: 58, right: 22, bottom: 54, left: 70 }
  })
  .createData({ values: gapminder })
  .filterData({
    id: "gapminder2005",
    field: "year",
    predicate: { op: "eq", value: 2005 }
  })
  .filterData({
    id: "selectedCountries",
    field: "country",
    oneOf: ["Chile", "Cuba", "Egypt", "Japan", "Kenya", "Peru"]
  })
  .createBarMark()
  .encodeX({
    field: "country",
    fieldType: "nominal",
    scale: {
      type: "band",
      paddingInner: 0.2,
      paddingOuter: 0.1,
      align: 0.5
    }
  })
  .encodeY({
    field: "pop",
    aggregate: "mean",
    scale: { nice: true, zero: true }
  })
  .encodeBarWidth({ band: 0.72 })
  .editBarMark({ fill: "#cbd5e1" })
  .createPointMark()
  .encodeRadius({ value: 5 })
  .editPointMark({ stroke: "white", strokeWidth: 1 })
  .createGuides({
    axes: {
      x: { scale: "x", title: { text: "Country" } },
      y: { scale: "y", title: { text: "Population" } }
    },
    grid: { horizontal: {}, vertical: false },
    legend: false
  })
  .createTitle({
    text: "Population by Country",
    subtitle: "Band slots with aligned point centers · 2005"
  });
```

Temporal input은 numeric four-digit year와 supported calendar string을 UTC timestamp로 normalize한다. `time`
scale의 domain nice, tick positions와 labels도 모두 UTC 기준이다.

```javascript
const timeSeries = chart()
  .createCanvas({
    width: 456,
    height: 312,
    margin: { top: 58, right: 126, bottom: 54, left: 50 }
  })
  .createData({ values: gapminder })
  .filterData({
    id: "selectedCountries",
    field: "country",
    oneOf: ["Afghanistan", "China", "United States"]
  })
  .createLineMark({ strokeWidth: 3 })
  .encodeX({
    field: "year",
    fieldType: "temporal",
    scale: { type: "time", nice: true }
  })
  .encodeY({
    field: "life_expect",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "country",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Year" } },
      y: { title: { text: "Life expectancy" } }
    },
    grid: { horizontal: {}, vertical: false },
    legend: { title: "Country" }
  })
  .createTitle({
    text: "Life Expectancy over Time",
    subtitle: "UTC year positions · 1955–2005"
  });
```

## Gate C — discretized color

The Gate A scatterplot is recolored with representative `quantize`, `quantile` and `threshold` definitions. Exact
fixtures own class boundaries and interval labels; representative PNGs verify concrete colors and discrete legends.

## Gate D — continuous-color bars

A filtered Gapminder country bar chart uses aggregate population for height and color. Matching color/measure fields
inherit the measure aggregate; another quantitative color field requires explicit `aggregate`. A sequential scale
and gradient legend rematerialize together after scale and Canvas edits.

## Scale and edit contract

```typescript
type ScaleType =
  | "linear" | "log" | "pow" | "sqrt" | "symlog"
  | "time"
  | "ordinal" | "band" | "point"
  | "sequential" | "quantize" | "quantile" | "threshold";

editScale({
  id?: UserId;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly unknown[];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  unknown?: unknown;
  base?: PositiveFiniteExceptOne;
  exponent?: PositiveFinite;
  constant?: PositiveFinite;
}): ChartProgram;
```

Type transition preserves domain/range only when valid for the next type, removes old type-only parameters, persists
new resolved defaults and rejects incompatible consumers before state changes. `unknown` does not add a domain member.

## 완료 조건

- Four Gates preserve independent primitive/public pairs and exact target call chains.
- Every scale type, parameter, policy, precedence and invalid boundary has direct executable evidence.
- Type edits and Canvas edits rematerialize all registered consumers deterministically and preserve earlier programs.
- Types, docs, contracts, architecture, gallery, CI and Pages match the implementation.
