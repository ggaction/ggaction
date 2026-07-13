# Density Area Chart 구현 계약

## 목표

Cars dataset의 `Acceleration` 분포를 Origin별 Gaussian kernel density estimate(KDE)로
계산하고, 세 density를 하나의 Cartesian coordinate에 겹친 area chart로 표현한다.

- Source field: `Acceleration`
- Group field: `Origin`
- Derived value field: `Acceleration_value`
- Derived density field: `Acceleration_density`
- Bandwidth: `0.6`
- Mark: semantic `area`, graphical closed `path`
- Color: Origin nominal scale, `tableau10`
- Guides: x/y axes, horizontal/vertical grids, top categorical legend
- Title: `Distribution of Acceleration`
- Subtitle: `By Origin (cars dataset)`

초기 범위는 probability density만 지원한다. Cumulative density, smoothed counts, stacked
density, weighted KDE와 2D KDE는 제외한다.

## 최종 user-facing API

```javascript
const program = chart()
  .createCanvas({
    width: 720,
    height: 500,
    margin: { top: 130, right: 40, bottom: 70, left: 80 }
  })
  .createData({ id: "cars", values: cars })
  .createAreaMark({ id: "densities", opacity: 0.5 })
  .encodeDensity({
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.6
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .createGuides({
    grid: {
      horizontal: {},
      vertical: {}
    },
    legend: {
      position: "top",
      direction: "vertical",
      columns: 3,
      offset: 8
    }
  })
  .createTitle({
    text: "Distribution of Acceleration",
    subtitle: "By Origin (cars dataset)"
  });
```

`createAreaMark`는 current dataset인 `cars`를 임시 source로 가진다. `encodeDensity`는
derived density dataset을 만들고 target area layer를 그 dataset에 명시적으로 다시
연결한다. 사용자는 derived dataset ID나 output field를 보통 지정하지 않는다.

## `encodeDensity` 계약

```javascript
encodeDensity({
  field,
  target?,
  source?,
  groupBy?,
  bandwidth?,
  extent?,
  steps?,
  as?,
  densityChannel?
})
```

| Option | 의미 | 기본값 |
| --- | --- | --- |
| `field` | KDE를 계산할 quantitative source field | 필수 |
| `target` | semantic area mark ID | current 또는 유일한 eligible area |
| `source` | source dataset ID | target area의 현재 dataset |
| `groupBy` | 하나의 nominal grouping field | 생략 시 ungrouped density |
| `bandwidth` | Gaussian kernel standard deviation | Scott rule 기반 auto |
| `extent` | shared sampling `[min, max]` | 전체 유효 source value extent |
| `steps` | 정확한 uniform sample 개수 | `100` |
| `as` | `[valueField, densityField]` | `<field>_value`, `<field>_density` |
| `densityChannel` | density를 배치할 positional channel | `"y"` |

초기 `densityChannel` vocabulary는 `"x" | "y"`다.

```text
densityChannel: "y"                  densityChannel: "x"
x = <field>_value                    x = <field>_density
y = <field>_density                  y = <field>_value
area baseline = y density 0          area baseline = x density 0
```

`steps`는 2 이상의 정수이고 `extent`는 서로 다른 두 finite number다. `bandwidth`는
positive finite number이며 생략하면 source values로부터 한 번 결정한 값을 transform
metadata에 저장한다. Grouped density는 항상 하나의 shared extent와 sample grid를
사용한다. Group 순서는 source의 first appearance order다.

## Density 계산 계약

각 group의 유효한 값 `x_i`와 bandwidth `h`에 대해 Gaussian KDE를 계산한다.

```text
K(u) = exp(-u² / 2) / sqrt(2π)
f(x) = sum(K((x - x_i) / h)) / (n * h)
```

- `field`가 finite number인 row만 사용한다.
- Grouped mode에서는 유효한 non-empty group value도 요구한다.
- 전체 유효 source extent에서 `steps`개의 inclusive uniform sample을 만든다.
- 모든 group은 같은 sample values를 사용한다.
- 각 output row는 group field, value field, density field를 가진다.
- Group 순서와 각 group 내부의 value 오름차순을 보존한다.
- Source values와 caller-owned rows는 수정하지 않는다.

공식 Vega-Lite density transform의 Gaussian bandwidth, observed extent, shared grouped
resolution 방향을 참고하되, 초기 ggaction은 adaptive min/max steps 대신 명시적인
chart-independent default `steps: 100`을 사용한다.

## Scale resolution 기본값

- Value scale은 shared sampling extent를 그대로 domain으로 사용한다(`nice: false`,
  `zero: false`).
- Density scale은 반드시 zero를 포함하고 계산된 최대 density를 readable boundary로
  올림한다(`nice: true`, `zero: true`).
- Value와 density ranges는 선택된 `densityChannel`과 Canvas plot bounds에서 결정한다.
- Explicit scale domain/range가 이후 지원될 때에는 이 자동 규칙보다 우선한다.

## 중요한 action hierarchy

```text
encodeDensity
├─ createDensityData
│  ├─ createDerivedData
│  └─ materializeDensityData
├─ editSemantic(layer data binding)
├─ encodeX
├─ encodeY
├─ encodeGroup?                 # groupBy가 있을 때
└─ rematerializeAreaMark
```

`editSemantic(layer data binding)`은 target area가 newly derived dataset을 읽도록 하는
명시적인 wrapped primitive child다. 별도의 일반-purpose data-binding public action은
이번 범위에서 만들지 않는다.

```text
encodeColor(area)
├─ editSemantic
├─ createScale
├─ rematerializeScale
└─ rematerializeAreaMark
```

```text
createGuides
├─ createAxes
├─ createGrid
└─ createLegend
   └─ createCategoricalLegend
```

## Semantic 결과 계약

Density dataset은 source 관계, transform provenance와 materialized values를 가진다.

```javascript
{
  id: "densitiesDensityData",
  source: "cars",
  transform: [{
    type: "density",
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.6,
    extent: "auto",
    steps: 100,
    as: ["Acceleration_value", "Acceleration_density"],
    resolve: "shared"
  }],
  values: [/* immutable density rows */]
}
```

Default y-density layer는 다음 encoding을 가진다.

```javascript
{
  id: "densities",
  data: "densitiesDensityData",
  coordinate: "main",
  mark: { type: "area" },
  encoding: {
    x: {
      field: "Acceleration_value",
      fieldType: "quantitative",
      scale: "x"
    },
    y: {
      field: "Acceleration_density",
      fieldType: "quantitative",
      scale: "y"
    },
    group: { field: "Origin", fieldType: "nominal" },
    color: { field: "Origin", fieldType: "nominal", scale: "color" }
  }
}
```

Density channel scale은 zero를 포함한다. Value channel은 derived sample extent를 domain으로
사용한다. Color와 group field는 동일해야 하며, color scale의 domain order를 area paths와
legend가 함께 사용한다.

## Graphical 결과 계약

`densities` graphic은 Origin마다 하나의 concrete closed path를 가진다.

```javascript
{
  id: "densities",
  type: "path",
  children: [
    {
      id: "densities:0",
      properties: {
        points: [/* baseline start, density samples, baseline end */],
        closed: true,
        fill: "#4c78a8",
        opacity: 0.5
      }
    }
  ]
}
```

`densityChannel: "y"`는 first/last value의 `y=0` graphical coordinate로 path를 닫고,
`"x"`는 first/last value의 `x=0` coordinate로 닫는다. Renderer는 path가 density에서
왔다는 사실을 알지 못하며 concrete points, fill, opacity만 읽는다.

Concrete order는 다음과 같다.

```text
canvas
→ horizontal grid
→ vertical grid
→ density areas
→ x/y axes
→ top legend
→ chart title/subtitle
```

## Top legend 계약

- Area color legend의 default symbol은 swatch다.
- `position: "top"`은 plot bounds 위에 legend block을 배치한다.
- `offset`은 legend block과 plot top 사이의 non-negative gap이다.
- `columns`는 positive integer이며 생략 시 item count다.
- `direction: "horizontal"`은 row-major, `"vertical"`은 column-major로 item을 채운다.
- 이 차트는 3 items와 3 columns이므로 두 direction의 최종 한 줄 배치는 같지만 stored
  layout option과 trace argument는 명시적으로 보존한다.
- Title은 Canvas top에서 독립적으로 배치되고 legend는 plot 바로 위에 배치된다.
- Top margin이 title, subtitle, legend, offset을 수용하지 못하면 명확한 layout error를
  발생시킨다. Margin을 자동 변경하지 않는다.

## Rematerialization 계약

- Canvas width/height/margin 변경: x/y scales, density paths, axes, grid, legend, title
- Density transform option 변경 또는 재생성: derived values, both scales, paths, guides
- Area color scale 변경: all area fills와 legend symbols
- Density channel 변경: positional encoding, baseline orientation, axes, grid

각 변경 action이 affected consumer를 wrapped action으로 명시적으로 다시 materialize한다.
Semantic-to-graphic 자동 compiler는 두지 않는다.

## 제외 범위

- CDF와 smoothed counts
- Stacked density
- Multiple group fields
- Weighted KDE와 2D KDE
- Interactive bandwidth/selection
- Gradient area fill
- Automatic Canvas margin expansion
- Top point/size composite legends
