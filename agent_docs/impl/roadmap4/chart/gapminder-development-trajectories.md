# Gapminder development trajectories

## 상태

`planned` — Roadmap 4 Phase 7의 primitive-first visual contract다. Exact path-order API는 P7-A에서 승인한다.

## 차트 목표

Gapminder의 China, South Africa와 United States가 1955–2005년에 fertility와 life expectancy 공간에서 이동한
궤적을 그린다. x/y는 각 관측의 위치를 나타내고 `year`는 같은 국가 안에서 점을 연결할 시간 순서를 나타낸다.
China의 1960년 기대수명 급락과 회복, South Africa의 후기 역전처럼 x만 정렬하면 훼손되는 경로를 보존한다.

## 목표 user-facing API

```javascript
const program = chart()
  .createCanvas({
    width: 760,
    height: 500,
    margin: { top: 85, right: 170, bottom: 80, left: 85 }
  })
  .createData({ values: trajectoryRows })
  .createLineMark({ id: "trajectories", strokeWidth: 3 })
  .encodeX({
    target: "trajectories",
    field: "fertility",
    scale: { domain: [1, 7], zero: false }
  })
  .encodeY({
    target: "trajectories",
    field: "life_expect",
    scale: { domain: [25, 85], zero: false }
  })
  .encodeColor({
    target: "trajectories",
    field: "country",
    fieldType: "nominal",
    scale: {
      domain: ["China", "South Africa", "United States"],
      range: ["#e45756", "#4c78a8", "#54a24b"]
    }
  })
  .encodePathOrder({
    target: "trajectories",
    field: "year",
    order: "ascending"
  })
  .createGuides({
    axes: {
      x: { title: { text: "Fertility" } },
      y: { title: { text: "Life expectancy" } }
    },
    grid: { horizontal: true, vertical: true },
    legend: { title: "Country", position: "right" }
  })
  .createTitle({
    text: "Development Trajectories",
    subtitle: "Fertility and life expectancy, 1955–2005"
  });
```

## 의미와 concrete 구조

- Source는 세 국가의 11개 관측씩 총 33개 row를 소유한다.
- `color`가 국가별 series를 만들고 `pathOrder`가 각 series 안에서 year ascending을 적용한다.
- Repeated position 또는 order tie가 있어도 row를 합치지 않으며 tie는 source order를 유지한다.
- `graphicSpec`은 국가별 한 path와 chronological commands만 저장한다. Year scale/axis/legend는 만들지 않는다.
- Grid는 path 뒤가 아니라 아래에, axes/legend/title은 위에 그린다.

## 목표 action hierarchy

```text
encodePathOrder
├─ editSemantic(layer[trajectories].encoding.pathOrder.*)
└─ rematerializeLineMark
```

```text
removePathOrder
├─ editSemantic(remove layer[trajectories].encoding.pathOrder)
└─ rematerializeLineMark
```

## 검증 계약

- Production source를 import하지 않는 stable per-series sort oracle와 literal Gapminder anchors
- Shuffled input에서도 year ascending, repeated order의 source-order tie와 33-row conservation
- Primitive chronological commands와 automatic x-sort commands가 실제로 다름
- Public implementation 뒤 primitive/public semantic, graphics, draw order, Canvas calls와 PNG exact parity
- Reassignment/removal, action order independence, invalid field atomicity와 previous-program immutability
- Ordinary ranged area 동작과 aggregate/generated/Polar incompatibility errors
