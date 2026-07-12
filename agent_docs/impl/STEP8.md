# STEP 8 — Axis Line Actions

## 목표

가장 하위 guide component인 x/y axis line을 domain action으로 생성하고,
endpoint를 resolved scale과 Canvas bounds에서 추론한다.

```javascript
.createXAxisLine()
.createYAxisLine()
```

## 진행 상태

- [x] Axis line option과 position validation
- [x] Axis line geometry inference
- [x] `editXAxisLine`
- [x] `editYAxisLine`
- [x] `createXAxisLine`
- [x] `createYAxisLine`
- [ ] Scale·Canvas 변경 시 rematerialization
- [ ] `carsScatterplotActions`의 수동 axis line 제거
- [ ] Unit, trace, immutability test
- [ ] Acceptance 및 PNG render test
- [ ] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
createXAxisLine({ scale?, position?, color?, lineWidth? });
createYAxisLine({ scale?, position?, color?, lineWidth? });
```

기본값은 x축 `{ scale: "x", position: "bottom", color: "#334155",
lineWidth: 1 }`, y축 `{ scale: "y", position: "left", color: "#334155",
lineWidth: 1 }`이다. STEP8에서는 parameter를 노출하지만 x는 `bottom`, y는
`left`만 지원한다.

```javascript
editXAxisLine({ position?, color?, lineWidth? });
editYAxisLine({ position?, color?, lineWidth? });
```

## Geometry 추론

```text
x axis: x1/x2 = resolved x range, y1/y2 = bounds bottom
y axis: y1/y2 = resolved y range, x1/x2 = bounds left
```

Data를 다시 읽지 않는다. Scale, resolved numeric range, Canvas bounds가 없으면
silent no-op 대신 error를 발생시킨다.

## Action 분해

```text
createXAxisLine
├─ editSemantic(guide.axis.x.scale = x)
├─ createGraphics(id = xAxisLine, type = line)
└─ editXAxisLine
   ├─ editGraphics(x1, y1, x2, y2)
   ├─ editGraphics(stroke = color)
   └─ editGraphics(strokeWidth = lineWidth)
```

Y축도 같은 구조를 사용한다. Position, endpoint와 style은 graphical
appearance/layout이며 semantic guide에는 scale reference만 저장한다.

## Rematerialization

`rematerializeScale`은 연결된 axis line이 있으면 해당 edit action을 호출한다.
`editCanvas`도 bounds 변경 시 axis line을 명시적으로 다시 계산한다. Explicit
range여도 orthogonal baseline이 바뀔 수 있으므로 guide geometry는 갱신한다.

## Validation

- Scale ID와 해당 channel consumer가 존재해야 한다.
- Scale이 materialize되어 있고 range가 finite number 2개여야 한다.
- Canvas bounds가 존재해야 한다.
- x position은 `bottom`, y position은 `left`만 허용한다.
- color는 non-empty string, lineWidth는 non-negative finite number다.
- Create는 duplicate를, edit은 missing graphic을 거절한다.
- Unknown option을 거절한다.

## 구현 순서

1. Option, scale, bounds와 geometry inference를 구현한다.
2. x/y edit action과 create action을 구현한다.
3. Scale과 Canvas rematerialization에 axis line 갱신을 연결한다.
4. 대표 프로그램의 수동 x/y axis line을 교체한다.
5. 영어 사용자 문서, 전체 테스트, PNG와 브라우저 검증을 완료한다.

## 제외 범위

- top/right position
- Tick, label, title와 grid
- Color legend
- `createXAxis`, `createYAxis`, `createAxes`, `createGuides`

## 완료 조건

- Axis endpoint가 scale과 bounds로부터 추론된다.
- 사용자 코드가 endpoint를 직접 계산하지 않는다.
- Style이 concrete line property로 변환된다.
- Scale과 Canvas 변경 후 오래된 axis geometry가 남지 않는다.
- Trace에 create → edit → primitive 구조가 나타난다.
- 기존 scatterplot과 동일한 고해상도 결과가 생성된다.
