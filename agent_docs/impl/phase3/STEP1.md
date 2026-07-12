# STEP 1 — Primitive Histogram

## 목표

기존에 구현된 안정적인 chart action은 재사용하고, Phase 3에서 새로 도입하는
histogram semantic과 graphical contract를 primitive action으로 완성한다.

재사용하는 기존 action:

```javascript
createCanvas()
createData()
createTitle()
```

Histogram-specific state는 다음 primitive로 직접 작성한다.

```javascript
editSemantic()
createGraphics()
editGraphics()
```

## 진행 상태

- [x] Primitive histogram program/test skeleton
- [x] Deterministic histogram values helper
- [x] Histogram semantic path와 primitive validation
- [x] Bar/bin/count/stack semantic state
- [x] Concrete stacked rect collection
- [x] Raw x/y axes
- [x] Raw horizontal grid
- [x] Raw bottom rect legend
- [x] Existing centered `createTitle` 적용
- [x] Acceptance test와 immutability 검증
- [x] 2× PNG regression과 직접 확인
- [x] 기존 test와 PNG regression 유지

## 제외 범위

STEP1에서는 다음 신규 high-level action을 구현하지 않는다.

- `createBarMark`
- Bar용 `encodeX`
- Bar용 `encodeY`
- `encodeHistogram`
- Bar용 `encodeColor`
- `createGrid`
- Bottom bar `createLegend`
- Histogram용 `createGuides`

이 action들은 STEP2 이후 primitive block을 순서대로 대체한다.

## Program 구조

```javascript
chart()
  .createCanvas(...)
  .createData({ id: "cars", values: validCars })
  .editSemantic(/* bar mark */)
  .editSemantic(/* x field, bin, scale */)
  .editSemantic(/* y field, count, stack, scale */)
  .editSemantic(/* color field and scale */)
  .editSemantic(/* coordinate and guides */)
  .createGraphics(/* horizontal grid */)
  .editGraphics(...)
  .createGraphics(/* stacked bars */)
  .editGraphics(...)
  .createGraphics(/* raw axes */)
  .editGraphics(...)
  .createGraphics(/* raw bottom legend */)
  .editGraphics(...)
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  });
```

하나의 명시적인 method chain을 사용한다. Histogram primitive 호출을 batching
helper나 syntactic sugar 뒤에 숨기지 않는다.

## 생성 파일

```text
test/programs/carsHistogramValues.js
test/programs/carsHistogramPrimitives.js
test/acceptance/cars-histogram-primitives.test.js
test/render/cars-histogram-primitives.test.js
```

PNG output은 기존 규칙대로 gitignored `test/output/`에 생성한다.

```text
test/output/cars-histogram-primitives.png
```

## Values helper

`carsHistogramValues.js`는 library implementation이 아니라 primitive contract를
위한 deterministic fixture helper다.

입력:

```javascript
createCarsHistogramValues(cars, {
  width,
  height,
  margin,
  maxBins
})
```

계산 순서:

```text
valid Displacement/Origin rows
→ quantitative extent와 nice bin boundaries
→ Origin domain
→ bin × Origin counts
→ zero-stack start/end
→ x/y scale domain과 concrete range
→ rect x/y/width/height
→ axis ticks, labels, titles
→ horizontal grid positions
→ bottom legend positions
```

규칙:

- `Displacement`는 finite number여야 한다.
- `Origin`은 non-empty string이어야 한다.
- `maxBins`는 positive integer다.
- Nice bin step은 deterministic해야 하며 bin 수가 `maxBins`를 넘지 않는다.
- Bin은 `[start, end)`이고 마지막 bin만 maximum을 포함한다.
- Origin 순서는 valid row의 first appearance order다.
- 각 bin 안에서 Origin domain 순서대로 count를 0부터 누적한다.
- Count가 0인 category는 graphical rect를 생성하지 않는다.
- y domain은 `[0, maximum stacked bin total]`이다.
- Source row를 수정하거나 aggregate row로 교체하지 않는다.

Fixture helper가 만든 모든 좌표는 concrete graphical 값이다. Library action이
fixture helper를 import하거나 호출해서는 안 된다.

## Semantic contract

```javascript
{
  datasets: [
    { id: "cars", values: [...] }
  ],
  layers: [
    {
      id: "bars",
      data: "cars",
      coordinate: "main",
      mark: { type: "bar" },
      encoding: {
        x: {
          field: "Displacement",
          fieldType: "quantitative",
          bin: { maxBins: 7 },
          scale: "x"
        },
        y: {
          field: "Displacement",
          fieldType: "quantitative",
          aggregate: "count",
          stack: "zero",
          scale: "y"
        },
        color: {
          field: "Origin",
          fieldType: "nominal",
          scale: "color"
        }
      }
    }
  ],
  scales: [
    {
      id: "x",
      type: "linear",
      domain: "auto",
      range: "auto",
      nice: true,
      zero: false
    },
    {
      id: "y",
      type: "linear",
      domain: "auto",
      range: "auto",
      zero: true
    },
    {
      id: "color",
      type: "ordinal",
      domain: "auto",
      range: { palette: "tableau10" }
    }
  ],
  coordinates: [
    { id: "main", type: "cartesian" }
  ],
  guides: {
    axis: {
      x: {
        scale: "x",
        coordinate: "main",
        title: "Displacement"
      },
      y: {
        scale: "y",
        coordinate: "main",
        title: "count(Displacement)"
      }
    },
    grid: {
      horizontal: {
        scale: "y",
        coordinate: "main"
      }
    },
    legend: {
      color: {
        scale: "color",
        title: "Origin"
      }
    }
  },
  title: {
    text: "Displacement distribution",
    subtitle: "by country"
  }
}
```

## Primitive semantic schema 확장

`editSemantic`이 다음 path를 검증하고 저장할 수 있어야 한다.

```text
layer[bars].encoding.x.bin.maxBins
layer[bars].encoding.y.aggregate
layer[bars].encoding.y.stack

guide.grid.horizontal.scale
guide.grid.horizontal.coordinate
guide.grid.vertical.scale
guide.grid.vertical.coordinate
```

검증 규칙:

- `bin.maxBins`: positive integer
- `aggregate`: 기존 `"mean"`과 신규 `"count"`
- `stack`: 초기에는 `"zero"`
- Grid scale과 coordinate: valid user-defined ID
- Unknown path와 value는 기존 primitive 정책대로 즉시 오류

`bar` mark type과 `rect` graphic/renderer는 이미 지원되므로 STEP1에서는 기존
validation과 collection rendering을 재사용하고 regression test로 확인한다.

## Graphic contract

### Order

```text
canvas
horizontalGridLines
bars
xAxisLine
xAxisTicks
xAxisLabels
xAxisTitle
yAxisLine
yAxisTicks
yAxisLabels
yAxisTitle
colorLegendSymbols
colorLegendLabels
colorLegendTitle
chartTitle
chartSubtitle
```

Grid graphic을 bars보다 먼저 생성하여 Canvas renderer가 grid를 뒤에 그린다.

### Bar collection

```javascript
{
  type: "rect",
  children: [
    {
      id: "bars:0",
      properties: {
        x,
        y,
        width,
        height,
        fill,
        stroke,
        strokeWidth
      }
    }
  ]
}
```

- Rect 순서는 bin ascending, 그 안에서 Origin domain 순서다.
- Width는 mapped bin start/end의 차이다.
- y와 height는 stack start/end를 y scale에 mapping한 결과다.
- Fill은 Origin color scale의 concrete 값이다.
- Dataset field, count, bin index, stack instruction은 graphic property에 남기지
  않는다.

### Grid

- STEP1 목표 chart에는 horizontal grid만 생성한다.
- Grid y 위치는 y-axis tick 위치와 일치한다.
- 각 line은 plot bounds의 left에서 right까지 이어진다.
- 기본 appearance는 `#e2e8f0`, lineWidth `1`, solid dash다.

### Bottom legend

- Symbol은 concrete rect collection이다.
- Item 순서는 Origin color domain 순서다.
- Items는 plot 아래에서 horizontal layout으로 배치한다.
- Label은 symbol 오른쪽에 배치한다.
- Legend title은 `Origin`이다.

## Acceptance test

다음을 검증한다.

- Exact histogram semanticSpec
- Dataset과 caller input immutability
- Bin 수가 `maxBins` 이하인지
- Bin boundary의 ascending/non-overlap
- Origin domain과 rect ordering
- 각 rect의 finite x/y/width/height
- 각 bin에서 stack이 0부터 연속적으로 누적되는지
- Bin별 rect count 합이 source row count와 일치하는지
- y domain이 maximum stacked total을 포함하는지
- Horizontal grid와 y tick 위치가 일치하는지
- Grid가 bars보다 먼저 오는 graphical order
- Vertical grid가 존재하지 않는지
- Bottom legend symbol/label/title
- Centered title/subtitle
- Top-level에 Phase 3 high-level action이 존재하지 않는지
- Renderer가 semanticSpec 없이 graphicSpec만으로 같은 draw call을 만드는지
- Program state와 collection children이 frozen인지

## Trace 허용 범위

Top-level action은 다음만 사용한다.

```text
createCanvas
createData
editSemantic
createGraphics
editGraphics
createTitle
```

`createTitle`의 기존 wrapped child trace는 그대로 허용한다. 다음 action은 STEP1
trace에 존재하면 안 된다.

```text
createBarMark
encodeX
encodeY
encodeHistogram
createGrid
createLegend
createGuides
```

## 구현 순서

1. STEP1 program, acceptance, render test skeleton을 먼저 작성한다.
2. `carsHistogramValues`의 deterministic contract를 작성한다.
3. Histogram semantic path와 primitive validation을 확장한다.
4. Semantic primitive chain을 작성한다.
5. Grid, stacked rect, axes, bottom legend graphic chain을 작성한다.
6. 기존 `createTitle({ align: "center" })`를 연결한다.
7. Acceptance test에서 semantic, graphic, trace, immutability를 고정한다.
8. 2× PNG를 생성하고 layout, stack, grid, legend, title을 직접 확인한다.
9. 전체 unit/acceptance test와 기존 PNG regression을 실행한다.

## 완료 조건

- Primitive program만으로 목표 histogram이 완전히 렌더링된다.
- Horizontal grid가 bars 뒤에 렌더링된다.
- Origin별 zero-stack과 bottom rect legend가 정확하다.
- Centered title/subtitle이 기존 action으로 생성된다.
- Histogram semantic/graphic contract가 acceptance test로 고정된다.
- 2× PNG를 직접 확인한다.
- 기존 scatterplot과 line-chart program/test/PNG를 변경하지 않는다.
- STEP1 진행 상태와 검증 결과가 문서에 반영된다.
- 변경이 하나의 conceptual commit으로 push된다.

## 검증 결과

- Unit/acceptance: 215 tests passed
- PNG regression: 6 tests passed
- 신규 output: `test/output/cars-histogram-primitives.png` (2×, 1440×920)
- 직접 확인: stacked bars, horizontal grid, raw axes, bottom legend,
  centered title/subtitle의 layout과 graphical order 확인
