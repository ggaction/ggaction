# STEP 2 — Line, Text와 수동 Axis

## 목표

`line`과 `text` graphical primitive를 Canvas renderer에 추가한다.

`createGraphics`와 `editGraphics`만 사용해 scatterplot의 x/y axis, ticks,
labels, titles를 직접 그린다. Scale이나 guide에 의한 자동 생성은 아직
구현하지 않는다.

## 구현 범위

1. **`line` graphic을 지원한다.**
   - `x1`, `y1`, `x2`, `y2`
   - `stroke`, `strokeWidth`, `opacity`
   - 단일 line과 line collection 렌더링
2. **`text` graphic을 지원한다.**
   - `x`, `y`, `text`
   - `fill`, `opacity`
   - `fontSize`, `fontFamily`, `fontWeight`
   - `textAlign`, `textBaseline`
   - y축 title을 위한 `rotation`
   - 단일 text와 text collection 렌더링
3. **수동 axis를 작성한다.**
   - x/y axis line
   - x/y tick line
   - x/y tick label
   - x/y axis title
   - 모든 좌표와 문자열은 test program에서 미리 계산
4. **기존 scatterplot을 확장한다.**
   - label 공간을 포함하도록 plot 범위 조정
   - 기존 392개 circle과 axis를 함께 렌더링
   - 브라우저와 PNG 결과 확인

## 예상 프로그램 구조

```text
ChartProgram
├─ editSemantic(dataset)
├─ editSemantic(point mark)
├─ createGraphics(canvas)
├─ editGraphics(canvas properties)
├─ createGraphics(xAxis, line)
├─ editGraphics(xAxis properties)
├─ createGraphics(yAxis, line)
├─ editGraphics(yAxis properties)
├─ createGraphics(xTicks, line, length)
├─ editGraphics(xTicks properties)
├─ createGraphics(yTicks, line, length)
├─ editGraphics(yTicks properties)
├─ createGraphics(points, circle, length)
├─ editGraphics(point properties)
├─ createGraphics(xLabels, text, length)
├─ editGraphics(xLabels properties)
├─ createGraphics(yLabels, text, length)
├─ editGraphics(yLabels properties)
├─ createGraphics(xTitle, text)
├─ editGraphics(xTitle properties)
├─ createGraphics(yTitle, text)
└─ editGraphics(yTitle properties)
```

## 구현 순서

1. `line` property validation과 Canvas rendering을 구현하고 unit test한다.
2. `text` property validation과 Canvas rendering을 구현하고 unit test한다.
3. test program에서 axis 좌표와 label 문자열을 미리 계산한다.
4. cars scatterplot program에 axis, ticks, labels, titles를 추가한다.
5. acceptance test와 PNG render test를 확장한다.
6. 브라우저와 고해상도 PNG 결과를 직접 확인한다.

각 구현 단위는 관련 테스트와 영어 사용자 문서를 함께 갱신하고, 작은
conceptual commit으로 push한 뒤 다음 단계로 진행한다.

## 테스트

- 단일 line과 line collection unit test
- 단일 text와 text collection unit test
- text alignment와 rotation unit test
- axis가 포함된 cars scatterplot acceptance test
- `test:render`를 통한 고해상도 PNG 생성
- line, text, circle 개수와 주요 Canvas 호출 검증

## 제외 범위

- Scale action
- Semantic guide
- Axis 자동 생성
- `createAxes`, `editXAxis` 등의 상위 action
- tick 값 자동 추론
- SVG renderer

## 완료 조건

- Canvas renderer가 `canvas`, `circle`, `line`, `text`를 지원한다.
- primitive만으로 x/y axis가 포함된 cars scatterplot을 표현할 수 있다.
- PNG에서 axis line, ticks, labels, titles가 정상적으로 보인다.
- renderer는 계속 `graphicSpec`만 읽는다.
- 모든 일반 테스트와 PNG render test가 통과한다.
