# Flint 전체 호환성과 ggaction backend 통합: 구현 명세

> **과거 Flint 조사 — 참고 전용.** 이 장의 원본 사실·수치·이전 권고를 보존한다. 이전의 필수/호환/번역/완료 표현은 최신 계획의 의무가 아니다. POL-09/10에 따라 외부 정합성·통합·번역은 철회되었고, 활성 작업과 시험은 14–15장 및 GGA/USR 원장만 사용한다.

이 문서는 조사한 Flint의 기능을 ggaction의 차트 생성 능력, 데이터 의미, 디자인, 렌더링, 상호작용, 편집, 내보내기 계약으로 분해한다. **차트 이름을 비슷하게 그리는 것과 Flint backend로 작동하는 것은 별개의 합격 조건이다.** ggaction에는 이미 많은 Cartesian·polar·통계 차트를 만드는 도메인 액션이 있지만, 현재 액션 목록만으로 Flint의 semantic interaction runtime, geo camera, hierarchy/graph layout, 정책 기반 디자인 및 문서형 차트 레이아웃까지 호환된다고 판정할 수 없다.

조사 기준은 Flint `a794557384adcc3293a77043f6b9aff1c33d152c`(2026-10-21T16:39:01-07:00), JS package 1.0.1이며 ggaction 기준은 `40ec7edead7fc84de05aad31888dd0f7d264a512`(0.0.26)이다. 아래 GitHub 링크는 모두 조사 SHA에 고정되어 있다. ggaction 대응은 현재 `agent_docs/contract/ACTION_INDEX.json`에 존재하는 액션 이름을 확인한 **구현 후보**다. 각 옵션과 상호작용의 대응이 이미 렌더링 검증을 통과했다는 의미가 아니다.

> **개정 범위 안내:** 이 장은 원본 관찰을 보존한다. KPI/Gauge 제외, dual-Y 금지, Funnel→Pyramid, 조합 정책은 부록 F와 target-chart-mapping이 우선하며 source 목록의 존재가 구현 의무를 뜻하지 않는다.

## 1. 조사 결과와 증거 수준

실제 TypeScript registry를 번들링하여 실행한 결과, Vega-Lite 39, ECharts 37, Chart.js 22, Plotly 38, Excel 18개, 총 154개 backend-template 등록을 확인했다. 중복 chart 문자열을 제거하면 **51개**이며, Donut Chart와 Doughnut Chart를 의미상 동일하게 취급하면 50개다. README의 “52 chart types”와 현재 코드가 다르므로 원본 조사 분모는 이 고정 스냅샷의 실제 목록이다. 구현 완료는 이 원장에 부록 F 정책을 적용해 판정한다. 추가로 공개 `image-charts` entry point가 10개 차트를 이미지 URL로 컴파일한다. 이는 headline의 5개 backend 외 추가 export이며, 51개 목록의 부분집합이다.

14개 theme, 23개 interaction preset, 44개 semantic type이 실제 registry에 존재한다. `SemanticTypes` 상수나 문서의 개념 목록을 실제 type registry와 혼동해서는 안 된다. 코드 파일 432개의 TS/TSX에서 exported interface/type 603개를 추출하고 선언 위치·필드 타입·주석을 기계 기록했다. chart property는 정적 registry에만 한정하지 않고 실제 `chartProperties` 접근도 별도 추출했다. 예를 들어 custom choropleth의 `levels`, `featureKey`, `baseMapUrl` 및 Tree의 `rootLabel`은 registry의 property selector만 읽으면 놓친다.

실행한 검사는 다음 범위다.

- upstream `TEST_GENERATORS`로 fixture 956개를 생성했다. 생성 오류는 없었다.
- 51개 literal chart 이름마다 기존 fixture 하나를 선택하여 등록된 154 backend 조합에 컴파일했다. **153개 컴파일 성공, 1개 명시적 오류**였다.
- 실패는 Excel Waterfall의 final total이다. Office.js가 해당 total-point 의미를 노출하지 않는다는 명시적 오류이며, 이를 Flint 자체의 전 backend 동일 기능이라고 가정해서는 안 된다.
- 이 검사는 DOM·픽셀·입력 이벤트를 실행한 검사가 아니다. 컴파일 성공은 수치·디자인·상호작용 fidelity를 증명하지 않는다. 이 문서에서 제안하는 ggaction 대응 프로그램을 이미 실행·렌더링한 것도 아니다.

재현 자료는 `evidence/flint-snapshot.json`, `flint-catalog.json`, `flint-api-types.json`, `flint-property-accesses.json`, `flint-compile-probe.json`, `flint-requirements.json`이다. 마지막 파일에는 고유 ID를 가진 **874개 요구사항**이 있으며, 51 chart family, 317 backend별 chart property, 22 encoding action, 23 interaction preset, 14 theme, 289 public contract field, 147 native-backend behavior declaration, 11 cross-cutting requirement로 나누었다. 이는 적합성 합격 결과가 아닌 원본 요구 원장이다. 개정된 구현 backlog는 scope disposition이 있는 requirements-traceability를 사용한다. dynamic function branch와 property 조합의 수까지 874로 제한한다는 뜻은 아니다.

근거: [template registry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/index.ts#L258-L319), [공개 package exports](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/package.json#L27-L148), [interaction registry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/spec/registry.ts#L70-L312).

## 2. Flint의 실제 역할과 전체 흐름

Flint는 semantic chart specification을 여러 backend로 컴파일하는 라이브러리다. 입력은 `data`, `semantic_types`, `chart_spec`, `theme_spec`, `interaction_spec`, `options`, `field_display_names`다. chart_spec에는 chartType, encodings, chartProperties, title/subtitle/label/source/chrome, baseSize/canvasSize가 들어간다. 제목과 주석 같은 문서 요소, 차트 구조에 맞춘 레이아웃, 의미에 맞춘 축/색/정렬 및 그림 크기까지 컴파일 대상이다.

Vega-Lite 경로는 대략 다음 책임으로 분해된다.

1. **입력 정규화와 의미 분석**: shorthand field와 static-series array를 해석하고 wide→long fold, 필드 타입 추론, semantic annotations, encoding override, transpose/arrange/chart-type transform, aggregation, temporal parsing, zero/log/ordering 규칙을 적용한다.
2. **구조와 layout plan**: category cardinality, label 측정, mark의 perceptual channel, plot aspect, band step, grouping, facet, axes, legend, title/source/furniture를 함께 고려하여 공간을 배분한다.
3. **theme grounding**: 추상적인 ink/type/structure/marks/labels/legend policy를 실제 차트 역할과 공간에 맞춘 `DesignDecisions`로 결정한다. 좁은 공간에서 덜 강조하는 등 요청에서 벗어나는 결정은 report에 남긴다.
4. **backend realization**: backend template과 instantiate 단계가 plan을 구체적인 spec으로 만든다. static SVG 경로와 interactive mount 경로는 별개다.
5. **interactive runtime**: drawn geometry의 hit를 semantic value/records로 환원하고, preset gesture를 renderer-neutral update로 바꾸며, preview/retained state를 유지하고, 주석/overlay/controls/links/keyboard를 실행한다.

따라서 ggaction core에 `renderFlintChart` 같은 일괄 우회 액션을 넣는 접근은 목표와 맞지 않는다. 외부 adapter가 Flint의 요청을 ggaction의 소수 도메인 액션 조합으로 낮추되, 데이터 변환과 의미 변화와 graphic materialization이 trace에 드러나야 한다. renderer는 ggaction의 fully materialized graphicSpec만 읽는 원칙을 유지한다. 외부 라이브러리 이름·특화 오류·원본 spec 객체는 adapter에 둔다.

주의할 API 경계가 있다. `core/analyze.ts`의 analyzeChart, `core/plan.ts`의 planLayout, `vegalite/assemble.ts`의 vegaLiteStages/openVegaLiteSession은 소스 export지만 현재 public barrel로 모두 공개되지 않는다. package exports가 막힌 내부 deep import에 의존하는 adapter는 안정적인 통합이 아니다. **Flint upstream에서 backend-neutral preparation/plan 계약을 공개하고 adapter가 이를 소비하는 경로**를 우선 설계한다. 공개 API 확장이 불가능하다면 adapter 내부에 공개 helpers로 만든 독립 preparation을 두고, 그 결과를 upstream output에 맞추는 golden test를 유지해야 한다. 후자는 의미/레이아웃 정책을 두 곳에 유지하는 비용이 크다.

근거: [ChartAssemblyInput](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L1290-L1431), [ChartAnalysis와 분석](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/analyze.ts#L10-L110), [Vega-Lite public exports](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/index.ts#L13-L46), [theme의 두 수준](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L5-L20).

## 3. 차트별 ggaction 조합과 남은 계약

아래 `조합 후보`는 해당 이름의 액션이 현재 존재함을 확인한 것이다. `부분`은 관련 primitive는 있으나 composite geometry/layout/meaning 보장이 더 필요하다. `신규 핵심`은 필수 계산·좌표·geometry family가 현재 액션 집합에 보이지 않는다. 어느 행도 Flint 전체 옵션·interaction을 통과한 “완료”로 취급하지 않는다. VL/EC/CJ/PL/XL은 원본 backend 등록이며, 각 backend의 모든 디자인과 interaction이 같다는 뜻이 아니다.

| ID / chart | 원본 backend | ggaction 판단 / action 조합 후보 | 필수 gap / 검증 |
|---|---|---|---|
| FCH-001 / [Area Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/area.ts#L23-L201) | VL, EC, CJ, PL, XL | 조합 후보: `createAreaPlot`, `createStackData`, `encodeGroup` | baseline/stack/curve결측 및 semantic path provenance |
| FCH-002 / [Bar Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bar.ts#L37-L127) | VL, EC, CJ, PL, XL | 조합 후보: `createBarPlot`, `createSummaryData`, `encodeColor` | aggregation/zero/transpose/dodge/label/rounded corner fidelity |
| FCH-003 / [Bar Table](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/bar-table.ts#L154-L522) | VL, PL | 부분: `createAdjacentPlot`, `createBarPlot`, `createTextPlot` | 공유 행높이/열정렬/셀포맷/헤더/스크롤 및 table layout |
| FCH-004 / [Boxplot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/boxplot.ts#L203-L514) | VL, EC, PL, XL | 조합 후보: `createBoxPlot`, `createPointMark` | quartile/whisker 규약, outliers/points/dodge 및 원본 row lineage |
| FCH-005 / [Bubble Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bubble.ts#L52-L180) | CJ | 조합 후보: `createScatterPlot`, `encodeSize` | radius와area 입력단위 명시 및 size legend |
| FCH-006 / [Bullet Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/bullet.ts#L31-L161) | VL, EC, PL | 부분: `createBarMark`, `createRuleMark`, `createReferenceBand`, `createOverlay` | POL-07: 기존 bands/bar/rule 조합, 공동 scale·hit role; 전용 constructor 없음 |
| FCH-007 / [Bump Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bump.ts#L31-L204) | VL, EC, CJ, PL | 조합 후보: `createWindowData`, `createLinePlot`, `orderCategories` | 시점별 rank/tie/dense-rank와 반전 y/rank label |
| FCH-008 / [Calendar Heatmap](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/calendar.ts#L55-L191) | VL, EC | 부분: `createTimeUnitData`, `createHeatmap`, `facetGrid` | timezone/weekStart/ISO week/leap day/월경계 및 calendar 좌표 |
| FCH-009 / [Candlestick Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/candlestick.ts#L24-L170) | VL, EC, PL, XL | 부분: `createBarMark`, `createRuleMark`, `createOverlay`, `createWindowData` | OHLC 검증, open/close body, high/low wick, up/down color, MA overlay |
| FCH-010 / [Choropleth](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/choropleth.ts#L72-L135) | VL, PL | 신규 핵심: `createLookupData`, `encodeColor` | GeoJSON/TopoJSON, geo coordinate/projection, polygon mark, missing-join/LOD/geo hits |
| FCH-011 / [Combo Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/combo.ts#L46-L146) | CJ | 부분: `createOverlay`, `createLinePlot`, `createBarPlot`, `editCompositionScales` | 원본은 공통 x+독립 y이며 두 measure 구성은 POL-08로 금지. 허용 대안은 shared-Y layer 조합, 별도 fidelity variant |
| FCH-012 / [Connected Scatter Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/connected-scatter.ts#L70-L165) | VL, EC, CJ, PL, XL | 조합 후보: `createLinePlot`, `createPointMark`, `encodePathOrder` | 시간/순서채널이 x정렬과 독립; path segment provenance |
| FCH-013 / [Density Contour](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/density-contour.ts#L21-L101) | PL | 신규 핵심: `createBin2DData`, `createPointMark` | 2D bin-density contour polygon 추출/threshold topology; KDE로 대체금지 |
| FCH-014 / [Density Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/density.ts#L63-L129) | VL, EC, PL | 조합 후보: `createDensityData`, `createDensityPlot` | kernel/bandwidth/norm/extent grid수치일치 및 tail policy |
| FCH-015 / [Donut Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/excel/templates/pie.ts#L12-L16) | VL, PL, XL | 조합 후보: `createPiePlot`, `editArcMark` | inner radius 단위/정렬/pad angle/outside labels/legend |
| FCH-016 / [Doughnut Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/doughnut.ts#L23-L114) | CJ | 조합 후보: `createPiePlot`, `editArcMark` | Donut alias를 adapter에서정규화, percentage innerRadius 일치 |
| FCH-017 / [ECDF Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/ecdf.ts#L42-L120) | VL, EC, CJ, PL | 조합 후보: `createECDFData`, `createECDFPlot` | ties/step side/normalization/points/empty handling |
| FCH-018 / [Funnel Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/funnel.ts#L30-L194) | EC, PL, XL | 신규 핵심: `createSummaryData`, `createTextMark` | 공개 이름 Pyramid로만 변경(POL-05); 원본 가변너비 trapezoid/ordering/gap/orientation/percentage label 유지 |
| FCH-019 / [Gantt Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/gantt.ts#L38-L180) | VL, EC, CJ, PL | 조합 후보: `createBarMark`, `encodeX`, `encodeX2`, `encodeY`, `createMarkLabels` | start/end temporal interval, task height, invalid/reversed interval, overlap |
| FCH-020 / [Gauge Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/gauge.ts#L29-L223) | EC, PL | 원본 조사 후보(개정 범위 제외): `createArcMark`, `createRuleMark`, `createTextMark` | POL-06: 제외. source 관찰만 보존; 전용 구현/충실도 의무 없음 |
| FCH-021 / [Grouped Bar Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bar.ts#L242-L456) | VL, EC, CJ, PL, XL | 조합 후보: `createBarPlot`, `encodeXOffset`, `encodeYOffset`, `encodeGroup` | nested grouping/dodge mode, missinggroups/inner-outer padding |
| FCH-022 / [Heatmap](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/heatmap.ts#L55-L285) | VL, EC, PL | 조합 후보: `createHeatmap`, `encodeColor`, `createMarkLabels` | continuous/quantized/diverging colors, missing cell, cell labels+contrast |
| FCH-023 / [Histogram](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/histogram.ts#L17-L137) | VL, EC, CJ, PL, XL | 조합 후보: `createBinData`, `createHistogram` | bin boundary inclusive rule, binCount vs actual bins, emptybins/provenance |
| FCH-024 / [KPI Card](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/kpi-card.ts#L20-L196) | VL, PL | 원본 조사 후보(개정 범위 제외): `createTextPlot`, `createAdjacentPlot`, `createAnnotation` | POL-06: 제외. source 관찰만 보존; 전용 구현/충실도 의무 없음 |
| FCH-025 / [Line Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/line.ts#L25-L210) | VL, EC, CJ, PL, XL | 조합 후보: `createLinePlot`, `encodeGroup`, `encodePathOrder` | interpolate variants/gaps/points/shared indexhit/series end labels |
| FCH-026 / [Lollipop Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/lollipop.ts#L37-L141) | VL, EC, CJ, PL | 조합 후보: `createLollipopPlot` | orientation/negativevalue/pointsize and line role |
| FCH-027 / [Map](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/map.ts#L173-L295) | VL, PL | 신규 핵심: `createPointMark`, `encodeSize`, `encodeColor` | projection+basemap+lonlat coordinate/globe clip/camera/geo inverse |
| FCH-028 / [Marginal Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/marginal.ts#L249-L445) | VL | 부분: `createScatterPlot`, `createHistogram`, `createDensityPlot`, `createAdjacentPlot` | POL-07: scatter+histogram/density+adjacent 조합; 공통 bounds/guide 보강, 전용 constructor 없음 |
| FCH-029 / [Network Graph](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/graph.ts#L27-L167) | EC | 신규 핵심: `createPointMark`, `createLineMark` | graph node/edge layout circular/seeded force, graph identity/selflinks/multiedges |
| FCH-030 / [Parallel Coordinates](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/parallel.ts#L56-L190) | EC | 조합 후보: `createParallelCoordinates`, `createParallelAxes`, `editParallelScale` | numeric-column selection, independently scaledaxes, detail/color/provenance |
| FCH-031 / [Pie Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/pie.ts#L49-L135) | VL, EC, CJ, PL, XL | 조합 후보: `createPiePlot` | slice ordering/percent formatting/negative-zero policy/labels |
| FCH-032 / [Pyramid Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/pyramid.ts#L18-L161) | VL, EC, PL, XL | 조합 후보: `createBarPlot`, `createComputedData`, `createOverlay` | signed mirrored scales/absolute ticks/two cohort alignment  **POL-05:** 원본 인구형 Pyramid는 mirrored-bars recipe; renamed Funnel과 구별. |
| FCH-033 / [Radar Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/radar.ts#L24-L149) | VL, EC, CJ, PL, XL | 조합 후보: `createRadarPlot`, `createRadialGrid`, `createThetaAxis` | shared vs each dimension normalization/closed path/angular order |
| FCH-034 / [Range Area Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/range-area.ts#L42-L184) | VL, EC, CJ, PL | 조합 후보: `createAreaMark`, `encodeY`, `encodeY2`, `encodeGroup` | range endpoints crossing/missing values/curve pairing and band selection |
| FCH-035 / [Ranged Dot Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/ranged-dot.ts#L14-L146) | VL, EC, PL | 조합 후보: `createDumbbellPlot`, `createIntervalPlot` | center optional/range ends/role-specific hits/caps/orientation |
| FCH-036 / [Regression](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/scatter.ts#L818-L915) | VL, EC, PL | 조합 후보: `createRegressionData`, `createRegressionPlot`, `createRegressionBand` | linear/log/exp/power/poly degree/loess differences and independentstats |
| FCH-037 / [Ridgeline Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/ridgeline.ts#L449-L876) | VL | 부분: `createDensityData`, `createAreaPlot`, `createAdjacentPlot` | overlap/offset baseline/sharedamplitude/category labels and clipping |
| FCH-038 / [Rose Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/rose.ts#L31-L185) | VL, EC, CJ, PL | 조합 후보: `createRosePlot`, `createRadialAxis` | equal angle radius encodesarea orlength asdeclared; sort/group/alignment |
| FCH-039 / [Sankey Diagram](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/sankey.ts#L30-L176) | EC | 신규 핵심: `createSummaryData` | weighted directedgraph layout/link ribbons/nodewidth/gap/orientation/conservation |
| FCH-040 / [Scatter Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/scatter.ts#L28-L137) | VL, EC, CJ, PL, XL | 조합 후보: `createScatterPlot`, `encodeChannels` | shape/area/opacity/log zero/category/axis label invariants |
| FCH-041 / [Slope Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/slope.ts#L45-L143) | VL, EC, CJ, PL | 조합 후보: `createLinePlot`, `encodePathOrder`, `createMarkLabels` | exactlytwo endpoints orfilteredsubset, endpointlabels collision |
| FCH-042 / [Sparkline](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/sparkline.ts#L71-L237) | VL, PL | 부분: `createLinePlot`, `createTextPlot`, `createAdjacentPlot` | row label+inline mini chart+value columns aligned; independent/shared y |
| FCH-043 / [Stacked Bar Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/bar.ts#L131-L238) | VL, EC, CJ, PL, XL | 조합 후보: `createStackData`, `createBarPlot` | stack order/normalize/diverging+negative stacks/provenance |
| FCH-044 / [Streamgraph](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/streamgraph.ts#L22-L231) | VL, EC, PL | 조합 후보: `createStackData`, `createAreaPlot` | wiggle/silhouette/diverging baseline algorithm and irregular x-spacing |
| FCH-045 / [Strip Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/jitter.ts#L56-L186) | VL, EC, CJ, PL | 조합 후보: `createStripPlot`, `jitterPoints`, `packPoints` | seeded jitter/spread/dodge/orient vs strip/lattice ambiguity |
| FCH-046 / [Sunburst Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/sunburst.ts#L77-L366) | EC, XL | 신규 핵심: `createArcMark`, `createSummaryData` | hierarchy partition/rings/parent-childangles/label rotation/drill state |
| FCH-047 / [Table](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/table.ts#L57-L115) | VL | 부분: `createTextPlot`, `createRectMark`, `createAdjacentPlot` | cell semantic table, percolumnformat/alignment/header/rowlimit/accessibility |
| FCH-048 / [Tree](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/tree.ts#L25-L145) | EC | 신규 핵심: `createPointMark`, `createLineMark`, `createTextMark` | hierarchy extraction/rootLabel/tidy tree LR/TB/links; native expand disabled |
| FCH-049 / [Treemap](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/treemap.ts#L24-L226) | EC, XL | 신규 핵심: `createRectMark`, `createSummaryData`, `createMarkLabels` | hierarchy squarify areas/padding/nodeids/labels/breadcrumb/drill state |
| FCH-050 / [Violin Plot](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/templates/violin.ts#L17-L96) | VL, PL | 조합 후보: `createViolinPlot`, `createDensityData` | bandwidth/tailCut/box/median/half/full/dodge/countwidth/invalidgroups |
| FCH-051 / [Waterfall Chart](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/chartjs/templates/waterfall.ts#L30-L139) | VL, EC, CJ, PL, XL | 조합 후보: `createWindowData`, `createComputedData`, `createBarMark`, `createRuleMark` | delta/subtotal/total mode and connector; avoid blindlysumtotalrows |

### 재사용할 부분과 새로 만들 부분의 경계

Cartesian/polar의 대부분은 existing action의 올바른 조합부터 검증해야 한다. bar/line/scatter마다 새 액션을 추가하는 대신, 실제 부족한 공통 계약인 stable row identity, semantic hit registry, point radius/area 변환, ordered path, shared/independent composition scale, annotation placement, guide policies를 보완한다. 신규 chart helper는 검증된 data→geometry 조합을 명명하는 편의 API이고 low-level 단일 giant graphic patch가 되어서는 안 된다.

반대로 hierarchy·graph·geo·contour의 계산을 사용자가 모두 좌표 배열로 선계산하게 하면 “간단한 액션의 조합” 목표를 달성하지 못한다. 다음 source-neutral 기능이 필요하다. 이름은 **제안**이며 현재 API를 뜻하지 않는다.

- `createHierarchyData`는 group-field path 또는 id/parent-id를 explicit mode로 받고 nodeId/parentId/depth/value/rowIds를 만든다. duplicate ID, orphan, cycle, leaf/internal value policy를 검증한다. `layoutHierarchy`는 tree/treemap/partition을 구분하고 출력 node geometry와 stable ordering을 가진다. Tree는 shared line/point/text, Treemap은 rect/label, Sunburst는 arc/label로 재사용한다.
- `createGraphData`는 node table/edge table 또는 source/target/value fields를 명시적으로 받고 중복 edge aggregation, self-link, missing node 정책을 기록한다. `layoutGraph`의 circular/force는 seed·iterations·stable node order가 필요하다. force simulation을 renderer가 실행하지 않는다. 결정된 좌표를 graphicSpec에 저장한다.
- `layoutFlow`는 Sankey DAG layout을 수행하고 node conservation, link width, path ribbon, node gap/width/orientation을 보장한다. cycle을 지원할지 explicit error로 돌려줄지 공개 계약을 정해야 한다. 현재 Flint Sankey가 self-link를 삭제하는 것과 ggaction core가 같은 silent deletion을 하도록 만드는 것은 별개다. adapter는 upstream-compatible data policy를 명시하고 diagnostic을 제공한다.
- `createContourData`는 2D bin counts/density grid에서 iso-threshold polygon을 생성한다. Flint Density Contour는 Plotly `histogram2dcontour` 기반이므로 무조건 KDE를 사용하면 의미가 달라진다. bin extent, edge rules, normalization, threshold, disconnected ring/hole, saddle-case tie-break를 고정한다.
- `layoutCalendar`는 Gregorian date를 week/day/month cell geometry로 만들고 weekStart, timezone, ISO-year, missing-day, leap-day를 명시한다. 단순 year/month/day field가 있다고 calendar가 완성된 것은 아니다.
- generic polygon/ribbon/path mark 또는 기존 path graphic의 공개 도메인 액션이 필요하다. Pyramid(원본 Funnel)의 trapezoid, sankey ribbon, contour polygon, geo polygon을 하나의 불명확한 `customShape`로 몰지 않고 geometry마다 semantic role과 hit/clip/closed-ring contract를 유지한다.

## 4. 데이터·scale·encoding의 완전성

Flint `ChartEncoding`은 field/type/aggregate/sortOrder/sortBy 외 scheme/reverse/mid/domain/bins/colors/title을 가진다. aggregate의 선언 값은 count/sum/average/mean이며 theme와 chart default가 implicit aggregation과 독립이다. `title:null`은 field 이름을 빈 문자열로 바꾸는 것이 아니라 guide title suppression이다. `domain`은 여기서는 color ramp extent로 문서화되어 있으므로 x/y domain으로 오독하지 않는다. static series array는 measure fields를 fold하고 synthetic series field를 만든다. synthetic field가 caller field와 충돌하면 생성 이름/identity namespace가 필요하다.

44개 registry type은 단순 Q/N/T shorthand보다 많은 의미를 담는다. 예를 들어 Percentage는 scale domain/format과 연결되고 Profit/PercentageChange/Sentiment/Correlation은 diverging midpoint와 sign; Rank는 순서 및 baseline; Date/Year/Quarter/Month/Week/YearWeek는 parser와 canonical order; Country/State/Latitude/Longitude는 geo inference와 연결된다. **type명별로 한 번의 행이 필요하고 annotation 조합별로 별도 fixture가 필요하다.** Unknown을 zero-value number로 강제 변환하거나 날짜를 locale-dependent Date.parse에만 맡기면 안 된다.

`FCORE-DATA-LINEAGE`의 필수 산출물은 다음이다.

- 입력 row는 stable `rowId`를 가지고, aggregation/bin/density/regression/fold/stack/window가 원본 row ID 집합 또는 provenance query를 보존한다. mark별 source records를 추적할 수 있어야 한다. density line의 점 하나를 단일 원본 row로 거짓 대응하지 않는다.
- 통계 계산과 renderer 계산을 분리한다. 수치 오라클은 별도 수식 또는 고정 수치 fixture를 사용한다. 현재 output으로 expected 값을 다시 생성하는 self-fulfilling test는 금지한다.
- 사용자 field name과 display name을 분리한다. 번역된 label을 row lookup key로 쓰지 않는다. tuple key는 JSON value type을 유지하므로 number 1/string "1"/null이 섞여도 충돌하지 않아야 한다.
- null, NaN, Infinity, invalid Date, empty string, empty group, singleton group, all-negative/all-zero, duplicate category의 정책을 각 transform에 기록한다. 출력 mark 개수보다 삭제된 행과 삭제 이유가 더 중요한 경우가 있다.
- categorical order, series order, facet order를 별개 자원으로 다룬다. sort/toggle/filter가 identity를 바꾸지 않고 다시 켰을 때 original ordering을 복원한다.
- repeated-measure와 wide-series에 대해 graph edit 이후 dependent data가 재계산되고 이전 ChartProgram은 변하지 않는지 확인한다.

근거: [encoding 전체 필드와 static series](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L29-L126), [실제 semantic registry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/type-registry.ts#L57-L186), [semantic target의 value/records](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L1-L69).

## 5. 디자인은 팔레트 14개를 추가하는 일이 아니다

ThemeSpec은 ink, type, structure, marks, labels, legend, dataLabels, annotation, furniture, source, facets, layout, geometry, chartDefaults, compileDefaults, interaction, variants를 가진다. 14 preset은 nyt/economist/swiss/nature/mckinsey/datawrapper/powerbi/powerbi-light/pop/cartoon/apple/de-stijl/bbc/material이다. adapter가 preset 이름을 해석하고 neutral theme token과 resolved design으로 낮춰야 하며, ggaction core public vocabulary는 기존 source-neutral 원칙을 지킨다.

필수 구현 단위는 아래와 같다.

1. **색과 패턴**: categorical palette, sequential/diverging ramp, midpoint/domain/binning, per-value colors, missing color, background, neutral/structure/emphasis colors. texture `solid/diagonal/antidiagonal/horizontal/vertical/cross/dots`는 canvas/svg/pdf에서 동일한 물리 pitch·stroke·phase를 가져야 한다. pattern은 fill image screenshot으로 고정하지 말고 재사용 가능한 graphic resource로 materialize한다.
2. **역할별 글꼴**: headline/deck/axisLabel/axisTitle/valueLabel/keyLabel/annotation/footnote/display별 family,size,weight,italic,case,color; token 또는 px. 상하좌우 배치와 text measure는 렌더러가 사용한 실제 font/fallback으로 일치시킨다. 대문자 변환은 측정 전에 적용한다.
3. **구조**: axis presence ordinal omit/hairline/quiet/full/emphasised, tickDirection/tickLength/density/observed-only/endpoints/sparse, zero line/baseline/major/minor grid, dash/weight/color/behind/front. discrete-axis tick-label hit가 물리적으로 렌더링된 label과 동일해야 한다.
4. **mark geometry**: line width/dash/curve, point shape/size/outline/halo/fill, bar gap/corner radius, area opacity, arc gap/pad/inner radius, cell border. 패널이 좁아졌을 때 size와 opacity를 연동하는 policy도 resolved design에 남긴다.
5. **label fit**: wrap→skip→rotate45→rotate90 순서, minimum readable size, overflow/truncation tooltip, series-end label의 collision avoidance, mark-inside/outside value labels와 background 대비. `showValueLabels`와 theme policy 간 우선순위를 정하고 suppressWhenValuesPrinted가 axis/legend에 실제 반영되게 한다.
6. **legend**: categorical/continuous/quantized legend, placement/orientation/wrapping, title/header, tick labels, symbol/outline, capacity, per-series line/point glyph; legend toggle의 domain과 legend의 visible values가 같은 source of truth를 사용해야 한다.
7. **문서형 chrome**: kicker/figure label, headline/subtitle, source URL/text, logos/furniture의 zone와 frame(canvas/content/block), rule/icon/SVG furniture, footnote, facet header. chart_spec.chrome 부분 suppression이 source line을 잘못 숨기지 않게 한다.
8. **adaptive variants와 report**: variant guard가 width/height/count 같은 실제 context에서 평가되어 같은 입력+크기에는 같은 결정을 내린다. 지원하지 않는 decoration이나 fallback font는 `DesignDeparture{path,requested,resolved,reason}`와 같은 진단으로 남긴다. “조용히 무시”는 합격이 아니다.

ggaction의 applyTheme, guide/label/legend 편집과 측정 API를 최대한 재사용하되 위 정책의 gap을 비교해야 한다. resolved design을 그대로 보관하는 외부 불투명 blob은 충분하지 않다. 소스-neutral 의미와 graphic resources로 표현되고 edit/rematerialization/export에 참여해야 한다.

실제 theme realization은 backend마다 다르다. core types의 “Vega-Lite only” 주석 일부는 Plotly theme 구현과 맞지 않는다. Plotly assembler는 groundTheme/realizeTheme를 사용하지만 ECharts/Chart.js assembler에서 theme_spec 전체 적용은 확인되지 않는다. 따라서 reference는 각 기능의 구현이 존재하는 backend를 택하고, 모든 backend가 동일theme를 구현한다는 전제로 golden을 만들지 않는다.

근거: [ThemeSpec](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1095-L1123), [type/axis roles](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L32-L125), [Plotly grounding 및 realization](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/plotly/assemble.ts#L494-L539).

## 6. layout·composition·responsive의 구체적인 합격 조건

baseSize는 원하는 크기이고 canvasSize는 전체 facet composition을 포함한 상한이다. plot box와 axes/header/title/legend/source를 포함한 block/canvas를 혼동하면 reference보다 실제 canvas가 커지거나 label이 겹친다. Flint의 categorical overflow는 단순 잘라내기가 아니라 category viewport rail로 표현될 수 있다. filter 후 total/count/start가 바뀌고 끝으로 스크롤한 상태에서 category가 삭제되면 start를 clamp해야 한다.

Flint planner가 다루는 항목은 step padding, elasticity, maxStretchX/Y, minStep/minBandStep/maxBandSize, facetElasticity/minSubplotSize/facetGap/column wrapping, continuous-axis ratio, band target aspect, cellGrowth, label font floor, group lane filling, rowNamesAbove, canvas fit/refit/treatment다. 전체 옵션명과 타입은 부록 및 JSON에 있다. 이름이 internal이라고 주석 처리된 옵션도 public AssembleOptions에 노출되어 있다는 사실을 기록하고 adapter policy로 직접지원/거부/내부전용을 구분한다.

필요한 neutral layout 결과는 `plotBox`, `contentBox`, `canvasBox`, child view boxes, axes/legend/title/source boxes, coordinate transforms, category viewport descriptors다. 하나의 숫자 width/height만 반환하면 host가 hit와 floating UI를 정렬할 수 없다. Table/Bar Table/Sparkline는 단일 plot이 아니라 text/tile/rule/plot view들의 구성이다. createAdjacentPlot으로 나란히 놓아 보이는 것만으로 공유 row grid·열 정렬·baseline이 맞지 않는다. row/column track layout을 명시적으로 모델링한다.

React wrapper fit은 `scale-down|crop|relayout` 세 가지다. 현 upstream은 relayout이 topology를 바꾸면 false를 반환하고 remount하며 이 경우 reader state가 유지되지 않는다고 명시한다. 목표 구현에서는 가능하면 semantic IDs로 rebase하여 state를 보존하고, 불가능하면 state loss를 설명해야 한다. source parity를 위해 현재 동작을 그대로 재현하는 모드와 개선된 host 정책을 구별한다. CSS scale로 줄인 canvas의 pointer 좌표, devicePixelRatio, page scroll, nested scroll, CSS transform이 selection geometry에 중복 적용되지 않게 한다.

필수 fixture는 320/640/1280 폭, 1/8/50/500 categories, 긴 영문/한글/숫자 labels, 1/4/25 facets, 공유/독립 scale, 열/행/양축 facet, nonuniform label widths, 모든 legend placement다. width가 한 px 변할 때 topology가 무한 oscillation하지 않는 안정성 테스트가 필요하다. 위 숫자는 제품 성능 주장이 아닌 제안하는 검증 grid다.

근거: [AssembleOptions](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L1469-L1717), [React fit과 state 제한](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/react/index.ts#L72-L126), [renderer layout 계약](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L74-L115).

## 7. interaction 23개: 호스트·gesture·의미·표현을 분리한다

현재 `mountChart`의 interaction 지원은 Vega-Lite에 집중되어 있다. `composeInteractiveOptions`는 backend가 vegalite가 아니면 code/spec interaction을 삭제하고 `interactions_ignored` warning을 추가한다. ECharts/Chart.js/Plotly adapter에는 category rail과 resize/destroy는 있으나 semantic applyUpdate/getState 계약이 구현되어 있지 않다. 따라서 upstream backend parameter를 ggaction으로 추가하기만 하면 interaction은 전부 사라진다. **이 hardcoded 검사부터 capability registry 기반으로 바꾸어야 한다.**

**Native backend 동작은 별도 요구사항이다.** Flint가 비-VL 경로를 static이라고 부르는 것은 공통 preset/update runtime이 없다는 뜻이다. ECharts template은 자체 tooltip과 hover emphasis를 생성한다. 예를 들어 Network Graph의 adjacency highlight와 force layout, Treemap의 breadcrumb/leafDepth는 실제 option에 들어간다. 반면 Tree expandAndCollapse와 graph/tree/treemap roam은 명시적으로 false다. 원본 엔진이 할 수 있는 기능 전체를 Flint의 제공 기능으로 부풀려서는 안 되며, 실제 생성한 native option의 동작은 ggaction에서도 보존해야 한다. `flint-native-behaviors.json`은 ECharts/Chart.js/Plotly template/assembler의 tooltip, emphasis, hover, force, breadcrumb, zoom/roam, animation 관련 선언과 source 위치를 추가 기록한다. 동작값이 false인 것은 disabled configuration이고, JS 함수가 있는 것은 브라우저 실행을 통해 별도 증명해야 한다. ([Graph 실제 옵션](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/graph.ts#L113-L143), [Tree의 명시적 비활성화](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/echarts/templates/tree.ts#L96-L111))

여러 chart를 연결하는 기능은 `linked-brush` preset 하나로 끝나지 않는다. public `LinkSpec.fields`와 chart별 send/receive, field별 `in|range` condition, hover의 transient layer, retained selection, global reset, source records에서 tuple 복원, `linked-selection` layer를 함께 처리해야 한다. 서로 다른 chart의 A/B field combination이 원래 존재하지 않는 조합까지 만들어내지 않는지 테스트하고, correlation-preserving tuple selection과 현재 upstream의 field-wise intersection 동작을 명시적으로 구별한다. host→chart→host feedback은 source와 update ID로 차단한다. ([link 계약](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/link.ts#L15-L118))

아래 표의 requires는 registry metadata다. 실제 chart/data/layout에서 support가 성립하는지는 runtime admission이 다시 결정한다. 원형 차트에 rectangle이 없거나 nominal 축에 continuous navigation이 없으면 명시적 rejection이 맞다. 상호작용 conflict는 gesture/target/state group 단위로 판단한다. 같은 plot drag를 pan과 rectangular brush가 동시에 소유하지 않게 modifier/mode 정책을 제시한다.

| ID / preset | gesture / requires | 실제 옵션·reset 계약 |
|---|---|---|
| FINT-001 / `click-highlight` | click; elements | `dimOpacity`, `targets`, `reset`; default reset: click-none, escape |
| FINT-002 / `axis-highlight` | click; discrete-axis | `axis`, `event`, `dimOpacity`, `reset`; default reset: click-none, escape |
| FINT-003 / `click-group-focus` | click; elements | `dimOpacity`, `groupBy`, `reset`; default reset: click-none, escape |
| FINT-004 / `hover-group-focus` | hover; elements | `groupBy`, `emphasis`, `dimOpacity`, `tolerance`; default reset:  |
| FINT-005 / `click-annotate` | click; elements | `dimOpacity`, `reset`; default reset: click-none, escape |
| FINT-006 / `select` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`; default reset: click-none, escape |
| FINT-007 / `lasso-select` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `reset`; default reset: click-none, escape |
| FINT-008 / `brush-x` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`; default reset: click-none, escape |
| FINT-009 / `brush-y` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`; default reset: click-none, escape |
| FINT-010 / `brush-angle` | drag; elements, angular-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`; default reset: click-none, escape |
| FINT-011 / `brush-zoom` | drag; navigation | `axes`, `guide`, `reset`, `transition`, `resetTransition`; default reset: double-click, escape |
| FINT-012 / `linked-brush` | drag; elements, cartesian-region | `match`, `dimOpacity`, `guide`, `mode`, `reset`, `groupBy`, `brush`; default reset: click-none, escape |
| FINT-013 / `legend-toggle` | click; legend | `mutedOpacity`, `reset`; default reset:  |
| FINT-014 / `context-activate` | context; elements | ; default reset:  |
| FINT-015 / `long-press` | long-press; elements | `holdMs`, `dimOpacity`, `reset`; default reset: click-none, escape |
| FINT-016 / `double-activate` | double; elements | `dimOpacity`, `reset`; default reset: click-none, escape |
| FINT-017 / `inspect` | inspect; elements | `mode`, `cycle`, `tolerance`, `guide`, `selector`, `dimOpacity`; default reset:  |
| FINT-018 / `inspect-index` | inspect; index | `axis`, `tolerance`, `show`, `seriesBy`, `displayValue`, `guide`, `selector`, `reset`; default reset: escape |
| FINT-019 / `navigate` | navigate; navigation | `axes`, `pan`, `zoom`, `wheelSensitivity`, `domainGuard`, `reset`, `resetTransition`; default reset: double-click |
| FINT-020 / `drag-reorder` | drag; reorder | `reset`; default reset:  |
| FINT-021 / `accessible-navigation` | keyboard; elements | `emphasis`, `dimOpacity`, `caption`, `sections`, `maxFields`; default reset:  |
| FINT-022 / `filter-controls` | widget;  | `fields`, `mode`, `placement`, `render`, `initial`, `dimOpacity`; default reset:  |
| FINT-023 / `context-menu` | widget; elements, cartesian-region | `items`, `gesture`, `dimOpacity`, `reset`, `render`; default reset: click-none, escape |

공통 runtime의 불변 조건은 다음과 같다.

- pointer hit는 renderer datum을 그대로 사용자에게 넘기지 않고 `{visual:{kind,role},elements:[{value,records}]}`로 변환한다. line/path/region/widget/handle/legend/axis/chart/title/header 역할을 보존한다. 한 semantic element가 여러 graphic primitive를 가질 수 있다.
- interaction state는 source data/graphicSpec의 임의 필드에 흩어놓지 않는다. selection, hidden legend values, viewport, category windows, category order, annotations, filters를 읽을 수 있는 session state owner가 필요하다.
- preview는 pointermove/rAF 동안 발생하고 commit은 완료 시, cancel은 Escape/pointercancel/lost capture 등에 발생한다. 취소 후 preview 자원이 남거나 committed selection이 지워지면 안 된다. reader/host를 구분하여 link feedback loop를 막는다.
- 여러 update는 ID를 가진 retained/preview layers로 합성한다. 같은 ID 재적용은 replacement, clearUpdate는 해당 update만 해제, setUpdates는 선언된 집합으로 교체한다. viewport는 최신 업데이트가 기존 viewport를 supersede하는 upstream 규칙을 adapter에서 구현한다.
- target resolution 결과에는 resolvedTargets/unresolvedTargets/unsupportedOps와 applied/partially-applied/unsupported를 반환한다. missing semantic key를 모두 대상으로 오해해서는 안 된다.
- mouse/pointer/touch/pinch/keyboard/assist-distance를 공통 plot coordinate space로 투영한다. brush hit inclusion은 glyph center인지 polygon intersection인지 shape별 계약을 정한다. 선 segment hit와 series-level selection을 구별한다.
- assist targeting은 화면 px 거리로 동작하고 zoom/CSS transform 이후에도 일정한 hit tolerance를 유지한다. invisible/filtered/decorative marks가 target 후보에 들어가지 않는다.
- accessible-navigation은 screen reader label을 넣는 것 이상의 기능이다. chart→title/axes/legend/header→series→mark 탐색 순서, roving focus, announce value, keyboard region creation/move/resize, focus restoration, visible focus ring까지 검증한다.
- filter controls, context menu, annotation editor, floating panel은 host DOM 계층이며 core graphics와 ownership을 분리한다. 데이터 값은 textContent로 렌더링하고 arbitrary HTML을 실행하지 않는다. custom SVG overlay는 별도 sanitize/allowlist 계약을 가진다.
- destroy는 pending frame/timer/pointer capture/ResizeObserver/listener/floating-panel/renderer resources를 모두 정리한다. 중복 destroy는 안전하고 늦게 완료되는 async mount/update가 disposed surface를 복구하지 않는다.

현재 ggaction의 selectMarks/highlightMarks/filterMarks/editMarkSelection은 프로그램 표현과 선택 결과를 만들 때 활용할 수 있다. 이것만으로 pointer session, legend toggle, keyboard navigation, viewport transform, live panel을 완성했다고 판단하지 않는다. pure selection predicate와 host event runtime, semantic update application을 나눈다.

근거: [비-VL interaction drop](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/spec/compose.ts#L25-L64), [admission/gesture 충돌](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/spec/admission.ts#L43-L119), [interaction 상태](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L325-L407).

## 8. 7가지 semantic update를 ggaction 액션으로 연결하는 계약

| 원본 update | neutral adapter의 처리 | 꼭 확인할 역연산/검증 |
|---|---|---|
| set-style | semantic selector→mark/guide owners→selection/highlight/style edit | 강조/음영/normal 복귀, 다른 update layer와 우선순위, unresolved target |
| set-annotation | semantic target anchor→annotation text/connector placement | offscreen이면 저장하되 inView=false, viewport 복귀 시 재등장, note ID 제거 |
| set-viewport | x/y domain 또는 geo region/camera 변경 | empty value home reset, log/time inverse, latest viewport supersession, animation settlement |
| set-order | category/series/facet ordering resource edit | field별 identity, unknown/missing values, visual and state order 일치 |
| set-overlay | 명명된 line/point/rule/rect/text data overlay | scale coordinate와 data provenance, clipping/z-order, remove by null |
| set-freeform-overlay | SVG/clone body와 screen/data anchors, transform | sanitization/clip/resource lifetime, resize/zoom anchor, export 포함 policy |
| set-data | main dataset replacement→의존 transform/materialization | IDs 유지/rebase, filter/selection의 유효성, source count와 hit records 일치 |

`set-freeform-overlay`를 generic chart authoring의 주 경로로 쓰면 안 된다. host가 임시 설명을 덧붙이는 기능과 원본 차트를 번역하는 기능을 분리한다. 차트 marks는 domain actions로 materialize하고 overlay는 별도 owner와 ephemeral/persisted 정책을 가진다.

현재 타입은 ChartState.selected/entries/hidden/viewport/windows/categoryOrder/annotations/filters를 반환한다. ChartChange는 changed facets, previous/current, source, phase, interactionId, action, target, geometry, reset을 가진다. 적용 후 render가 끝난 시점의 state를 보고하고, 변하지 않은 상태에 중복 change를 난사하지 않는 계약이 필요하다. onInteraction은 state 변화가 없어도 gesture를 보고하므로 onChange와 합치지 않는다.

근거: [7 update ops](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L227-L278), [UpdateResult](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/language/updates.ts#L36-L41), [ChartChange](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L24-L69).

## 9. 애니메이션: 현재 범위와 완전한 목표를 구분한다

Flint의 viewport animation은 실제 구현이다. 타입 주석은 projected charts를 강조하지만 Cartesian navigation-scale도 tween을 수행한다. transformed axis space에서 center는 선형, span은 기하 보간하고 easeInOut를 적용하므로 log 축의 확대가 일정하게 보인다. host applyUpdate({transition:{duration}})는 마지막 render frame까지 기다리고 gesture-driven transition은 다음 입력을 막지 않는다. 새 transition은 이전 것을 취소하며 reset flight도 있다. geo는 extent/rotation과 detail-level 전환을 함께 처리한다.

다만 이 조사에서 general mark enter/update/exit, arbitrary chart morph, keyframe timeline, seek/record/export를 Flint public 계약으로 확인하지는 못했다. 이러한 기능은 사용자 목표의 “애니메이션도 다”를 완성하기 위한 **ggaction 확장 요구**로 분리한다. backend의 기본 ECharts/Plotly animation을 Flint의 공통 animation grammar로 오인하지 않는다.

필수 설계는 다음이다.

1. immutable ChartProgram A/B와 stable semantic owner/row keys로 element correspondence를 만든다. index-based 매칭은 filtering/reorder에서 잘못 연결되므로 금지한다.
2. animation session은 시작/목표 program과 timing, easing, stagger, interpolation policy, interruption policy를 가진다. semanticSpec은 최종 의미를 보존하고 frame마다 public action trace를 수천 번 추가하지 않는다. 각 frame은 graphics에서 계산하지만 source meaning은 양 끝 프로그램으로 추적된다.
3. coordinate와 scales 변화는 semantic-space/graphic-space 중 어떤 보간인지 명시한다. log domain은 transform-space, angle은 shortest/wrapped policy, color는 명시된 color space, path는 compatible topology 여부가 필요하다. 다른 topology는 cross-fade 등 선택된 fallback을 보고한다.
4. viewport pan/zoom, category reorder, filter enter/exit, value change, theme change, facet/composition resize, map rotation/projection/LOD를 각각 지원 case로 둔다. 한 animation에 decoration이 날아다니고 data mark가 다른 시점에 도착하지 않게 dependency timing을 정의한다.
5. reduced-motion과 duration=0은 즉시 최종상태로 이동하고 change events/Promise 결과가 일반 경로와 동일하다. cancel/interrupt/seek/end/dispose를 test clock으로 재현한다.
6. deterministic frame render API가 있어야 영상/GIF export, screenshot oracle, headless CI가 가능하다. wall-clock/rAF 성능 테스트와 numeric interpolation 테스트를 분리한다. immutable graph를 매 frame 전체복제하는 방식의 memory cost를 측정한다.

근거: [Cartesian tween](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/interactions/navigation-scale.ts#L95-L216), [host update settlement](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/interactions/runtime.ts#L1434-L1474).

## 10. Geo: projection 하나로 끝나지 않는 필수 범위

Flint Map은 lon/lat point와 basemap, Choropleth는 region ID와 color를 결합한다. US/world 자동판정과 explicit override, state/country 이름·short code·numeric ID gazetteer가 있고 Plotly는 별도의 geographic trace를 사용한다. 세계 지도 projection 선택은 mercator/equalEarth/orthographic/stereographic/conicEqualArea/conicEquidistant/azimuthalEquidistant/mollweide 8개이며 US 기본 albersUsa와 내부 pre-projected identity path도 있다. center preset은 19개다. orthographic globe는 Sphere를 기준으로 fit하고 sea/rim/no-data land를 decorative layer로 구분한다.

Choropleth는 US state/county/auto detail을 지원하고 custom `levels:[{value,url,feature?,enter?,exit?}]`, `featureKey`, `baseMapUrl`로 임의 GeoJSON/TopoJSON의 다중 레벨 지도를 만든다. default custom projection은 mercator다. detail level마다 zoom threshold를 두고 projection/camera가 변할 때 active level과 focus region을 상태로 반환한다. geography 자체는 mark인데 no-data base land는 선택 data mark가 아니다.

완전한 source-neutral 확장에는 아래가 필요하다.

- **Data/resource**: GeoJSON Feature/FeatureCollection, GeometryCollection 및 Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon; TopoJSON object 선택→decode; explicit featureKey와 row join; missing/duplicate join diagnostics; feature ID와 source row lineage를 분리한다. geometry index와 measures update를 분리해 값이 바뀔 때 모든 polygon을 다시 parse하지 않는다.
- **Coordinate**: geographic coordinate resource에 projection type/parameters/rotation/center/parallels/scale/translate/fit/clip을 저장한다. 렌더러가 browser projection 함수를 암묵적으로 호출하지 않고 materializer가 path/point를 만든다. viewport pointer inverse는 같은 projection definition에서 계산한다.
- **Geometry**: antimeridian cut, hole winding, ring closure, multipolygon islands, sphere clipping, horizon/backface, adaptive resampling, large coordinate bounds를 처리한다. projected planar geometry를 spherical lon/lat로 다시 해석하지 않는다. point symbol 크기는 지도 확대와 함께 원치 않게 확대하지 않는다.
- **Guide/theme**: sequential/diverging/quantized color legend, geographic graticule 필요 시, region label/collision, no-data land/sea/rim/border. 알려진 지역에만 값이 있어도 바탕 국가가 구멍처럼 사라지지 않게 한다.
- **Camera/runtime**: anchor-preserving pan/zoom, orthographic globe drag rotation, wrapped longitude, region fit, reset, clamp/overscroll/min/max visible fraction, camera tween, LOD hysteresis, geo focus region lookup. viewport copy/reload 시 exact camera와 logical lon/lat range가 서로 drift하지 않아야 한다.
- **Hit**: polygon interior와 hole, antimeridian을 넘는 지역, hidden globe backside, LOD 전환 전후 target identity, region selection+annotation을 검증한다. geometric pixel bounding box만으로 polygon을 선택하면 바다/구멍도 맞는 오류가 생긴다.
- **Assets**: world/us basemap의 remote URL을 core에 하드코딩하지 않는다. host resource resolver가 URL/inline/local/bundled asset을 처리하고 version/hash/license/cache/offline policy를 관리한다. URL loading 실패는 빈 지도 성공으로 처리하지 않는다.

필수 수치·기하 fixture는 (0,0), ±180° 근처, ±90° 근처, Aleutian wrapping, polygon hole, MultiPolygon island, Alaska/Hawaii inset, reverse-wound ring, degenerate ring, unknown ISO/FIPS, string/number ID, custom country levels, tiny island를 포함한다. projection forward/inverse 오차는 singularity/clipped 영역을 제외한 지점에 대해 명시된 단위 tolerance를 적용하고, clipping된 지점은 NaN path가 아닌 explicit no-geometry 결과여야 한다. 단계가 어렵다는 이유로 geo를 최종 완료 범위 밖으로 밀면 안 된다.

근거: [projection·center·basemap](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/map.ts#L31-L194), [custom geography](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/templates/map.ts#L548-L695), [map navigation와 spherical geometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/vegalite/interactions/navigation-geo.ts#L1-L152).

## 11. host adapter 구현 순서와 API 경계

현재 공개 연결점은 `mountInteractiveChartSurface(container,input,adapter,options)`이고 `InteractiveRendererAdapter`는 `mount(container,input):Promise<InteractiveRenderer>`만 요구한다. 하지만 minimal interface를 만족하는 것과 full feature support는 다르다. full adapter는 viewports/setViewports/destroy 외 layout/getViewports/getViewportGeometry/getInteractionContext/getState/onChange/resize/relayout/refresh/applyUpdate/setUpdates/clearUpdate를 구현해야 한다.

다음은 **외부 adapter 패키지의 제안 계약**이다. ggaction public API라는 뜻이 아니다.

```ts
interface PreparedChart {
  program: ChartProgram;
  manifest: {
    fields: FieldMeaning[];
    views: ViewMeaning[];
    marks: MarkMeaning[]; // neutral owner ids; never raw backend scene nodes
    provenance: ProvenanceIndex;
    capabilities: ResolvedCapability[];
    resources: ResourceRef[];
  };
  diagnostics: Diagnostic[];
}
interface AdapterCompiler {
  prepare(input: ChartAssemblyInput, context: CompileContext): PreparedChart;
  update(previous: PreparedChart, change: InputChange): PreparedChart;
}
interface Session {
  getProgram(): ChartProgram;
  getState(): NeutralChartState;
  resolveHit(hit: RenderHit): SemanticTarget | null;
  apply(update: NeutralUpdate, options: ApplyOptions): Promise<ApplyResult>;
  relayout(size: AvailableSize): Promise<{inPlace: boolean; state: NeutralChartState}>;
  destroy(): void;
}
```

핵심은 manifest를 두 번째 geometry 저장소로 만들지 않는 것이다. geometry는 ggaction graphicSpec, meaning은 semanticSpec/neutral semantic selection metadata에 있고 adapter manifest는 외부 field/channel/semantic ID를 이 owner들과 연결한다. source shape를 그대로 두는 opaque blob으로 일반 액션을 우회하지 않는다. host gesture runtime과 UI widget은 adapter/session 계층이며 순수 ChartProgram의 immutable state와 별개다. 영속 interaction 선언 및 save할 state는 명시적으로 serialize한다.

실제 작업 항목은 다음 순서다.

1. **공개 compile 계약**: Flint upstream의 backend-neutral analyzed input/layout/design와 template metadata의 export 범위를 정한다. metadata-only module이 Vega/DOM dependency를 강제로 로드하지 않게 한다.
2. **정적 adapter**: 범위가 허용된 chartType을 semantic operations→data actions→marks/encodings→guides/theme→composition으로 변환한다. 51 literal 이름 모두를 인식하고 disposition을 반환한다. KPI/Gauge는 제외 진단, dual-Y는 금지 진단이다. 허용 이름과 Doughnut/Funnel alias는 외부 계층에서 처리한다. unmapped property는 error/diagnostic이다.
3. **capability registry**: backend availability를 정적 chart support + per-input semantic capabilities + export targets로 분리한다. `InteractiveBackend` union, mountChart switch, composeInteractiveOptions의 non-VL drop, validate의 backend check, package exports, React backend prop, MCP/backend enum, Python compiler route, site backend picker를 함께 검토한다.
4. **semantic selection/runtime**: mark/axis/legend/header hit metadata와 lineage, all seven update ops, preview/retained/reset, target resolution, onChange/onInteraction을 구현한다.
5. **host widgets**: surfaces의 controls/context-menu/floating panels/links를 재사용 또는 port하고, backend-private scenegraph 접근을 neutral runtime contract로 치환한다. 불가능한 capability는 admission에서 구체적으로 실패한다.
6. **mount lifecycle**: lazy load, async resource resolve, cancel token, pending mount/update disposal, resize/relayout state rebase, multiple simultaneous charts isolation을 구현한다.
7. **static/export routes**: renderSvg는 현재 VL/EC만 지원한다. ggaction svg/pdf/png adapter를 추가해 wrapper와 geometry가 일치하게 한다. Excel은 native workbook artifact와 그림 삽입을 구분한다. native Excel semantic chart 지원이 없는 chart를 이미지로 바꿔도 “동일 backend 기능”이라고 표시하지 않는다. Image-Charts URL output은 host/compiler 기능으로 남긴다.
8. **authoring/agent integration**: chart options/pivots/transforms, theme guidance, recommended channel/type, validation diagnostics, accessible tabular data를 backend가 바뀌어도 사용할 수 있게 한다. JSON schema에 backend-independent capabilities와 unsupported reasons를 노출한다.

근거: [mount facade switch](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/index.ts#L207-L299), [adapter/surface types](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L94-L191), [custom surface entry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/surface.ts#L207-L216), [static SVG](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/render/index.ts#L6-L58).

## 12. test와 합격 기준: 숫자·그림·상호작용을 함께 검증한다

이 문서의 874 요구사항과 chart-datasets/corpus 요구사항을 하나의 traceability manifest에 연결한다. 테스트 결과는 `requirementId,sourceCommit,fixtureHash,adapterCommit,programHash,oracleVersion,renderer,viewport,fontSet,result,evidencePath`를 가진다. unsupported가 있으면 coverage 계산에서 drop하지 않고 실패 또는 명시적 미구현으로 남긴다.

**Layer A, pure numeric/data**: aggregates/bin/window/stack/rank/density/regression/ECDF/hierarchy/flow/projection을 independently computed oracle로 검증한다. total sum, probability area, sorted rank, edge conservation, ring containment 등 property invariant도 사용한다. 원본 row mutation과 nondeterministic random seed를 검출한다.

**Layer B, semantic/program**: every chart and option maps to expected domain actions and semantic resources; no raw createGraphics-only translation. edit/rematerialization dependency closure, resource ambiguity errors, action trace, serialization/load, frozen prior program invariants를 확인한다. action count가 차트 크기와 무조건 O(rows)로 늘어나는 생성 방식을 피한다.

**Layer C, geometry/layout**: mark count만 보지 않고 positions/extents/path topology, scale domains/zero/baselines, guides, label bounding boxes, row/column alignment, legend color mapping, polar angles/radii, clipping, composition transforms를 검증한다. generated expected from target renderer는 oracle가 아니다.

**Layer D, visual**: 고정 font·DPR·viewport·locale·timezone에서 pinned upstream output과 target canvas/svg/png/pdf를 렌더링하고 semantic masks + geometric tolerances + perceptual diff + representative manual review를 한다. 서로 다른 backend의 default smoothing을 같은 정답으로 섞지 않는다. mismatch를 numerical/data/design/text/render-layer로 분류하고 큰 diff를 threshold 올려 덮지 않는다.

**Layer E, real interaction**: pointer move/down/up/cancel, drag out of viewport, wheel/pinch, modifiers, touch long press, keyboard arrows/Home/End/Enter/Escape, focus restoration, controls/menu/annotation/link chain를 실제 DOM으로 실행한다. event payload와 visible marks와 getState를 동시에 확인한다. tooltip이 안 보이는데 event만 발행되면 실패다.

**Layer F, animation**: deterministic clock t=0/0.25/0.5/1, interrupt/cancel/reset/dispose, identity reorder, log/polar/geo discontinuity, reduced motion, finalstate hash, promise settlement, no endlessframes를 검증한다. 60fps 주장은 측정한 장비·size·P95 frametime과 함께만 한다.

**Layer G, integration/package**: `npm pack` clean consumer, SSR no DOM import, tree-shaking/lazy peer deps, ESM/CJS/types, Python/MCP route, React StrictMode mount/unmount, CSP interpreter, asset failure/offline, data URL policy, SVG sanitization, image export fonts, accessibility output를 확인한다. 최소 의존성 registry probe에서 d3-format 직접 import가 package dependencies에 보이지 않았으므로, upstream bundle output이 이를 포함하는지 clean package consumer test로 확인해야 한다. 현재 source import만으로 published package broken이라고 단정하지 않는다.

property coverage는 binary 양쪽, enum 모든값, continuous min/mid/max 및 invalid boundary, applicability eligible/ineligible, value omitted/explicit default를 포함한다. 전체 곱이 너무 크면 pairwise+high-risk interaction combinations를 쓰되 누락 행을 기록하고 “all options” 완료 여부를 개별 requirement로 계산한다. 예를 들어 log + negative data, facet + independent scale + legend toggle, geo + LOD + annotation + resize, static-series + filter + selection lineage, theme wrap + tiny canvas + DPR=2는 반드시 직접 포함한다.

## 13. 구현 단계와 의존성

| 단계 | 산출물 | 종료조건 | 다음 단계의 의존성 |
|---|---|---|---|
| P0-a: 기준 고정 | snapshots/catalog/requirements/reference renderer harness | 모든 실제 registry row와 숨은 property가 추적됨; 분모 불일치 설명 | 모든 구현 |
| P0-b: 의미·ID·provenance | row/owner/series/facet identity, selectors, hit manifest, update state schema | aggregate/fold/bin/stack에서도 value+records 왕복 | interaction, animation, geo |
| P0-c: composition/layout/design | shared tracks/scales/roles, resolvedtheme/guide policies | small/large/faceted document charts geometry 맞음 | static fullcoverage |
| P1-a: 기존 chart parity | 원본 51행을 보존한 허용 Cartesian/polar/statistical 옵션 | upstream fixture + edgefixture + rendered evidence | host연결 |
| P1-b: 신규 geometry/layout | contour/calendar/hierarchy/graph/flow/Pyramid + partition/UpSet/inference/bundling | 수치 oracle+geometry invariants+source/USR disposition 누락없음 | full chartgoal |
| P1-c: geo 전체 | source-neutral geographic data/coordinate/materializer/runtime | 8projection+US+customlevels+camera/LOD/selection/export | geo completion |
| P1-d: interaction runtime | 23presets+7ops+controls/links/accessibility | real-input state/event/visible output합치 | backend readiness |
| P1-e: animation | viewport+general mark/composition/geo transitions | deterministic frames/interruption/settlement | user animationgoal |
| P2: external integration | Flint adapter/publicregistry/React/MCP/Python/export/docs | upstream-compatible host scenarios+cleanpackage | release candidate |
| P2: exhaustive closure | row-by-row evidence manifest and resolved gaps | unimplemented/unknown=0 for agreed pinned scope; independent visual review | release |

P1 안의 독립 계산 작업은 병렬화할 수 있다. 그러나 “geo나 interaction을 차후 버전으로 넘기고 이번 범위를 완성했다고 선언”하는 것은 허용하지 않는다. 현재 요청은 구현 자체가 아니라 구현 가능할 정도의 보고서이며, 실제 public API/schema/architecture 구현은 별도 작업이며 기존 repository 계약과 개정된 사용자 범위를 따라 검증해야 한다.

## 14. 라이선스·폰트·asset 및 외부 의존성

Flint code는 MIT이고 배포되는 LICENSE/copyright를 보존한다. theme 이름이 외부 브랜드에서 영감을 얻었더라도 brand assets/font 자체를 MIT로 추정하면 안 된다. core theme preset은 system-font fallback과 named font family를 지정하며, site에는 Kalam TTF, MCP assets에는 LiberationSans/DejaVuSans TTF가 별도로 있다. reference fidelity는 `FontManifest{family,file,hash,license,fallback}`로 관리하고 CI에서 실제 선택된 font를 기록한다. 시스템에서 빠진 font가 비슷하게 보여도 exact text layout proof로 인정하지 않는다.

Map source의 world/us URL은 vega.github.io의 versionless asset URL이다. 다운로드된 geography의 origin/version/hash/license 및 joins를 고정한 local test fixture를 별도로 만들어야 재현 가능하다. 라이브 URL을 매 테스트마다 사용해 baseline이 변하게 하지 않는다. custom geography와 SVG furniture는 host가 제공하는 resource이며 source-neutral resolver가 접근·캐싱·실패·export embedding을 처리한다.

npm runtime dependencies는 @floating-ui/dom, d3-time, d3-time-format이고 optional peers는 Vega/Vega-Lite/vega-tooltip, ECharts, Chart.js, Plotly, React다. 새 backend는 필요한 peer만 lazy load해야 한다. image-charts URL은 image-charts.com 외부 서버가 그리는 결과이므로 offline standalone ggaction render와 서비스 availability/transport/privacy 조건이 다르다. adapter가 URL을 만드는 경우 실제 network fetch 여부를 호출자에게 노출한다.

근거: [LICENSE](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/LICENSE#L1-L21), [dependency declarations](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/package.json#L143-L210), [hosted image backend](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/image-charts/index.ts#L5-L27).

> 아래 부록의 KPI/Gauge/Funnel/independentYAxis 등은 **고정된 외부 소스의 원문 인벤토리**다. 신규 구현 목표나 공개 API 권장명이 아니다. 최종 대상은 scope-policy/target-chart-mapping과 부록 F로 판정한다.

## 부록 A. 모든 backend-template의 channels와 registry property

이 표는 runtime registry의 전체 등록을 그대로 나열한다. property의 default/min/max/options/동적 applicability/encoding action은 JSON에 전부 들어 있다. chartProperties의 실제 코드 접근은 `flint-property-accesses.json`을 함께 읽어야 한다. 같은 이름의 chart라도 backend마다 옵션이 다르며 합집합을 지원해야 “모든 Flint 기능” 목표를 충족한다.

| backend / chart | 채널 | registry properties |
|---|---|---|
| VL / Scatter Plot | x, y, color, size, shape, detail, opacity, column, row | opacity, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Marginal Plot | x, y, color, size, shape, opacity | marginal, opacity, stackMode, bandwidth, binCount, whiskerMethod, showOutliers, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Regression | x, y, size, color, column, row | regressionMethod, polyOrder, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Connected Scatter Plot | x, y, order, color, detail, column, row | independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Ranged Dot Plot | x, y, color | logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Strip Plot | x, y, color, size, column, row | stepWidth, pointSize, opacity, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Bar Chart | x, y, color, opacity, column, row | cornerRadius, independentYAxis, xAxisType, yAxisType, showValueLabels |
| VL / Grouped Bar Chart | x, y, group, color, column, row | dodge, independentYAxis, showValueLabels |
| VL / Stacked Bar Chart | x, y, color, column, row | stackMode, independentYAxis, showValueLabels |
| VL / Lollipop Chart | x, y, color, column, row | dotSize, independentYAxis, xAxisType, yAxisType, showValueLabels |
| VL / Waterfall Chart | x, y, color, column, row | cornerRadius, totals, showValueLabels, independentYAxis |
| VL / Gantt Chart | y, x, x2, color, detail, column, row | taskHeight, cornerRadius, intervalLabels, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Bullet Chart | y, x, goal, color, column, row | independentYAxis |
| VL / Histogram | x, color, column, row | binCount, independentYAxis |
| VL / Density Plot | x, color, column, row | bandwidth, opacity, stackMode, independentYAxis |
| VL / Ridgeline Plot | x, y, color | overlap, interpolate, opacity, order, tailCut, colorBy, perspective, skew, tilt, markAt, valueMax, bandwidth |
| VL / ECDF Plot | x, color, detail, column, row | showPoints, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Violin Plot | x, y, color, row | bandwidth, showPoints, showMedian, showContour, widths, medianWidth, independentYAxis |
| VL / Boxplot | x, y, color, opacity, column, row | whiskerMethod, showPoints, showOutliers, dodge, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Pyramid Chart | x, y, color | showValueLabels |
| VL / Candlestick Chart | x, open, high, low, close, column, row | independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Line Chart | x, y, color, strokeDash, detail, opacity, column, row | interpolate, showPoints, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y, xAxisType, yAxisType |
| VL / Sparkline | x, y, color, detail, row, column | interpolate, baseline, trendWidth, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Bump Chart | x, y, color, detail, column, row | interpolate, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Slope Chart | x, y, color, detail, column, row | showText, showSeriesInLabel, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Area Chart | x, y, color, opacity, column, row | interpolate, opacity, stackMode, independentYAxis, xAxisType, yAxisType |
| VL / Streamgraph | x, y, color, column, row | interpolate, independentYAxis |
| VL / Range Area Chart | x, y, y2, color, column, row | interpolate, opacity, independentYAxis |
| VL / Pie Chart | size, color, column, row | innerRadius, sortSlices, independentYAxis, showValueLabels |
| VL / Donut Chart | size, color, column, row | innerRadius, sortSlices, independentYAxis, showValueLabels |
| VL / Rose Chart | x, y, color, column, row | padAngle, alignment, sortSlices, independentYAxis, showValueLabels |
| VL / Radar Chart | x, y, color, column, row | filled, fillOpacity, strokeWidth, independentYAxis, logScale_x, logScale_y, includeZero_x, includeZero_y |
| VL / Heatmap | x, y, color, column, row | showValueLabels, independentYAxis, xAxisType, yAxisType |
| VL / Calendar Heatmap | x, color | cornerRadius |
| VL / Bar Table | y, x, color, column, row | maxRows, showPercent, independentYAxis |
| VL / KPI Card | metric, value, goal | layout, style, behindThreshold |
| VL / Table |  |  |
| VL / Map | longitude, latitude, color, size, opacity | region, projection, projectionCenter |
| VL / Choropleth | id, color, detail | region, level, projection, projectionCenter |
| EC / Scatter Plot | x, y, color, size, opacity, column, row | opacity |
| EC / Regression | x, y, size, color, column, row | regressionMethod, polyOrder |
| EC / Connected Scatter Plot | x, y, order, color, detail, column, row |  |
| EC / Ranged Dot Plot | x, y, color |  |
| EC / Boxplot | x, y, color, opacity, column, row | whiskerMethod, showPoints, showOutliers, dodge |
| EC / Strip Plot | x, y, color, size, column, row |  |
| EC / Bar Chart | x, y, color, opacity, column, row | cornerRadius |
| EC / Grouped Bar Chart | x, y, group, color, column, row | dodge |
| EC / Stacked Bar Chart | x, y, color, column, row | stackMode |
| EC / Lollipop Chart | x, y, color, column, row | dotSize |
| EC / Pyramid Chart | x, y, color |  |
| EC / Heatmap | x, y, color, column, row |  |
| EC / Calendar Heatmap | x, color |  |
| EC / Line Chart | x, y, color, strokeDash, opacity, column, row | interpolate, showPoints |
| EC / Bump Chart | x, y, color, detail, column, row |  |
| EC / Slope Chart | x, y, color, detail, column, row |  |
| EC / Area Chart | x, y, color, opacity, column, row | interpolate, opacity, stackMode |
| EC / Streamgraph | x, y, color, column, row |  |
| EC / Range Area Chart | x, y, y2, color, column, row |  |
| EC / Pie Chart | size, color, column, row | innerRadius, cornerRadius, sortSlices, labelType |
| EC / Funnel Chart | y, size | sort, orient, gap |
| EC / Treemap | color, size, detail | breadcrumb |
| EC / Sunburst Chart | color, size, detail, group | innerRadius, labelRotate |
| EC / Tree | color, detail, size | orient |
| EC / Histogram | x, color, column, row | binCount |
| EC / Density Plot | x, color, column, row | bandwidth |
| EC / ECDF Plot | x, color, detail, column, row | showPoints |
| EC / Parallel Coordinates | color, detail |  |
| EC / Candlestick Chart | x, open, high, low, close, column, row | showMA, maWindow |
| EC / Waterfall Chart | x, y, color, column, row |  |
| EC / Gantt Chart | y, x, x2, color, detail, column, row | taskHeight, cornerRadius, intervalLabels |
| EC / Bullet Chart | y, x, goal, color, column, row |  |
| EC / Radar Chart | x, y, color, column, row | shape, filled, fillOpacity |
| EC / Rose Chart | x, y, color, column, row | alignment, sortSlices |
| EC / Gauge Chart | size, column | min, max, showProgress |
| EC / Sankey Diagram | x, y, size | orient, nodeWidth, nodeGap |
| EC / Network Graph | x, y, size | layout |
| CJ / Scatter Plot | x, y, color, size, opacity, column, row | opacity |
| CJ / Connected Scatter Plot | x, y, order, color, detail, column, row |  |
| CJ / Bubble Chart | x, y, size, color, opacity, column, row | opacity |
| CJ / Strip Plot | x, y, color, size, column, row | stepWidth, pointSize, opacity |
| CJ / Bar Chart | x, y, color, opacity, column, row | cornerRadius |
| CJ / Grouped Bar Chart | x, y, group, color, column, row | dodge |
| CJ / Stacked Bar Chart | x, y, color, column, row |  |
| CJ / Lollipop Chart | x, y, color, column, row | dotSize |
| CJ / Combo Chart | x, y, column, row | cornerRadius |
| CJ / Histogram | x, color, column, row | binCount |
| CJ / Waterfall Chart | x, y, color, column, row |  |
| CJ / Gantt Chart | y, x, x2, color, column, row | taskHeight, cornerRadius, intervalLabels |
| CJ / Line Chart | x, y, color, opacity, column, row | interpolate |
| CJ / Bump Chart | x, y, color, detail, column, row |  |
| CJ / Slope Chart | x, y, color, detail, column, row |  |
| CJ / Area Chart | x, y, color, opacity, column, row | interpolate, opacity, stackMode |
| CJ / Range Area Chart | x, y, y2, color, column, row |  |
| CJ / ECDF Plot | x, color, detail, column, row | showPoints |
| CJ / Pie Chart | size, color, column, row | innerRadius, sortSlices |
| CJ / Doughnut Chart | size, color, column, row | innerRadius, sortSlices |
| CJ / Radar Chart | x, y, color, column, row | filled, fillOpacity |
| CJ / Rose Chart | x, y, color, column, row | alignment, sortSlices |
| PL / Scatter Plot | x, y, color, size, shape, opacity, column, row | opacity |
| PL / Regression | x, y, size, color, column, row | regressionMethod, polyOrder, opacity |
| PL / Connected Scatter Plot | x, y, order, color, detail, column, row |  |
| PL / Ranged Dot Plot | x, y, color |  |
| PL / Strip Plot | x, y, color, size, column, row |  |
| PL / Bar Chart | x, y, color, opacity, column, row | cornerRadius |
| PL / Grouped Bar Chart | x, y, group, color, column, row |  |
| PL / Stacked Bar Chart | x, y, color, column, row | stackMode |
| PL / Lollipop Chart | x, y, color, column, row | dotSize |
| PL / Waterfall Chart | x, y, color, column, row | totals, showTextLabels |
| PL / Pyramid Chart | x, y, color |  |
| PL / Histogram | x, color, column, row | binCount |
| PL / Boxplot | x, y, color, column, row | showPoints, showOutliers |
| PL / Violin Plot | x, y, color, column, row | showBox, showPoints |
| PL / Density Plot | x, color, column, row | bandwidth |
| PL / ECDF Plot | x, color, detail, column, row | showPoints |
| PL / Candlestick Chart | x, open, high, low, close, column, row | showMA, maWindow |
| PL / Density Contour | x, y, column, row | binCount, showPoints |
| PL / Line Chart | x, y, color, strokeDash, opacity, column, row | interpolate, showPoints |
| PL / Area Chart | x, y, color, opacity, column, row | interpolate, opacity, stackMode |
| PL / Bump Chart | x, y, color, detail, column, row |  |
| PL / Slope Chart | x, y, color, detail, column, row |  |
| PL / Streamgraph | x, y, color, column, row |  |
| PL / Range Area Chart | x, y, y2, color, column, row | opacity |
| PL / Pie Chart | size, color | sortSlices, labelType |
| PL / Donut Chart | size, color | innerRadius, sortSlices, labelType |
| PL / Radar Chart | x, y, color, column, row | filled, fillOpacity |
| PL / Rose Chart | x, y, color | sortSlices |
| PL / Heatmap | x, y, color, column, row |  |
| PL / Gantt Chart | y, x, x2, color, detail, column, row | taskHeight, cornerRadius, intervalLabels |
| PL / Bullet Chart | y, x, goal, color, column, row |  |
| PL / KPI Card | metric, value, goal | layout |
| PL / Sparkline | x, y, color, detail | baseline, trendWidth |
| PL / Bar Table | y, x, color, column, row | maxRows, showPercent |
| PL / Map | longitude, latitude, color, size, opacity | region, projection, projectionCenter |
| PL / Choropleth | id, color, detail | region |
| PL / Funnel Chart | y, size | sort |
| PL / Gauge Chart | size, column | min, max |
| XL / Bar Chart | x, y, color |  |
| XL / Grouped Bar Chart | x, y, group |  |
| XL / Stacked Bar Chart | x, y, color |  |
| XL / Pyramid Chart | x, y, color |  |
| XL / Line Chart | x, y, color, strokeDash |  |
| XL / Area Chart | x, y, color |  |
| XL / Scatter Plot | x, y, color, size |  |
| XL / Connected Scatter Plot | x, y, order, color, detail |  |
| XL / Pie Chart | color, size, theta |  |
| XL / Donut Chart | color, size, theta |  |
| XL / Histogram | x, color |  |
| XL / Boxplot | x, y, color |  |
| XL / Candlestick Chart | x, open, high, low, close |  |
| XL / Waterfall Chart | x, y, color |  |
| XL / Radar Chart | x, y, color |  |
| XL / Funnel Chart | y, size |  |
| XL / Treemap | color, size, detail |  |
| XL / Sunburst Chart | color, size, group, detail |  |

## 부록 B. 중요한 타입의 모든 직접 선언 필드

타입의 nested field/union/주석/상속·source line은 `flint-api-types.json`에 있다. 아래 필드 이름표를 구현 체크리스트로 쓰되 inherited fields와 implementation-only behavior를 생략해서는 안 된다.

| 타입 / source | 직접 선언 필드 |
|---|---|
| [SemanticAnnotation](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/field-semantics.ts#L50-L101) | `semanticType`, `intrinsicDomain`, `unit`, `divergingMidpoint`, `sortOrder`, `colors`, `polarity` |
| [FormatSpec](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/field-semantics.ts#L104-L113) | `pattern`, `prefix`, `suffix`, `abbreviate` |
| [DomainConstraint](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/field-semantics.ts#L116-L121) | `min`, `max`, `clamp` |
| [TickConstraint](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/field-semantics.ts#L124-L131) | `integersOnly`, `exactTicks`, `minStep` |
| [ChartState](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/interaction-contracts.ts#L364-L381) | `chartType`, `selected`, `entries`, `hidden`, `viewport`, `windows`, `categoryOrder`, `annotations`, `filters` |
| [TypeRole](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L69-L83) | `family`, `size`, `weight`, `style`, `case`, `color` |
| [AxisRole](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L85-L121) | `line`, `lineWeight`, `color`, `ticks`, `tickLength`, `tickDirection`, `labelGap`, `placement`, `tickLabels`, `tickDensity`, `suppressWhenValuesPrinted` |
| [ThemeInk](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L138-L266) | `surface`, `text`, `structure`, `series`, `accent` |
| [ThemeType](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L271-L293) | `minSize`, `headline`, `deck`, `axisLabel`, `axisTitle`, `valueLabel`, `keyLabel`, `keyTitle`, `annotation`, `footnote`, `kicker`, `display` |
| [ThemeStructure](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L295-L365) | `axis`, `grid`, `frame`, `baseline` |
| [ThemeMarks](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L367-L533) | `bandFraction`, `group`, `areaEdge`, `barOpacity`, `barMinLength`, `gradient`, `strokeWeight`, `strokeCap`, `strokeJoin`, `interpolation`, `fillOpacity`, `cornerRadius`, `outline`, `sizeRange`, `minSize`, `zOrder`, `separator`, `slice`, `arc`, `tile`, `point`, `connector`, `trailingFill`, `interval`, `summary`, `observations`, `reference`, `redundantEncoding`, `redundantChannels`, `texture` |
| [ThemeLabelFit](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L549-L558) | `minChars`, `turnedLimit`, `gap`, `rowLimit` |
| [ThemeLabels](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L560-L587) | `truncation`, `rowNames`, `flush`, `overflow`, `fit` |
| [ThemeLegend](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L592-L644) | `show`, `placement`, `direction`, `title`, `gradientLength`, `maxSwatches`, `swatch`, `arrangement`, `titlePosition`, `align`, `gaps`, `suppressWhenAxisNames`, `suppressWhenValuesPrinted`, `endValue` |
| [ThemeDataLabels](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L646-L662) | `show`, `placement`, `inkMode`, `anchor`, `fallback`, `minContrast` |
| [ThemeAnnotation](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L664-L715) | `unit`, `axisTitles`, `axisTitlePlacement`, `axisTitleGap`, `unitsInAxisTitle`, `numberFormat`, `pointEmphasis`, `pointLabels`, `statistics` |
| [ThemeFurniture](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L736-L769) | `kind`, `at`, `frame`, `align`, `anchor`, `color`, `width`, `height`, `text`, `type`, `svg`, `src`, `href`, `alt` |
| [ThemeSource](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L775-L805) | `show`, `leadIn`, `leadInWeight`, `leadInStyle`, `leadInCase`, `align`, `frame`, `rule`, `credit`, `gap` |
| [ThemeFacets](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L807-L814) | `header`, `panelFrame`, `axisRepetition`, `spacing`, `preferredColumns`, `sharedScale` |
| [ThemeLayout](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L816-L855) | `density`, `targetWidth`, `titleBlock`, `bandStep`, `bandStepFit` |
| [ThemeGuard](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L858-L869) | `markChannel`, `hasBandedAxis`, `seriesCount`, `categoryCount`, `isPartToWhole`, `isSigned`, `isTemporal`, `isFaceted`, `isSummarised`, `canvasWidth` |
| [ThemeVariant](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L875-L881) | `when`, `then`, `because` |
| [LineGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L894-L907) | `width`, `opacity`, `cap`, `join`, `interpolation`, `wash`, `washOpacity` |
| [PointGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L909-L946) | `presence`, `size`, `vertexSize`, `fill`, `shape`, `opacity`, `ink`, `outlineWidth`, `halo`, `density` |
| [AreaGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L948-L959) | `opacity`, `edge`, `edgeWidth`, `interpolation`, `fill` |
| [BandGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L961-L984) | `fraction`, `group`, `cornerRadius`, `opacity`, `outline`, `outlineWidth`, `outlineInk`, `minLength` |
| [ArcGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L986-L1001) | `cornerRadius`, `gap`, `gapStyle`, `order`, `startAngle`, `hole` |
| [CellGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1003-L1008) | `gap`, `cornerRadius`, `opacity` |
| [ThemeGeometry](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1028-L1035) | `line`, `point`, `area`, `band`, `arc`, `cell` |
| [ThemeChartDefaults](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1053-L1055) | `$index` |
| [ThemeCompileDefaults](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1066-L1069) | `baseSize`, `canvasSize` |
| [ThemeInteraction](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1071-L1083) | `tooltipFormat`, `selectionBoundary` |
| [ThemeSpec](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/theme/types.ts#L1095-L1122) | `extends`, `id`, `label`, `ink`, `type`, `structure`, `marks`, `labels`, `legend`, `dataLabels`, `annotation`, `furniture`, `source`, `facets`, `layout`, `geometry`, `chartDefaults`, `compileDefaults`, `interaction`, `variants` |
| [ChartEncoding](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L52-L78) | `field`, `type`, `aggregate`, `sortOrder`, `sortBy`, `scheme`, `reverse`, `mid`, `domain`, `bins`, `colors`, `title` |
| [ChartPropertyDef](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L716-L735) |  |
| [EncodingActionDef](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L820-L847) |  |
| [PivotDef](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L938-L986) | `key`, `label`, `transpose`, `permute`, `shift`, `facetBudget`, `transitions` |
| [ChartAssemblyInput](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L1290-L1425) | `data`, `semantic_types`, `chart_spec`, `theme_spec`, `interaction_spec`, `options`, `field_display_names` |
| [AssembleOptions](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/core/types.ts#L1469-L1801) | `addTooltips`, `liveLayoutSignal`, `stepPadding`, `elasticity`, `maxStretch`, `maxStretchX`, `maxStretchY`, `facetElasticity`, `minStep`, `maxColorValues`, `minSubplotSize`, `facetFixedPadding`, `facetGap`, `facetGapColumn`, `facetGapRow`, `facetColumns`, `defaultBandSize`, `bandStepFit`, `bandStepFitCapacityX`, `bandStepFitCapacityY`, `labelStep`, `rowNamesAbove`, `canvasFit`, `canvasRefit`, `canvasTreatment`, `themeDecisions`, `minBandStep`, `maxBandSize`, `groupBandFillsLanes`, `baseLabelFontSize`, `minLabelFontSize`, `baseTitleFontSize`, `maintainContinuousAxisRatio`, `continuousMarkCrossSection`, `facetAspectRatioResistance`, `autoFacetWrap`, `targetBandAR`, `cellGrowth`, `bandBalance`, `targetAspect`, `aspectTolerance` |
| [LinkSpec](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/link.ts#L20-L25) | `fields`, `charts` |
| [ChartLink](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/link.ts#L37-L46) | `sends`, `receives`, `gestures`, `notes` |
| [InteractiveRenderer](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L94-L116) | `layout`, `viewports`, `warnings`, `getViewports`, `setViewports`, `getViewportGeometry`, `getInteractionContext`, `getState`, `onChange`, `resize`, `relayout`, `refresh`, `applyUpdate`, `setUpdates`, `clearUpdate`, `destroy` |
| [InteractiveChartSurface](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/interactive/types.ts#L155-L191) | `element`, `chartId`, `ready`, `interactions`, `warnings`, `layout`, `getViewportState`, `setViewport`, `dispatch`, `applyUpdate`, `setUpdates`, `clearUpdate`, `getState`, `onChange`, `onInteraction`, `refresh`, `relayout`, `destroy` |
| [FlintChartProps](https://github.com/microsoft/flint-chart/blob/a794557384adcc3293a77043f6b9aff1c33d152c/packages/flint-js/src/react/index.ts#L86-L136) | `spec`, `backend`, `interactions`, `updates`, `renderer`, `expressionInterpreter`, `background`, `width`, `height`, `fit`, `onChange`, `onInteraction`, `onRender`, `onWarnings`, `onError`, `fallback`, `className`, `style`, `ariaLabel`, `chartId` |

## 부록 C. 재현 명령과 범위

이 보고서의 JSON은 현재 checkout에서 다음 명령으로 다시 생성한다. 최소 runtime은 조사 clone 안의 `.audit-runtime`에만 설치하며 ggaction dependencies나 source를 변경하지 않는다. 일반적인 전체 workspace install이나 전체 test suite를 실행하지 않았다.

```sh
cd study/coverage-expansion-2026-10-27/sources/flint-chart
npm install --prefix .audit-runtime --ignore-scripts --no-audit --no-fund esbuild@0.25.12 typescript@5.6.3 d3-time@3.1.0 d3-time-format@4.1.0 d3-format@3.1.0 @floating-ui/dom@1.7.4
node ../../scripts/flint-inventory.mjs
node ../../scripts/flint-compile-probe.mjs
python3 ../../scripts/flint-requirements.py
```

inventory script는 HEAD가 조사 SHA와 다르면 중단한다. compile probe는 fixture마다 actual input data/encoding metadata를 변환하여 assembler를 호출하지만 렌더러를 실행하지 않는다. 이미 제공한 candidate mapping은 ggaction에 대한 실행 가능한 adapter를 생성하지 않으며, 그 구현과 전체 검증은 위 단계의 별도 산출물이다.
