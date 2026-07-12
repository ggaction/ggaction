# STEP 7 — Combined Series Legend

## 목표

Line chart의 color와 strokeDash encoding을 읽어 combined series legend를
생성한다. 일반적인 경우 인자 없이 target, channels, scales, domain, title을
추론한다.

```javascript
.createLegend()
```

## 진행 상태

- [ ] `createLegend` option과 target inference
- [ ] Color/strokeDash channel 결합 규칙
- [ ] Scale domain compatibility validation
- [ ] Semantic series guide 저장
- [ ] Legend symbol collection
- [ ] Legend label collection
- [ ] Legend title graphic
- [ ] Optional background/border rect
- [ ] Wrapped legend rematerialization actions
- [ ] Canvas 변경 시 legend layout 갱신
- [ ] 별도 actions program의 raw legend block 제거
- [ ] Unit, acceptance, PNG regression
- [ ] 영어 Legend/action/LLM 문서 갱신

## API

```javascript
createLegend({
  target?,
  channels?,
  position?,
  title?,
  symbol?,
  labels?,
  titleStyle?,
  itemGap?,
  border?
})
```

기본값:

```javascript
{
  position: "right",
  symbol: { length: 32, lineWidth: 2 },
  labels: {
    offset: 10,
    color: "#334155",
    fontSize: 12,
    fontFamily: "sans-serif",
    fontWeight: "normal"
  },
  titleStyle: {
    color: "#334155",
    fontSize: 13,
    fontFamily: "sans-serif",
    fontWeight: 600
  },
  itemGap: 28,
  border: false
}
```

초기 범위에서 position은 `right`만 지원한다.

## Target과 channel 추론

- Explicit `target`은 존재하는 semantic line mark여야 한다.
- 생략하면 current mark를 먼저 사용하고, 결정할 수 없으면 series encoding이
  있는 line mark를 검색한다.
- 후보가 하나면 사용하고 여러 개면 explicit target을 요구한다.
- `channels` 기본값은 target에 존재하는 `color`, `strokeDash` 순서다.
- Explicit channels는 non-empty, unique, supported여야 하며 target에 실제로
  존재해야 한다.
- Point legend는 STEP7에서 제외한다.

Target ID는 inference 입력일 뿐이다. 최종 guide 의미는 persisted channel과 scale
ID로 완전히 결정되므로 semantic guide에 target을 별도로 저장하지 않는다.

## Combined legend 규칙

선택된 channel은 같은 field를 사용해야 한다.

```text
color.field      = Origin
strokeDash.field = Origin
→ combined 가능
```

Scale은 모두 ordinal이고 resolved domain이 존재해야 한다. Domain 값과 순서가
완전히 같아야 하며 empty domain은 오류다. Color와 dash range는 서로 달라도 된다.

## Semantic 결과

```javascript
guides: {
  legend: {
    series: {
      channels: ["color", "strokeDash"],
      scales: ["color", "strokeDash"],
      title: "Origin"
    }
  }
}
```

Explicit title이 없으면 공통 field 이름을 사용한다.

## Action 구조

```text
createLegend
├─ editSemantic(legend.series.channels)
├─ editSemantic(legend.series.scales)
├─ editSemantic(legend.series.title)
├─ createLegendBackground?  // border on
├─ createLegendSymbols
├─ createLegendLabels
└─ createLegendTitle
```

각 component action도 wrapped action이다.

```text
createLegendSymbols
├─ createGraphics(seriesLegendSymbols, line, length)
└─ editLegendSymbols
```

Labels, title, background도 같은 create → edit 구조를 사용한다.

## Border

기본값은 `false`이며 background graphic 자체를 생성하지 않는다.

```javascript
border: true
```

은 다음과 같다.

```javascript
{
  color: "#cbd5e1",
  lineWidth: 1,
  padding: 12,
  background: "transparent"
}
```

Object로 일부 또는 전부를 override할 수 있다. Border가 켜지면
`seriesLegendBackground` rect를 다른 legend graphics보다 먼저 생성해 drawing
order상 뒤에 둔다. Border는 appearance이므로 semanticSpec에 저장하지 않는다.

## Layout

```text
plotRight  = bounds.x + bounds.width
symbolX1   = plotRight + 30
symbolX2   = symbolX1 + symbol.length
labelX     = symbolX2 + labels.offset
titleX     = symbolX1
titleY     = bounds.y + 20
firstItemY = bounds.y + 52
itemY      = firstItemY + index × itemGap
```

Border가 켜지면:

```text
backgroundX      = symbolX1 - padding
backgroundY      = bounds.y + 8
backgroundWidth  = canvas.width - backgroundX - padding
backgroundHeight = lastItemY - backgroundY + padding
```

Runtime text measurement는 사용하지 않는다. 사용 가능한 right-margin 영역을
기준으로 backend-neutral bounds를 만들며 width/height가 양수가 아니면 오류다.

## Materialization

- Color channel은 resolved scale로 symbol stroke를 만든다.
- Color가 없으면 default `#4c78a8`을 사용한다.
- StrokeDash channel은 resolved scale로 symbol dash를 만든다.
- StrokeDash가 없으면 solid `[]`를 사용한다.
- Label text와 item 순서는 shared resolved domain을 따른다.
- Title과 label은 concrete text graphics다.

## Rematerialization

Private legend config에는 layout/appearance option을 저장한다. Semantic 의미는
`semanticSpec.guides.legend.series`에 저장한다.

```text
rematerializeLegend
├─ editLegendBackground? 
├─ editLegendSymbols
├─ editLegendLabels
└─ editLegendTitle
```

Canvas width/margin, 연결된 scale, encoding/domain 변경에서 명시적으로 호출한다.
Canvas 변경 중 legend는 한 번만 rematerialize한다.

## Test program

STEP1 primitive line program과 test는 변경하지 않는다. `carsLineChartActions`에서
다음을 제거한다.

- `guide.legend.series.*` raw semantic edits
- `seriesLegendSymbols`, `seriesLegendLabels`, `seriesLegendTitle` raw graphics
- `legendY`, `seriesStrokeDashes`, legend helper 접근

다음 하나로 교체한다.

```javascript
.createLegend()
```

기본 chart는 border를 사용하지 않으므로 background rect를 생성하지 않는다.

## 구현 순서

1. Legend option, target/channel inference, field/domain validation을 구현한다.
2. Legend layout과 private config update를 구현한다.
3. Symbol create/edit actions를 구현한다.
4. Label create/edit actions를 구현한다.
5. Title create/edit actions를 구현한다.
6. Optional background create/edit actions를 구현한다.
7. Aggregate `createLegend`와 `rematerializeLegend`를 구현한다.
8. Canvas와 연결된 semantic/scale 변경의 rematerialization을 연결한다.
9. Actions program의 raw legend block을 `.createLegend()`로 교체한다.
10. Unit, acceptance, PNG regression과 영어 문서를 갱신한다.

## 제외 범위

- Point mark legend
- 서로 다른 field의 multidimensional legend
- Multiple legends
- Top, bottom, left position
- Interactive legend
- Runtime text measurement
- Public aggregate `editLegend`
- `createGuides`

## 완료 조건

- `.createLegend()`만으로 Origin combined legend가 생성된다.
- Symbol에 color와 dash가 동시에 적용된다.
- Semantic guide에 channels, scales, title이 저장된다.
- Border off에서 rect가 없고 border on에서 background가 가장 먼저 생성된다.
- Canvas 변경 후 legend와 border layout이 갱신된다.
- Actions program에서 raw legend code가 제거된다.
- Primitive line program과 scatterplot 결과가 유지된다.
- 관련 test와 문서가 통과하고 변경이 commit/push된다.
