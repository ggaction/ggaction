# Phase 2 Goal — Line Chart

## 목표

Cars 데이터로 시간에 따른 평균 가속도 추세를 Origin별 line series로 표현하는
ggaction Chart API와 내부 materialization 연산을 구현한다.

최종 사용자는 다음과 유사한 action chain만으로 chart를 작성할 수 있어야 한다.

```javascript
chart()
  .createCanvas(...)
  .createData({ id: "cars", values: cars })
  .createLineMark({ id: "trends" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    fieldType: "quantitative",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .encodeStrokeDash({
    field: "Origin",
    fieldType: "nominal"
  })
  .createGuides({
    axes: {
      y: { title: { text: "mean(Acceleration)" } }
    },
    legend: { title: "Origin" }
  })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });
```

## 진행 상태

- [ ] Line mark와 series별 concrete path graphics
- [ ] Temporal x encoding과 scale
- [ ] Quantitative mean aggregation
- [ ] Series grouping과 시간순 정렬
- [ ] Color와 strokeDash encoding
- [ ] Line chart axes
- [ ] Combined series legend
- [ ] Chart title과 subtitle
- [ ] `createGuides` aggregate action
- [ ] Canvas와 고해상도 PNG rendering
- [ ] 사용자 문서와 LLM reference

## Semantic 목표

- `createLineMark`는 semantic `line` mark를 생성한다.
- x는 temporal `Year`, y는 quantitative `Acceleration`을 기록한다.
- y encoding은 `aggregate: "mean"`을 semantic intent로 저장한다.
- 비집계 encoding을 기준으로 `Year × Origin` group을 구성한다.
- Origin은 color와 strokeDash 두 channel에 동일한 series identity로 저장된다.
- 각 line series는 temporal x 값으로 정렬된다.
- 추론된 scale과 coordinate ID/type은 `semanticSpec`에 명시적으로 남는다.

Source dataset은 immutable하며 aggregation 결과가 원본 값을 교체해서는 안 된다.

## Scale 규칙

- Temporal position scale과 quantitative linear scale을 지원한다.
- `nice`와 `zero`는 automatic domain을 결정하는 semantic option이다.
- Temporal scale은 `nice`를 지원하지만 `zero`는 허용하지 않는다.
- StrokeDash는 nominal ordinal scale과 concrete dash pattern을 사용한다.

우선순위는 다음과 같다.

```text
explicit domain > nice / zero > inferred domain
explicit range  > inferred range
```

- Explicit domain이 있으면 `nice`와 `zero`는 domain을 수정하지 않는다.
- Explicit range는 automatic range만 대체한다.
- Explicit range와 automatic domain을 함께 사용하면 `nice`와 `zero`는 여전히
  domain에 적용된다.

## Graphical 목표

- 각 series를 정렬된 concrete point 배열을 가진 하나의 graphical path로
  materialize한다.
- 모든 path는 최종 `points`, stroke color, strokeWidth, strokeDash를 가진다.
- Canvas renderer는 `graphicSpec`만 읽어 solid/dashed path를 렌더링한다.
- Dataset, field, scale expression, aggregation instruction은 `graphicSpec`에 남지
  않는다.
- Semantic 또는 scale 변경은 관련된 모든 path와 guide consumer를 wrapped
  action으로 명시적으로 rematerialize한다.

## Guides와 title

`createGuides`는 guide만 조합한다.

```text
createGuides
├─ createAxes
└─ createLegend
```

- Axis는 line chart의 temporal/quantitative scale을 사용한다.
- Color와 strokeDash가 같은 field/domain을 사용하면 하나의 series legend로
  합친다.
- Legend item은 concrete line symbol에 color와 dash pattern을 함께 적용한다.
- Phase 2 초기 범위는 combined series legend 하나만 지원한다.

Title은 guide가 아니며 별도의 chart-level action이다.

```text
createTitle
├─ title text graphic
└─ subtitle text graphic
```

## 구현 원칙

- 기존 scatterplot API와 결과를 깨뜨리지 않는다.
- 모든 public action은 하나의 option object를 받고 새 immutable
  `ChartProgram`을 반환한다.
- 의미를 처음 도입하는 action이 inference와 semantic 저장을 책임진다.
- Aggregate action은 의미 있는 wrapped child action을 호출한다.
- 여러 mark, scale, coordinate 후보가 모호하면 명시적 ID를 요구한다.
- Renderer는 semantic state를 읽거나 자동 compilation을 수행하지 않는다.

## 완료 조건

- 별도 line-chart user program이 helper 없이 Chart API chain만 사용한다.
- 목표 chart의 semanticSpec, graphicSpec, trace, immutability가 test로 검증된다.
- Color와 strokeDash가 결합된 Origin legend가 렌더링된다.
- Title과 subtitle이 chart-level graphics로 렌더링된다.
- Browser Canvas와 고해상도 PNG 결과를 직접 확인한다.
- 기존 Phase 1 test와 scatterplot PNG가 유지된다.
- 관련 Chart API 문서, action reference, supported features, `llms.txt`를 함께
  갱신한다.
