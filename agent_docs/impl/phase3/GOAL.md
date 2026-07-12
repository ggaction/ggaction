# Phase 3 Goal — Histogram

## 목표

Cars 데이터의 `Displacement` 분포를 Origin별 stacked histogram으로 표현하는
Chart API와 내부 materialization 연산을 구현한다.

최종 사용자는 다음과 유사한 action chain만으로 chart를 작성할 수 있어야 한다.

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 }
  })
  .createData({ id: "cars", values: cars })
  .createBarMark({ id: "bars" })
  .encodeHistogram({
    field: "Displacement",
    maxBins: 7,
    xScale: {
      nice: true,
      zero: false
    }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .createGuides({
    legend: { position: "bottom" }
  })
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  });
```

`createGuides`는 applicable한 horizontal grid를 기본으로 생성한다. 따라서 목표
chart는 별도 grid option 없이 horizontal grid를 가진다.

## 진행 상태

- [x] Primitive histogram contract
- [ ] `createBarMark`
- [ ] Bar binned `encodeX`
- [ ] Bar count/stack `encodeY`
- [ ] Histogram rect materialization
- [ ] Bar `encodeColor`
- [ ] Atomic `encodeHistogram`
- [ ] Histogram axes
- [ ] Horizontal/vertical grid
- [ ] `createGuides` default horizontal grid
- [ ] Bottom bar legend
- [ ] Centered title
- [ ] Browser example, tutorial, PNG regression
- [ ] 사용자 문서와 LLM reference

## Semantic 목표

Histogram layer는 다음 의미를 저장한다.

```javascript
{
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
```

Bin, count, stack은 semantic 의미다. 계산된 bin 경계, count, 누적 위치와 rect
좌표는 graphical 결과다. Source dataset은 변경하지 않는다.

## Histogram 규칙

- `field`는 finite quantitative 값이어야 한다.
- `maxBins`는 positive integer이며 기본값은 `10`이다.
- Explicit x domain이 없으면 field 값에서 domain을 추론한다.
- `nice`는 automatic domain과 bin 경계에 적용한다.
- Explicit domain은 `nice`와 `zero`보다 우선한다.
- Bin은 `[start, end)`이며 마지막 bin만 최대값을 포함한다.
- Color가 없으면 bin마다 rect 하나를 생성한다.
- Color가 있으면 `bin × category`별 rect를 생성한다.
- Category 순서는 ordinal color domain 순서를 사용한다.
- `stack: "zero"`는 각 bin에서 category count를 0부터 누적한다.
- y domain은 개별 category count가 아니라 bin별 누적 총 count를 사용한다.

## Encoding 구현

### Explicit channel API

먼저 다음 형태를 구현하고 별도 progression program으로 보존한다.

```javascript
.createBarMark({ id: "bars" })
.encodeX({
  field: "Displacement",
  bin: { maxBins: 7 },
  scale: { nice: true, zero: false }
})
.encodeY({
  field: "Displacement",
  aggregate: "count",
  stack: "zero"
})
```

```text
encodeX
├─ bin semantic 저장
├─ coordinate 연결
└─ x scale 생성

encodeY
├─ count/stack semantic 저장
├─ y scale 생성
└─ rematerializeBarMark
```

### Atomic histogram API

```javascript
encodeHistogram({
  field,
  target?,
  maxBins = 10,
  stack = "zero",
  xScale?,
  yScale?
})
```

```text
encodeHistogram
├─ encodeX(bin)
└─ encodeY(count, stack)
```

`encodeHistogram`은 binning, count, stacking을 다시 구현하지 않고 검증된 wrapped
`encodeX`와 `encodeY`를 호출한다.

## Graphical 목표

`createBarMark`는 초기 empty rect collection을 만든다.

```javascript
{
  type: "rect",
  children: []
}
```

Histogram materialization 이후 각 rect는 backend-neutral concrete 값만 가진다.

```javascript
{
  x,
  y,
  width,
  height,
  fill,
  stroke,
  strokeWidth
}
```

Dataset field, bin instruction, scale expression, count, stack instruction은
`graphicSpec`에 남지 않는다. Canvas, scale, histogram encoding, color 변경 시
연결된 scale과 rect를 명시적으로 rematerialize한다.

## Grid API

Horizontal과 vertical grid를 모두 지원한다.

```javascript
createGrid({
  horizontal?,
  vertical?
})
```

기본값은 다음과 같다.

```javascript
{
  horizontal: true,
  vertical: false
}
```

각 방향은 boolean 또는 option object를 받는다.

```javascript
.createGrid({
  horizontal: {
    color: "#e2e8f0",
    lineWidth: 1,
    strokeDash: []
  },
  vertical: true
})
```

방향별 동작은 다음과 같다.

```javascript
.createGrid();
// horizontal만 생성

.createGrid({ vertical: true });
// horizontal + vertical 생성

.createGrid({ horizontal: false, vertical: true });
// vertical만 생성

.createGuides({ grid: false });
// grid 전체 비활성화
```

방향과 scale의 관계:

```text
horizontal grid → y scale과 y tick 사용
vertical grid   → x scale과 x tick 사용
```

Semantic guide는 생성된 방향만 저장한다.

```javascript
guides: {
  grid: {
    horizontal: {
      scale: "y",
      coordinate: "main"
    },
    vertical: {
      scale: "x",
      coordinate: "main"
    }
  }
}
```

각 방향의 option은 다음과 같다.

```javascript
{
  scale?,
  count?,
  values?,
  color?,
  lineWidth?,
  strokeDash?
}
```

`count`와 `values`는 동시에 사용할 수 없다. 기본 appearance는 다음과 같다.

```javascript
{
  color: "#e2e8f0",
  lineWidth: 1,
  strokeDash: []
}
```

## Grid action 구조

```text
createGrid
├─ createHorizontalGrid?
└─ createVerticalGrid?
```

각 방향은 wrapped component action이다.

```text
createHorizontalGrid
├─ editSemantic
├─ createGraphics(horizontalGridLines)
└─ editHorizontalGrid
```

Vertical도 같은 구조를 사용한다. Grid graphics는 mark보다 먼저 렌더링되도록
`graphicSpec.order`를 명시적으로 조절한다.

## `createGuides`

새 기본 action 구조는 다음과 같다.

```text
createGuides
├─ createAxes
├─ createGrid       // default horizontal
└─ createLegend?
```

API:

```javascript
createGuides({
  axes?,
  grid?,
  legend?
})
```

규칙:

- `grid` 생략은 applicable한 horizontal grid를 자동 생성한다.
- `grid: {}`는 horizontal grid를 명시적으로 생성한다.
- `grid: false`는 grid 전체를 생성하지 않는다.
- `grid: { vertical: true }`는 horizontal과 vertical을 생성한다.
- Horizontal grid는 y encoding이 있을 때 applicable하다.
- Vertical grid는 명시적으로 요청할 때 생성한다.
- Axis가 존재하면 grid가 axis tick 값을 공유한다.
- Axis가 없으면 같은 scale tick resolver로 tick을 계산한다.

기존 scatterplot과 line chart에서 `createGuides()`를 호출하면 horizontal grid가
추가된다. 기존 progression program과 test는 유지하되 새로운 default 결과를
명시적으로 검증한다.

## Legend

Histogram legend는 bar color channel 하나를 표현한다.

- Symbol은 rect다.
- Category 순서는 color scale domain 순서를 따른다.
- 초기 위치는 `"bottom"`이다.
- Items는 horizontal layout으로 배치한다.
- 기존 line-series legend 동작은 유지한다.
- `createLegend`가 target mark type에 따라 line 또는 rect symbol을 선택한다.

## Title

기존 chart title action을 그대로 사용한다.

```javascript
.createTitle({
  text: "Displacement distribution",
  subtitle: "by country",
  align: "center"
})
```

## Progression programs

```text
carsHistogramPrimitives.js
carsHistogramEncodings.js
carsHistogramActions.js
```

- `Primitives`: raw semantic/graphic histogram contract
- `Encodings`: explicit `encodeX` + `encodeY`
- `Actions`: atomic `encodeHistogram`과 최종 high-level API

각 program의 acceptance test와 PNG test를 보존한다.

## 구현 순서

1. Primitive histogram contract와 PNG를 고정한다.
2. `createBarMark`를 구현한다.
3. Bar `encodeX({ bin })`을 구현한다.
4. Bar `encodeY({ aggregate: "count", stack: "zero" })`를 구현한다.
5. Rect materialization과 Canvas rematerialization을 구현한다.
6. Explicit x/y encoding progression을 보존한다.
7. Bar `encodeColor`와 stacked rect rematerialization을 구현한다.
8. `encodeHistogram`을 기존 encodeX/Y 조합으로 구현한다.
9. 최종 actions progression에서 encodeX/Y를 `encodeHistogram`으로 교체한다.
10. Histogram axes와 `count(field)` title inference를 연결한다.
11. Horizontal/vertical `createGrid`를 구현한다.
12. `createGuides`에 default horizontal grid를 결합한다.
13. Bottom rect legend를 구현한다.
14. Center title, browser example, tutorial, PNG regression을 완성한다.

## 완료 조건

- `encodeHistogram` 하나로 bin/count/zero-stack 의미가 생성된다.
- Origin별 stacked rect가 정확히 materialize된다.
- x/y axes와 `count(Displacement)` title이 생성된다.
- Horizontal grid가 기본으로 생성된다.
- Vertical grid를 선택적으로 켤 수 있다.
- Grid 전체 또는 각 방향을 끌 수 있다.
- Grid가 mark보다 뒤에 렌더링된다.
- Bottom rect legend와 centered title이 생성된다.
- Canvas 변경 후 rect, axes, grid, legend, title이 일관되게 갱신된다.
- Primitive와 explicit encoding progression이 보존된다.
- 기존 scatterplot과 line-chart test 및 PNG가 유지된다.
- Browser Canvas와 고해상도 PNG 결과를 확인한다.
- 관련 Chart API 문서와 tutorial을 함께 갱신한다.
