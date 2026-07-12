# STEP 1 — Primitive Line Chart Contract

## 목표

Phase 2 최종 목표인 Origin별 평균 Acceleration line chart를 primitive action으로
완성하고 테스트한다.

`createCanvas`와 `createData`는 기존 Chart API를 재사용한다. 그 이후의 line
mark, encoding, scale, coordinate, axis, legend, title은 `editSemantic`,
`createGraphics`, `editGraphics`만으로 명시적으로 작성한다.

Aggregation, grouping, sorting, scale, tick, layout 계산은 이번 STEP에서 test
helper가 미리 수행한다. 이 primitive program을 이후 domain action 구현의
acceptance contract로 사용한다.

## 진행 상태

- [ ] 최종 semanticSpec contract
- [ ] Primitive semantic path와 value validation 확장
- [ ] Cars line-chart 값 계산 helper
- [ ] Concrete line segment와 strokeDash rendering
- [ ] Primitive x/y axes
- [ ] Primitive combined series legend
- [ ] Primitive chart title과 subtitle
- [ ] 별도 user program과 acceptance test
- [ ] 고해상도 PNG render test
- [ ] 브라우저 결과 확인
- [ ] 관련 영어 primitive/rendering 문서

## 목표 chart

```text
The trend of acceleration by year
from 1970 to 1982

mean(Acceleration)
  │       ───── USA
  │   - - - - - Japan
  │       ····· Europe
  └──────────────────── Year

Legend: Origin별 color + strokeDash line symbol
```

- Dataset: `cars`
- Mark: semantic `line`
- x: `Year`, temporal
- y: `Acceleration`, quantitative, `mean`
- Series: `Origin`
- Appearance: Origin별 color와 strokeDash
- Guides: x/y axis와 combined series legend
- Annotation: chart title과 subtitle

## Semantic contract

Primitive program은 다음 구조를 생성해야 한다.

```javascript
{
  datasets: [
    { id: "cars", values: [...] }
  ],
  layers: [
    {
      id: "trends",
      data: "cars",
      coordinate: "main",
      mark: { type: "line" },
      encoding: {
        x: {
          field: "Year",
          fieldType: "temporal",
          scale: "x"
        },
        y: {
          field: "Acceleration",
          fieldType: "quantitative",
          aggregate: "mean",
          scale: "y"
        },
        color: {
          field: "Origin",
          fieldType: "nominal",
          scale: "color"
        },
        strokeDash: {
          field: "Origin",
          fieldType: "nominal",
          scale: "strokeDash"
        }
      }
    }
  ],
  scales: [
    {
      id: "x",
      type: "time",
      domain: "auto",
      range: "auto",
      nice: true
    },
    {
      id: "y",
      type: "linear",
      domain: "auto",
      range: "auto",
      nice: true,
      zero: false
    },
    {
      id: "color",
      type: "ordinal",
      domain: "auto",
      range: { palette: "tableau10" }
    },
    {
      id: "strokeDash",
      type: "ordinal",
      domain: "auto",
      range: "auto"
    }
  ],
  coordinates: [
    { id: "main", type: "cartesian" }
  ],
  guides: {
    axis: {
      x: { scale: "x", coordinate: "main", title: "Year" },
      y: {
        scale: "y",
        coordinate: "main",
        title: "mean(Acceleration)"
      }
    },
    legend: {
      series: {
        channels: ["color", "strokeDash"],
        scales: ["color", "strokeDash"],
        title: "Origin"
      }
    }
  },
  title: {
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  }
}
```

이 contract를 위해 primitive semantic grammar에 다음 path를 추가한다.

```text
layer[id].encoding.y.aggregate
layer[id].encoding.strokeDash.field
layer[id].encoding.strokeDash.datum
layer[id].encoding.strokeDash.fieldType
layer[id].encoding.strokeDash.scale

scale[id].nice
scale[id].zero

guide.legend.series.channels
guide.legend.series.scales
guide.legend.series.title

title.text
title.subtitle
```

Closed vocabulary를 검증한다.

- field type: `temporal`, `quantitative`, `nominal`
- aggregate: `mean`
- scale type: `time`, `linear`, `ordinal`
- legend channel: `color`, `strokeDash`
- `nice`, `zero`: boolean

Title text와 subtitle은 chart meaning이므로 semantic에 저장한다. Font, 위치,
색상은 concrete graphics에만 저장한다.

## Test helper

`test/programs/carsLineChartValues.js`는 다음 값을 사전 계산한다.

1. Year, Acceleration, Origin이 유효한 row를 선택한다.
2. Year를 temporal value로 정규화한다.
3. `Year × Origin`별 `mean(Acceleration)`을 계산한다.
4. Origin별 series로 grouping한다.
5. 각 series를 Year 오름차순으로 정렬한다.
6. x/y domain과 range를 계산한다.
7. 인접 point pair를 concrete segment로 변환한다.
8. Origin별 color와 dash pattern을 결정한다.
9. axis tick value, position, label을 계산한다.
10. legend와 title의 concrete layout 값을 계산한다.

Helper는 test와 example만을 위한 임시 계산 계층이다. Library source에 import하거나
public API로 노출하지 않는다.

## Graphical contract

Line series는 하나의 homogeneous segment collection으로 저장한다.

```javascript
trends: {
  type: "line",
  children: [
    {
      id: "trends:0",
      properties: {
        x1: 70,
        y1: 180,
        x2: 115,
        y2: 165,
        stroke: "#4c78a8",
        strokeWidth: 2,
        strokeDash: []
      }
    }
  ]
}
```

`line.strokeDash`는 non-negative finite number 배열이다.

```text
[]        -> solid
[6, 4]    -> dashed
[2, 3]    -> dotted
```

Canvas renderer는 각 line을 그리기 전에 `setLineDash(strokeDash)`를 호출한다.
Line별 dash state가 다음 graphic으로 누출되지 않도록 빈 배열도 명시적으로
적용한다.

Top-level graphic은 최소한 다음 역할별 ID를 사용한다.

```text
canvas
trends
xAxisLine, yAxisLine
xAxisTicks, yAxisTicks
xAxisLabels, yAxisLabels
xAxisTitle, yAxisTitle
seriesLegendSymbols
seriesLegendLabels
seriesLegendTitle
chartTitle
chartSubtitle
```

모든 node는 최종 좌표, 문자열, color, font, dash 값을 가진다. Renderer는
aggregation, scale, grouping, layout을 수행하지 않는다.

## Primitive user program

`test/programs/carsLineChartPrimitives.js`에 하나의 explicit chain을 작성한다.

```text
chart()
├─ createCanvas
├─ createData
├─ editSemantic(line mark and data)
├─ editSemantic(encodings)
├─ editSemantic(scales and coordinate)
├─ editSemantic(axes, legend, title)
├─ createGraphics(trends, line collection)
├─ editGraphics(all concrete segment properties)
├─ createGraphics/editGraphics(axis graphics)
├─ createGraphics/editGraphics(legend graphics)
└─ createGraphics/editGraphics(title graphics)
```

Primitive 호출을 batching helper나 syntactic sugar로 숨기지 않는다. 계산된 값만
helper에서 받아오고, authoring action sequence는 user program 파일에 그대로
드러나야 한다.

## 구현 순서

1. 최종 semanticSpec과 graphicSpec expectation을 acceptance test에 작성한다.
2. 필요한 semantic path와 closed-vocabulary validation을 확장한다.
3. `line.strokeDash` schema, primitive validation, mock Canvas, renderer를 구현한다.
4. Cars aggregation, grouping, sorting, scale, layout helper를 구현한다.
5. Primitive line series를 작성하고 segment rendering을 검증한다.
6. Primitive x/y axis를 추가한다.
7. Primitive combined legend를 추가한다.
8. Primitive title과 subtitle을 추가한다.
9. 전체 semantic/graphic/trace/immutability acceptance test를 활성화한다.
10. 고해상도 PNG test와 브라우저 example을 추가하고 직접 확인한다.
11. 관련 영어 extension/rendering 문서를 갱신한다.

각 conceptual change는 관련 test와 문서를 포함해 별도 commit으로 push한다.

## 테스트

### Unit

- temporal/aggregate/strokeDash semantic path
- time scale type과 `nice`/`zero` validation
- combined legend와 title semantic path
- strokeDash property validation
- solid/dashed line collection Canvas rendering
- aggregation, grouping, sorting, segment 계산 helper
- caller input과 이전 program immutability

### Acceptance

- 최종 semanticSpec 전체 구조
- Origin별 series와 segment 수
- 모든 segment의 concrete 좌표, color, dash
- axis tick/label/title graphics
- combined legend symbol/label/title graphics
- chart title/subtitle graphics
- top-level primitive trace 순서와 빈 action stack
- renderer가 semanticSpec, context, trace를 읽지 않음

### Render

- `test/output/cars-line-chart-primitives.png`
- `pixelRatio: 2`
- logical Canvas와 physical PNG 크기 검증
- 기존 Phase 1 PNG regression 유지

## 제외 범위

- `createLineMark`
- Library 내부 aggregation과 transform action
- Temporal/aggregate encoding domain action
- `encodeStrokeDash`
- Line consumer scale rematerialization
- `createLegend`, `createGuides`, `createTitle`
- Line chart용 high-level axis 확장
- SVG renderer

## 완료 조건

- Primitive chain만으로 GOAL의 line chart 전체가 렌더링된다.
- semanticSpec이 최종 Phase 2 specification contract를 표현한다.
- graphicSpec이 모든 segment, axis, legend, title을 완전히 materialize한다.
- Combined legend가 color와 strokeDash를 하나의 symbol에 표현한다.
- Canvas와 2× PNG에서 line chart가 정상적으로 보인다.
- Browser console warning/error가 없다.
- 모든 Phase 1 test와 PNG가 변경 없이 통과한다.
- STEP1의 모든 변경이 commit/push되고 worktree가 clean하다.
