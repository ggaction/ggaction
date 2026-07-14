# Action Contract and Coverage Catalog

이 문서는 ggaction의 direct action 계약과 테스트 coverage를 관리하는 기준 문서다.
일반 사용자를 위한 설명은 `docs/`에 두고, 여기서는 API의 현재 동작, 계획된 동작,
내부 상태에 미치는 영향과 검증 근거를 함께 기록한다.

## 범위

Catalog의 최상위 분류는 두 개뿐이다.

- **User-facing actions**: `ChartProgram`의 public type에 선언되어 차트 작성자 또는
  advanced 작성자가 직접 호출할 수 있는 action
- **Primitives**: extension action이 semantic/graphic state를 직접 작성할 때 사용하는
  `editSemantic`, `createGraphics`, `editGraphics`

`action()` wrapper와 renderer는 action method가 아니므로 제외한다. Runtime trace에만
나타나는 `rematerializePointMark`, `createLegendSymbols` 같은 내부 wrapped action도
Catalog 본문에서 제외한다. Public type에 선언된 materialization action은 현재 지원되는
direct call이므로 User-facing actions에 포함한다. 이 경계가 바뀌면 type, public reference,
Catalog와 contract test를 같은 변경에서 갱신해야 한다.

## 상태와 coverage 표기

### 구현 상태

- **Implemented**: 현재 구현, public type과 테스트 대상에 존재한다.
- **Planned**: 사용자와 추가하기로 합의했지만 아직 구현되지 않았다.
- **Proposed**: 필요성만 확인됐거나 이름, 값, 우선순위가 아직 결정되지 않았다.

### 현황 기호

- **✅**: 현재 계약과 대표·경계·오류 테스트가 충분하다.
- **⚠️**: 구현됐지만 값 종류, 상호작용 또는 영향 검증이 일부 부족하다.
- **❌**: 구현 또는 실행 가능한 검증 근거가 없다.
- **—**: 해당 action에 적용되지 않는다.

Coverage 퍼센트는 사용하지 않는다. 체크된 case는 반드시 아래에 명시된 테스트 파일에서
실행 가능해야 한다. 숫자와 임의 문자열처럼 열린 값 공간은 모든 값을 나열하는 대신
경계값, 대표값, 잘못된 값과 의미 있는 상호작용으로 나눈다.

## 전체 현황

아래 표의 action 링크는 상세 계약으로 이동한다. `Contract`는 parameter와 값 공간,
`Effects`는 semantic/graphic/rematerialization 설명, `Tests`는 현재 case coverage 상태다.

| Layer | Action | Status | Contract | Effects | Tests |
| --- | --- | --- | ---: | ---: | ---: |
| User-facing | [`createCanvas`](#createcanvas) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editCanvas`](#editcanvas) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createData`](#createdata) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`filterData`](#filterdata) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createDensityData`](#createdensitydata) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createRegressionData`](#createregressiondata) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createPointMark`](#createpointmark) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createLineMark`](#createlinemark) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createBarMark`](#createbarmark) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createAreaMark`](#createareamark) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeX`](#encodex) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeY`](#encodey) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeColor`](#encodecolor) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeStrokeDash`](#encodestrokedash) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeSize`](#encodesize) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeShape`](#encodeshape) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeOpacity`](#encodeopacity) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`encodeRadius`](#encoderadius) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`encodeXOffset`](#encodexoffset) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeY2`](#encodey2) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeYRange`](#encodeyrange) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeGroup`](#encodegroup) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeHistogram`](#encodehistogram) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`encodeDensity`](#encodedensity) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeBarWidth`](#encodebarwidth) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createRegression`](#createregression) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createAxes`](#createaxes) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createXAxis`](#createxaxis) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createYAxis`](#createyaxis) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createXAxisLine`](#createxaxisline) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createYAxisLine`](#createyaxisline) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editXAxisLine`](#editxaxisline) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editYAxisLine`](#edityaxisline) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createXAxisTicks`](#createxaxisticks) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createYAxisTicks`](#createyaxisticks) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`editXAxisTicks`](#editxaxisticks) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`editYAxisTicks`](#edityaxisticks) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createXAxisLabels`](#createxaxislabels) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createYAxisLabels`](#createyaxislabels) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`editXAxisLabels`](#editxaxislabels) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`editYAxisLabels`](#edityaxislabels) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createXAxisTicksAndLabels`](#createxaxisticksandlabels) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createYAxisTicksAndLabels`](#createyaxisticksandlabels) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editXAxisTicksAndLabels`](#editxaxisticksandlabels) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editYAxisTicksAndLabels`](#edityaxisticksandlabels) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createXAxisTitle`](#createxaxistitle) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createYAxisTitle`](#createyaxistitle) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editXAxisTitle`](#editxaxistitle) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editYAxisTitle`](#edityaxistitle) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createGrid`](#creategrid) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createHorizontalGrid`](#createhorizontalgrid) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createVerticalGrid`](#createverticalgrid) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createLegend`](#createlegend) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createSizeLegend`](#createsizelegend) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`rematerializeSizeLegend`](#rematerializesizelegend) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createGuides`](#createguides) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createTitle`](#createtitle) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createCoordinate`](#createcoordinate) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createScale`](#createscale) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`rematerializeScale`](#rematerializescale) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createDerivedData`](#createderiveddata) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`materializeFilteredData`](#materializefiltereddata) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`materializeRegressionData`](#materializeregressiondata) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`materializeDensityData`](#materializedensitydata) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createRegressionBand`](#createregressionband) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createRegressionLine`](#createregressionline) | Implemented | ✅ | ✅ | ⚠️ |
| Primitive | [`editSemantic`](#editsemantic) | Implemented | ✅ | ✅ | ✅ |
| Primitive | [`createGraphics`](#creategraphics) | Implemented | ✅ | ✅ | ✅ |
| Primitive | [`editGraphics`](#editgraphics) | Implemented | ✅ | ✅ | ✅ |

## 상세 계약 작성 규칙

각 action section은 다음 순서로 작성한다.

1. signature, 목적, 필수 state와 action-level 결과
2. parameter별 타입, 필수 여부, accepted values, default/inference
3. parameter 상호작용과 우선순위
4. semantic, graphic/rendering, rematerialization 영향
5. 오류 조건과 실행 가능한 coverage 근거

대칭인 x/y guide action은 같은 parameter contract를 공유할 수 있지만, 전체 현황과
상세 heading에는 두 action을 모두 명시한다.

