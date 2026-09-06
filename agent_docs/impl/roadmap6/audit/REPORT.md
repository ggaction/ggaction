# ggaction 액션 계층 전수 검토와 확장 제안

기준: main / cee752b0580e6f31630ad5dd2224ab3b5f5f682b / package 0.0.12.

**핵심 문제는 차트 의도에서 세부 편집으로 내려가는 경로가 차트군마다 끊겨 있다는 점이다.** Pie는 그리는 기능이 있지만 완성 차트 액션이 없고, Parallel은 완성 차트 액션이 있지만 축 스타일의 공개 편집 경로가 부족하다. 양쪽을 함께 보완해야 계층적 액션 철학이 API 전체에 드러난다.

이 문서의 새 이름과 변경안은 모두 **Proposed**다. 기존 Current 계약이나 승인된 Planned 목록에 추가하지 않았다. 원래 조사는 분석·제안이며 production 구현이나 GitHub 이슈를 변경하지 않았다. 이 사본은 Roadmap 6의 고정된 출발 근거다.

## 1. 범위와 기준

직접 액션 173개 모두를 runtime 등록, TypeScript 선언, action card, Current 계약과 대조했다. [전체 대조표](ACTION_INVENTORY.md), [CSV](inventory.csv), [옵션·signature JSON](inventory.json)에 각 액션의 역할과 관련 논점을 기록했다.

| 조사 대상 | 확인 결과 |
| --- | --- |
| 직접 호출 계약 | 173개. TypeScript 메서드와 card의 이름 집합 일치 |
| 기존 노출 분류 | user-facing 167 / advanced 3 / primitive 3 |
| charts domain | 6개: Scatter, Line, Bar, Histogram, Heatmap, Parallel |
| 별도 statistics domain의 Plot | Box, Gradient, Violin. 앞의 6개가 전체 Plot 수는 아님 |
| prototype의 wrapped method | 284개: 직접 계약 173 + internal 111 |
| internal manifest | 95개 기록. 16개 누락 |
| 별도 public 함수 | hconcat, vconcat도 검토. 메서드 집계와 구분 |
| 실행 재현 | 공개 API 43개 사례, MCP 7개 요청 및 생성 코드 실행, TypeScript 4개 호출 대조 |
| 승인된 Planned | actions 0 / capabilities 0 |

이 깨끗한 clone 내부에서만 조사했다. 전수조사는 **모든 액션의 계약과 설계 역할을 대조했다**는 뜻이다. 모든 입력 조합을 실행하거나 가능한 버그 전부가 없음을 증명했다는 뜻은 아니다. 이전 수정 작업의 테스트 통과를 이번 제안의 검증 결과로 재사용하지 않았다.

판단 기준:

1. 차트 의도에서 시작할 수 있어야 한다.
2. 기존 mark에 encoding을 추가하는 중간 층위에서도 시작할 수 있어야 한다.
3. 하위 scale·guide·style을 수정해도 owner, provenance, 재계산이 유지돼야 한다.
4. 같은 결정은 가까운 액션끼리 같은 어휘·단위·추론 규칙을 사용해야 한다.
5. 상위 액션은 기존 하위 owner를 호출해야 한다. 계산과 renderer 로직을 복제하지 않는다.

## 2. 권장 계층

| 층위 | 사용자 결정 | 현재 예 | 대표 보강 |
| --- | --- | --- | --- |
| H0 차트·조합 의도 | 무엇을 보여줄까 | createScatterPlot, createHistogram, facet | Pie, Density, Horizon, 기본 Area, Polar/Radar |
| H1 분석 layer·복합 구성 | 무엇을 더할까 | createRegression, createErrorBar, createGuides | interval plot, reference annotation, raincloud |
| H2 의미·resource | 어떤 데이터와 채널일까 | mark 생성, encodeX, encodeTheta, createScale | baseline/range, grouping 분리, summary/bin/fold |
| H3 구성요소·스타일·배치 | 어떻게 보일까 | editPointMark, editXAxisLabels, editLegendTitle | Polar 복원, Parallel 편집, theme/format |
| H4 확장 primitive | 새 액션을 어떻게 구현할까 | editSemantic, createGraphics, editGraphics | 기존 3개 경계 유지 |

Package entry의 basic/default/extension과 다른 분류다. 엄격한 일렬 계급보다 **분해 가능한 호출 관계**가 중요하다. 직접 editGraphics로 바꾼 모양은 상위 rematerialization 때 다시 만들어질 수 있으므로, 일반 사용자의 지속적인 스타일 경로를 primitive로 대신해서는 안 된다.

~~~text
createPiePlot
├─ createArcMark
├─ encodeTheta          count / weighted sum / explicit row values
│  └─ 기존 scale·partition·materialization owner
├─ encodeColor          선택 사항
├─ createGuides         pie에 맞는 선택만 전달
└─ createMarkLabels     선택 사항; 별도 제안
   ├─ createTextMark
   ├─ encodeText
   └─ layoutLabels
~~~

## 3. 현재 차트군 커버리지

| 차트군 | 상위 진입점 | 판단 |
| --- | --- | --- |
| Scatter / Line | createScatterPlot / createLinePlot | 존재. radius 옵션 연결·series/color 분리 보완 |
| Bar / Histogram | createBarPlot / createHistogram | 존재. 가로 단축 호출·type·layout 변경 보완 |
| Heatmap | createHeatmap | pre-gridded/raw-row 경로 존재. label·중심색 보완 |
| Parallel | createParallelCoordinates | 상위 있음. axis style의 하위 편집 부족 |
| Box / Gradient | createBoxPlot / createGradientPlot | 완성 chart와 지연 가능한 composite owner 역할 혼합 |
| Violin | createViolinPlot | 상위 있음. 역할/방향의 원자적 편집 부족 |
| Density / Horizon | 없음 | 기존 area + 복합 encoding을 감싸는 상위 facade 누락 |
| 기본 Area | 없음 | 단순 x/y로는 baseline area가 완성되지 않음 |
| Pie / Donut | 없음 | arc + theta partition 기능은 존재. 상위 facade 누락 |
| Rose / Radial bar | 없음 | arc + theta/radius 존재. baseline·면적 의미 정리 필요 |
| Polar point / line | 없음 | 하위 조합 존재. 상위 facade 누락 |
| Radar | 없음 | closed Polar line의 long-form 경로 존재 |
| Rug / Strip | 없음 | Tick/point+jitter 일부 존재. anchor·완성 경로 부족 |
| Regression / Interval 전체 차트 | 없음 | 분석 layer와 독립 chart facade 구분 필요 |

근거: [BASIC_CHARTS](../../../../agent_docs/contract/current/BASIC_CHARTS.md), [MARKS](../../../../agent_docs/contract/current/MARKS.md), [ENCODINGS](../../../../agent_docs/contract/current/ENCODINGS.md), [STATISTICS](../../../../agent_docs/contract/current/STATISTICS.md), [Donut 예제](../../../../examples/cars-origin-donut/program.js).

## 4. 재현된 오류·표면 불일치 8개

B 항목은 새 기능에 대한 선호와 분리했다. [API 입력·결과](probe-results.json), [MCP 실제 실행 결과](mcp-execution.json), [타입 진단](type-results.txt)에 원본 증거가 있다.

### B01. 같은 단축형의 가로 Bar만 실패

~~~javascript
program.createBarPlot({ x: 'category', y: 'value', guides: false });
// 성공: measure에 mean을 추론

program.createBarPlot({ x: 'value', y: 'category', guides: false });
// 실패: Quantitative bar x encoding requires bin or aggregate.
~~~

x에 aggregate: 'mean'을 명시하면 가로도 성공한다. Facade는 항상 x→y로 호출하는데, quantitative x를 처리할 때 반대쪽 category가 아직 없어 추론이 실패한다. 하위 measure-first 작성에도 같은 순서 의존성이 있다.

**수정:** facade preflight에서 x/y 역할 쌍을 정규화한 뒤 child owner에 전달한다. 하위 action의 유효한 미완성 measure intent도 보존하는 방향을 검토한다. 세로↔가로, category-first↔measure-first의 semantic/graphic 수렴을 검증한다. P35–P37; [bar facade](../../../../src/actions/charts/bar.js), [bar policy](../../../../src/actions/encodings/position/policies/bar.js).

### B02. MCP area chart가 빈 chart를 완료 경로로 제시

createAreaMark → encodeX → encodeY를 제시하고 unresolved는 빈 배열이다. 유효한 rows를 넣어 그대로 실행해도 area item은 **0개**다. Baseline이나 secondary endpoint가 없다.

**수정:** 실제 완성되는 baseline/ranged 경로로 provider를 닫는다. 필요한 결정을 지원하지 못하면 unresolved에 남긴다. 함수 호출 성공과 drawable chart 완성을 별도로 검증한다. [실행 결과](mcp-execution.json), [area policy](../../../../src/actions/encodings/position/policies/area.js).

### B03. MCP strip plot가 위치 없는 Tick만 생성

createTickMark 하나만 제시하며 unresolved가 없다. 실행하면 position encoding도 없고 item도 **0개**다. Mark 생성 의도와 complete-chart 의도를 같은 provider로 취급한다.

**수정:** strip/rug field와 category 또는 plot-edge 배치를 완성해야 chart constraint를 충족하도록 한다. Point strip과 tick rug도 구분한다. [taxonomy](../../../../knowledge/intent-taxonomy.json), [실행 결과](mcp-execution.json).

### B04. MCP radial bar chart가 일반 Bar까지 추가

chart.rose와 substring chart.bar가 모두 매칭된다. Polar arc 작성 후 createBarPlot까지 실행되어 arc와 Cartesian bar가 동시에 생성된다. unresolved는 없다.

**수정:** 더 구체적인 radial-bar intent가 일반 bar intent를 shadow해야 한다. Rose/Radius-length 의도도 분리한다. 생성 코드 검증에 불필요한 layer·coordinate 부재를 포함한다. [taxonomy](../../../../knowledge/intent-taxonomy.json), [실행 결과](mcp-execution.json).

### B05. 공개 createDerivedData 결과를 쓰면 내부 TypeError

직접 filter transform definition을 생성하면 성공하지만 values는 없다. 그 ID로 createScatterPlot을 호출하면 “Cannot read properties of undefined (reading 'length')”가 발생한다.

Definition-only인 것은 현재 문서화된 계약이다. 준비되지 않은 dataset의 consumer preflight가 부족한 점은 오류이고, 일반 data action과 같은 수준으로 노출하는 것은 별도의 설계 문제다.

**수정:** 즉시 materialized-data prerequisite를 검증하여 domain error를 낸다. 장기적으로 일반 진입점은 단일 transform 실행까지 기존 owner에 위임하거나 definition-only 기능을 extension용으로 명확히 구분한다. 자동 compiler는 필요 없다. P18–P19; [derived action](../../../../src/actions/data/derived.js).

### B06. Point/Bar stroke:false의 runtime·type 불일치

createPointMark와 createBarMark에 stroke:false를 주면 JavaScript에서는 성공하지만 TypeScript는 거부한다. Bar Current prose도 creation에서 false를 받지 않는다고 설명한다. Rect는 양쪽에서 허용하고 Area/Arc는 runtime에서 거부한다.

**수정:** 공통 appearance normalization과 type alias를 정리한다. 이미 동작하는 false를 막기보다 지원 표면을 정합적으로 맞추는 additive 수정이 적절하다. P08, [타입 probe](type-probes.ts).

### B07. 가로 temporal Bar는 runtime에서 되지만 타입에서 불가

x={field:'amount',aggregate:'sum'}, y={field:'when',fieldType:'temporal'}인 createBarPlot은 실행된다. 그러나 BarYPositionChannel에 temporal branch가 없어 TypeScript는 거부한다.

**수정:** category/measure 역할을 방향에 대칭적인 type union으로 표현하고 child vocabulary를 재사용한다. any로 넓히지 않는다. P38; [types](../../../../types/program.d.ts).

### B08. 전체 internal inventory에서 16개 누락

284개 registered wrapped method에서 173개 직접 계약을 제외하면 internal은 111개다. Manifest에는 95개만 있다. createParallelAxes, createCategoricalDensityData, legend·title 구성요소 등 [16개 전체 목록](inventory-reconciliation.json)을 확인했다.

**수정:** registered wrapped = direct ∪ internal 및 교집합 없음까지 검사한다. 현재의 materialize/rematerialize 접두어 검사와 일부 수동 배열 비교는 나머지 누락을 놓친다. Runtime method가 있다는 이유로 public API로 승격하자는 뜻은 아니다. [catalog test](../../../../test/contracts/action-catalog.test.js).

## 5. 설계·기본값·추론 검토 20개

### D01. Arc 반지름 default와 Rose의 측정 의미

입력 2, 3, 4에 categorical theta와 기본 encodeR을 적용하면 radius domain은 [2,4], sector는 **2개**다. 값 2가 inner baseline으로 매핑돼 생략된다. scale.zero=true이면 domain [0,4], sector 3개가 나온다. 계약상 동작이지만 크기로 양을 표현하는 radial chart의 기본값으로는 위험하다. P30–P31.

고정 각도 sector 면적은 θ×(r²−r₀²)/2다. **면적으로 값을 표현하는 Rose**라면 linear radius는 의도와 다르다. Inner radius가 0이면 sqrt radius가 필요하고, 0이 아니면 그 제곱까지 포함한 mapping을 정의해야 한다. 모든 encodeR을 sqrt로 바꾸면 Polar point와 radius-length chart의 의미를 망친다.

**제안:** Radial bar는 zero baseline·radius-length, Rose는 area 의미를 상위 계약에서 각각 명시한다. 기존 arc owner를 공유하되 차트 의미에 맞는 mapping을 선택한다. [Polar 계약](../../../../agent_docs/contract/current/ENCODINGS.md#encoder), [Rose 예제](../../../../examples/nightingale-rose-chart/program.js).

### D02. series identity와 color/dash field를 동일시

country로 group하고 continent로 color를 지정하면, 각 country에서 continent가 하나로 일정해도 거부한다. Line group/color/strokeDash는 **같은 필드명**이어야 한다. Area도 group/color를 강하게 결합한다. P03.

**제안:** group은 path identity, color/dash/width는 final series의 appearance를 소유하도록 분리한다. 각 series 안에서 appearance 값이 유일한지 검증하고, 여러 값이면 명시적 aggregate 또는 오류를 요구한다. Multi-field group도 단일 string 합성 없이 표현한다. Field strokeWidth에 이미 유사한 series-level 유일성 원칙이 있다. [shared compatibility](../../../../src/actions/encodings/shared.js).

### D03. layout이 color에 종속되고 변경이 막힘

Bar group/stack/fill/overlay/diverging을 encodeColor.layout으로 요청한다. Grouped Bar를 같은 field의 stack으로 바꾸어도 거부한다. encodeY.stack, offset, color.layout에 같은 결정이 분산된다. P10.

**제안:** 독립적인 atomic layout assignment를 두어 grouping·baseline·offset을 한 owner가 처리한다. layoutBars 또는 encodeStack처럼 의미별 이름을 검토하고, 기존 color.layout은 그 owner에 위임한다. Transition에는 scale·guide·selection preflight와 stale offset/normalization 정리가 필요하다. Validation만 느슨하게 해서는 안 된다. [color policy](../../../../src/actions/encodings/color/policy.js).

### D04. Plot 이름이 완성 chart와 composite owner를 혼합

Box/Gradient는 create…Plot을 먼저 호출하고 위치를 나중에 줄 수 있다. Violin/basic facade는 생성 시 위치가 필요하다. Box/Gradient x/y는 object 중심이고 Violin/basic은 string shorthand도 사용한다. 이름만으로 완성 상태와 다음 편집 owner를 예측하기 어렵다.

**제안:** complete facade와 지연 가능한 composite owner를 metadata·문서에서 먼저 구분한다. 다음 설계에서는 H0가 하위 composite owner를 감싸도록 정리한다. createBoxMark류 공개 여부는 독립 작성 수요로 결정한다. 기존 deferred 호출을 조용히 깨거나 모든 facade에 기계적인 edit 쌍을 만들지 않는다. [Box](../../../../agent_docs/contract/current/COMPOSITE_MARKS.md), [Gradient](../../../../agent_docs/contract/current/GRADIENT_PLOTS.md), [Violin](../../../../agent_docs/contract/current/VIOLIN_PLOTS.md).

### D05. guides default와 facade 조합의 비대칭

Box만 guides 생략 시 만들지 않는다. 다른 complete facade는 만든다. 이미 축이 있는 Scatter에 Line facade를 기본 옵션으로 더하면 중복 axis 오류가 나며 두 번째에 guides:false가 필요하다. P01–P02, P23–P24.

Pie 하위 chain에 createGuides를 쓰면 theta 축과 spokes까지 생긴다. 기존 Donut 예제는 axes/grid를 명시적으로 false로 한다. P27.

**제안:** H0의 생략을 “차트 의미에 적합한 guide 확보”로 정의하고 기존 compatible guide 재사용/생성을 preflight한다. Low-level create의 missing-resource 원칙은 유지한다. Pie는 기본 axes/grid 없음, Radar/Rose는 실제 theta/radius guide가 적절하다. Box default 변경은 호환성 변경으로 다룬다.

### D06. constant style·field encoding·생성 shorthand의 비대칭

| 의도 | 현재 경로 |
| --- | --- |
| Line width=4 | editLineMark 성공, encodeStrokeWidth value mode 실패 |
| Line width=field | encodeStrokeWidth field mode 성공 |
| Line opacity=0.5 | editLineMark 성공, encodeOpacity 실패 |
| Rule constant stroke | encodeStroke가 소유. editRuleMark 없음 |
| Scatter constant radius | point.radius 불가. 후속 encodePointRadius 필요 |
| ErrorBand fill override | color encoding이 있어도 editErrorBand.fill 성공 |
| 일반 Area fill override | 같은 상황에서 editAreaMark.fill은 충돌로 거부 |

P04–P07, P16–P17, P26. ErrorBand는 실제 모든 path가 black으로 변해도 categorical color encoding이 남는다.

**제안:** constant appearance는 해당 mark의 create/edit에서 같은 normalization을 사용한다. Field/constant encoding은 mode에 따라 target mark가 갑자기 바뀌지 않도록 정리한다. Rule editor를 추가한다면 기존 encoders를 감싼다. Scalar override가 encoding을 유지/제거하는지, legend는 무엇을 설명하는지 공통 정책을 정한다. Highlight의 명시적 override는 일반 기본 스타일과 구분한다. [appearance](../../../../agent_docs/contract/current/ENCODINGS.md), [ErrorBand](../../../../agent_docs/contract/current/STATISTICS.md#editerrorband).

### D07. Cartesian/Polar/Parallel 축의 계층이 다름

Cartesian은 line/tick/label/title 생성·편집과 aggregate component 제거를 공개한다. Polar의 focused 생성 8개는 internal이고 편집만 public이다. title:false로 생성한 Polar 축은 public focused editor로 title을 복원할 수 없다. Polar aggregate edit도 title:false를 받지 않는다. Cartesian complete create는 title:false를 받지 않는다. P12–P15.

Parallel에는 complete facade가 있지만 tick count·font·format 등이 internal rematerializer에 고정되고 공개 focused axis editor가 없다.

**제안:** 좌표 family별 component 생성/편집/제거/복원 표를 완성한다. Polar leaf 생성의 안전한 public 경계를 검토하고, Parallel에는 dimension field/stable key를 선택하는 editParallelAxis부터 제공한다. 내부 graphic ID를 요구하지 않는다. [Polar facade](../../../../src/actions/guides/polar/axes/facade.js), [Parallel axes](../../../../src/actions/guides/axes/parallel.js).

### D08. Legend kind마다 가능한 작업이 크게 다름

Standalone size는 right만, combined point-size는 right/left, categorical·continuous color는 네 edge, interval·strokeWidth는 right 중심이다. editLegend는 channels를 바꾸지 못하고 combined color/shape에서 color만 제거할 수도 없다. P28–P29.

Categorical bottom legend는 position:bottom만 주면 legacy Canvas-bottom layout이고 offset/columns 등의 옵션 하나를 추가하면 reserved-margin layout으로 바뀐다.

**제안:** content/symbol recipe와 edge layout을 분리해 공유한다. Layout mode가 unrelated option의 존재 여부에 숨어 있지 않게 한다. Channel 구성 변경은 atomic resource reauthor 경로로 제공한다. Kind별 제약을 type/card의 machine-readable matrix에도 드러낸다. [legend 계약](../../../../agent_docs/contract/current/LEGEND_AND_TITLE.md).

### D09. 추론이 분석 의미를 조용히 선택

Numeric color field의 string shorthand는 기본 nominal이다. 반면 Bar x/y는 finite number 여부로 quantitative를 추론한다. 반복 category의 Bar measure는 기본 mean이다. 숫자 temporal 입력 1000–9999는 timestamp 대신 연도로 해석된다. P09, P22, P32.

어느 default도 모든 문맥에서 틀린 것은 아니다. 수치의 색 차이·매출 합계·작은 epoch timestamp를 기대하면 다른 의미가 된다.

**제안:** data type과 analytical intent를 분리한다. Field schema/explicit type을 우선하고 숫자 category를 자동 연속값으로 바꾸지 않는다. Sum/mean/count는 사용자 역할에서 드러내며 temporal에는 year/timestamp unit을 지정할 수 있게 한다. Inferred intent를 trace/card에 남기고 기존 해석을 조용히 변경하지 않는다.

### D10. Regression grouping 추론과 JSON에 남지 않는 opt-out

createRegression은 point color/shape에서 groupBy를 추론한다. 생략은 추론, explicit undefined는 ungrouped다. 반면 editRegression/editDensity/editHorizon은 group 제거에 false를 쓴다. JSON은 undefined property를 보존하지 않아 전달 경로에 따라 grouping 의미가 바뀔 수 있다.

**제안:** explicit semantic grouping을 우선하고 groupBy:false처럼 직렬화 가능한 disable을 공통으로 제공한다. Create omission=infer, edit omission=preserve를 구분한다. Appearance field에서 통계 partition까지 추론하는 정책을 새 facade에 무비판적으로 상속하지 않는다. [Regression 계약](../../../../agent_docs/contract/current/STATISTICS.md#createregression).

### D11. 같은 CI 어휘에 다른 계산법

Aggregate ciLower/ciUpper는 고정 mean±1.96×stderr다. createIntervalData의 기본 extent:ci, level:0.95는 Student-t다. 값 [1,2,3]의 upper를 public API로 계산하면 각각 **3.131606527612**, **4.48413771175**다. P39.

**제안:** interval method/level을 공통 통계 계약으로 표현하고 provenance와 guide title에서 구분한다. 같은 신뢰수준을 Regression은 confidence, Interval은 level로 부르는 어휘도 정리한다. 축약형을 유지하더라도 어떤 approximation인지 명시한다. 공통 계산 owner와 migration을 제공하며 기존 수치를 조용히 바꾸지 않는다. [aggregate](../../../../src/grammar/aggregate.js), [interval](../../../../agent_docs/contract/current/STATISTICS.md#createintervaldata).

### D12. Data 생성·수정·소비 경로가 불균일

Density/Regression/Window/TimeUnit은 새 immutable dataset ID를 요구한다. Bin2D는 같은 ID의 create 재호출로 revision과 consumer rebind를 수행하고 editBin2DData도 있다. createDerivedData는 values를 생성하지 않는다. 일반 mark의 data를 안전하게 교체하는 public action도 없다.

**제안:** immutable snapshot과 editable transform owner를 분리한다. 기존 Bin2D reauthor는 유지하되 권장 경로를 create-once/edit-owner로 정리한다. Public bindMarkData를 추가한다면 내부 rebindLayerData를 그대로 노출하지 말고 downstream preflight/rematerialization을 포함한다. 모든 transform에 edit 쌍을 기계적으로 추가할 필요는 없다. [CORE](../../../../agent_docs/contract/current/CORE.md).

### D13. label source·format·angle 단위의 연결 부족

Text는 source를 추론하지만 explicit source-mark parameter가 없다. Ambiguous하면 data와 position을 직접 작성하라고 안내하므로 final-item anchor를 명시적으로 선택하기 어렵다. Pie share를 표현하는 semantic content도 없다.

Text format은 auto/fixed decimal만 받고 axis는 percent/scientific/UTC도 받는다. Axis label rotation은 없고 title/text rotation은 radians 계열, encodeAngle/Polar는 degrees다. P33–P34.

**제안:** source mark와 final semantic content를 명시하는 label aggregate를 만든다. Field, encoded value, derived share를 구분한다. Common formatter를 label/axis/legend가 재사용하고 angle unit을 명시한다. Guide label overlap/wrap은 guide-owned policy로 추가한다. [text action](../../../../src/actions/marks/text/actions.js), [text contract](../../../../agent_docs/contract/current/MARKS.md#createtextmark).

### D14. order와 미완성 작성 지원이 부분적

encodeBarWidth는 위치 완성 전에 거부되지만 다른 많은 constant appearance는 먼저 저장된다. orderCategories는 Cartesian x/y만 지원하고 Pie theta·legend color order에는 사용할 수 없다. Path order는 quantitative Cartesian raw path에 제한된다. P11.

**제안:** geometry 없이 검증할 수 있는 width intent는 먼저 저장한다. Category order, vertex order, stack order, drawing order는 의미를 구분하면서 target/tie vocabulary를 공유한다. Theta category와 legend-domain order는 실제 사용 목적에 맞게 확장한다. 단순 sort 하나로 합치지 않는다. [ENCODINGS](../../../../agent_docs/contract/current/ENCODINGS.md).

### D15. Mark filter는 한 번만 가능하고 empty view가 불가

동일 target에 두 번째 filterMarks를 호출하면 생성 dataset ID가 충돌한다. 매칭 0개도 실패한다. Stored selection/highlight의 empty match는 유효하다. Final-item grain의 엄격함은 필요하지만 필터 수정/해제 workflow는 닫혀 있지 않다. P20–P21.

**제안:** replace/compose/remove와 source ownership을 정의한다. Empty view는 explicit domain 유지 또는 empty-state 표현의 별도 계약이 필요하다. filterData(raw rows)와 filterMarks(final item)의 의미 차이는 유지한다. 독립적인 downstream 통계 layer를 암묵적으로 함께 변경하지 않는다. [selection](../../../../agent_docs/contract/current/MARK_SELECTION.md).

### D16. Composite 편집에서 생성 당시 역할 어휘로 돌아가기 어려움

Box/Gradient/Regression은 source와 x/y role을 owner edit로 바꾼다. ErrorBar/ErrorBand edit은 statistics/appearance 중심이며 source/position role revision이 부족하다. Violin은 editDensity로 일부를 바꾸지만 densityChannel을 받지 않아 방향 전환이 같은 형태의 atomic edit로 표현되지 않는다. P25.

**제안:** 생성 시 사용자에게 받은 주요 semantic role을 바꾸는 domain editor를 제공한다. Violin의 source/category/value/split/orientation을 함께 다루는 editViolinPlot에는 독립 가치가 있다. 단순 Scatter/Line은 lower edit로 충분하면 새 wrapper가 불필요하다. Regression의 point-owner 의존성도 standalone/multiple-fit 수요와 분리 검토한다. [statistics](../../../../agent_docs/contract/current/STATISTICS.md), [Violin](../../../../agent_docs/contract/current/VIOLIN_PLOTS.md).

### D17. 전역 스타일과 layout 의도의 action 부재

공통 color/font token은 theme/defaults.js에 있지만 public program theme action은 없다. Canvas background만 어둡게 바꿔도 axis/text/legend 기본값은 함께 바뀌지 않는다. Parallel처럼 leaf editor가 없는 곳은 개별 수정도 어렵다. 긴 guide/title은 margin 부족 시 거부되고 label layout은 margin을 늘리지 않는다.

**제안:** applyTheme류 action에 explicit local override > program theme > library default의 우선순위를 둔다. Theme은 의미/통계를 변경하지 않는다. Text 측정 후 margin을 계산하는 bounded deterministic fitting은 opt-in의 별도 action으로 둔다. 기존 고정 Canvas를 몰래 확장하지 않는다. [theme](../../../../src/theme/defaults.js).

### D18. Diverging palette와 의미 중심값이 구분되지 않음

Diverging palette 이름은 있지만 scale의 center/midpoint 계약은 없다. 두 endpoint sequential mapping은 비대칭 domain에서 neutral color가 반드시 0을 뜻하지 않는다. Sequential↔discretized 전환도 기존 legend가 있으면 거부한다.

**제안:** 차이·잔차·중심값 heatmap에 명시적 midpoint mapping 또는 diverging semantic scale을 제공한다. Palette 교체만으로 해결됐다고 하지 않는다. Scale/legend recipe 전환은 shared consumer 전체를 preflight한다. 모든 channel에 모든 scale type을 추가하는 식의 조합 확대는 우선순위가 낮다. [scale](../../../../agent_docs/contract/current/CORE.md#createscale), [palette](../../../../agent_docs/contract/current/PALETTES.md).

### D19. composition의 반복·편집 범위가 좁음

Facet은 한 field, first-appearance order, columns 기반이다. Default legend는 false라 원본의 color 설명이 사라질 수 있다. Concat은 child replacement가 있지만 insert/remove/reorder는 없고 facet child는 임의 교체가 금지된다. Polar/Parallel facet도 없다.

**제안:** row×column facet, dimension 반복, facet order, named-child 구조 편집을 목적별로 추가한다. Shared scales와 legend 승격의 명시적 의미는 유지한다. Per-cell override는 canonical recipe와의 책임을 먼저 정의한다. [composition](../../../../agent_docs/contract/current/COMPOSITION.md).

### D20. 계층은 trace에 있지만 discovery metadata에는 약함

167개가 user-facing으로 묶여 H0/H2/H3를 구분하기 어렵다. Card에는 typed wraps/delegates, authoring role, constant/field별 target/grain matrix가 없다. selectMarks의 create-only 설명과 현재 editMarkSelection 경로도 함께 정리해야 한다.

Current prose에는 field-driven width가 구현돼 있는데 다른 위치에 Proposed로 남은 문장, index의 Planned 0개와 별도로 encodeOpacity에 Planned라고 적힌 문장도 있다. 승인 여부에 맞춰 Current/Proposed/Maybe Future를 정리해야 한다.

**제안:** package exposure, authoring role, resource lifecycle을 별도 필드로 둔다. Wraps, editableVia, supports, units, inference, completionRequirements를 기계적으로 대조한다. “현재 계약 테스트 완료”와 “chart hierarchy 완성도”를 같은 Complete로 표현하지 않는다. [card schema](../../../../knowledge/action-card.schema.json), [index](../../../../agent_docs/contract/ACTION_INDEX.json).

## 6. 추가·확장 후보 액션군 20개

우선순위는 **A: 다음 묶음에 권장 / B: 기반과 함께 후속 / C: 별도 기획**이다. 구현 성격은 시간 추정이 아니라 필요한 작업의 종류다. 아래 이름은 모두 제안이며 확정 API가 아니다.

| ID | 후보 액션군 | 우선 | 구현 성격 | rationale / 필요한 하위 경로 |
| --- | --- | --- | --- | --- |
| F01 | createPiePlot, 선택적 createDonutPlot | A | 주로 wrapper | 기존 arc + theta count/sum + color를 완성 의도로 연결. Pie guide와 category/value grain을 소유 |
| F02 | createPolarScatterPlot, createPolarLinePlot | B | 주로 wrapper | Cartesian facade와 같은 수준에서 theta/radius 의도 작성. Glyph radius와 radial position 분리 |
| F03 | createRadarPlot | B | long-form wrapper; wide-form은 추가 | Closed line, category order, series, guides를 묶음. 서로 다른 단위의 축을 자동 정규화하지 않음 |
| F04 | createRosePlot, createRadialBarPlot | A | wrapper + mapping 계약 | Area와 radius-length, zero baseline을 구분. Min sector 생략과 MCP 의도 충돌 해결 |
| F05 | createAreaPlot + atomic baseline/range assignment | A | 하위 계약 필요 | 기본 x/y area, bounded ribbon, stack을 구분. Baseline 없이는 이름만 붙여도 빈 차트 |
| F06 | createDensityPlot | A | 주로 wrapper | Area→encodeDensity→guides를 완성 chart로 제공. KDE/group/orientation은 기존 owner에 위임 |
| F07 | createHorizonPlot | A | 주로 wrapper | 기존 Horizon을 상위로 연결. Folded y를 원본값 축처럼 표시하지 않으며 guide 제한 유지 |
| F08 | createRugPlot, createStripPlot | A/B | placement + wrapper | Tick x/y용 dummy field 문제 해결. Tick rug/point strip을 구분하고 plot-edge/constant anchor를 의미로 저장 |
| F09 | createBeeswarmPlot + packPoints류 | B | 새 배치 owner | Jitter는 collision-free가 아님. Glyph/category bounds/stable order를 반영한 packing과 해제 lifecycle |
| F10 | createIntervalPlot, createRegressionPlot | B | 복합 wrapper | Center point+error bar, scatter+fit/band를 완성 chart 의도로 연결. Lower layer도 독립 제공 |
| F11 | createDotPlot, createLollipopPlot, createDumbbellPlot | B | 복합 owner/placement | Point/rule/tick 재사용. 기준선·두 endpoint·label·width·scale의 원자적 작성/편집 |
| F12 | createRaincloudPlot | B | 복합 owner + slot 배치 | Half violin+box/interval+raw points의 source/scale/offset 정렬. 단순 나열로 생기는 겹침·필터 불일치 방지 |
| F13 | createECDFData, createECDFPlot | B | 통계 owner + wrapper | KDE/histogram 이외의 누적 분포. Ties/denominator/step topology/missing/weight 정책. 단순 cumulativeSum은 Window 재사용 |
| F14 | createMarkLabels, createReferenceLine, createReferenceBand, createAnnotation | A/B | aggregate + anchor/format | Final item/data datum/plot anchor 명시. Raw field와 aggregate/share 구분. Pie label과 callout에 직접 필요 |
| F15 | createSummaryData, createBinData, createFoldData, 제한된 computed/stack data | B | 재사용 transform | 집계를 Bar 밖에서도 사용. 1D bin bounds/count 공유, wide→long, 비율/차이 계산을 trace에 보존 |
| F16 | bindMarkData, transform revision, editViolinPlot, interval role edit | B | dependency preflight | Immutable source를 유지하며 data/role을 교체. Internal semantic rebind만 노출하면 안 됨 |
| F17 | Polar component 생성/복원, editParallelAxis, 선택적 editGuides | A/B | child owner 확장 | 완성 chart가 있는 모든 좌표에서 leaf style까지 내려감. 일괄 guide edit는 독립 사용 목적이 있을 때 추가 |
| F18 | applyTheme, 공통 typography/format, 명시적 layout fitting | A/B | 공통 config owner | 여러 mark/guide의 스타일을 같은 원칙으로 수정. 의미/통계와 분리하고 explicit override 보존 |
| F19 | facetGrid, repeatCharts, facet order, child 구조 편집 | B | composition policy | 한 field를 넘는 비교 chart. Shared scales/guides와 child recipe ownership 먼저 확정 |
| F20 | Waterfall, range/timeline, OHLC/candlestick, hierarchy/flow/geo | C | 기능별 새 grain/배치 | 후보에는 포함하되 단순 wrapper로 부르지 않음. 수요와 semantic contract 별도 검토 |

F20 안에서도 비용은 다르다. Waterfall은 cumulative/range 기반, OHLC는 rule/bar composite로 접근할 수 있다. Timeline은 temporal range와 category slot 계약이 필요하다. Treemap·sunburst·flow·network·geographic chart는 새 hierarchy/layout/projection 의미가 필요하므로, 기존 차트의 빈 계층을 메우는 작업과 같은 우선순위로 섞지 않는 것이 좋다.

### F01 Pie의 구체적 제안

Category-based complete plot과 row-valued low-level arc를 구분한다.

~~~javascript
// Proposed: category별 row count
program.createPiePlot({ category: 'Origin' });

// Proposed: category별 명시적 weighted sum
program.createPiePlot({
  category: 'country',
  value: 'population',
  aggregate: 'sum',
  arc: { innerRadius: 0.55 }
});
~~~

| 결정 | 권장 계약 | rationale |
| --- | --- | --- |
| count/sum/raw rows | Value 생략은 category count. Category value 집계는 명시. Row별 slice는 기존 direct-theta 경로 유지 | 중복 category 처리와 분모를 숨기지 않음 |
| geometry | Pie innerRadius=0. 기존 Arc ratio 단위 재사용 | 새 pie semantic mark나 renderer 불필요 |
| 음수/0/all-zero/missing | 기존 partition strictness 유지, 각 처리 명시 | 무의미한 분모와 잘못된 slice 방지 |
| sort | Stable first appearance 기본, explicit theta/category order | 값 변화 때 identity가 자동으로 이동하지 않음 |
| guides | Axes/grid 기본 없음. Category color를 쓰면 해당 legend | Polar geometry만으로 측정 축을 합성하지 않음 |
| labels | 기본 opt-in. Category/value/percentage가 final slice grain을 읽음 | 원본 row와 집계 share 혼동 방지 |
| editing | editArcMark, theta/color 재할당, scale/guide/text 재사용. Partition mode 전환은 atomic preflight | 생성 후 아래층으로 내려갈 수 있음 |
| trace | 실제 wrapped child 유지 | 무엇을 그렸고 어떻게 만들었는지 함께 보존 |

createDonutPlot을 추가한다면 독립 구현 대신 같은 owner를 부르는 thin facade여야 한다. 기본 innerRadius가 다른 shortcut이 실제 발견 가능성을 개선하는지로 판단하면 된다.

### F05 Area를 먼저 보강해야 하는 이유

현재 ranged area는 lower/upper field, density는 derived baseline, centered area는 별도 stack policy를 사용한다. 기본 x/y area에 baseline 0을 붙이는 공통 계약이 없다.

권장 순서:

1. Data-space constant endpoint 또는 명시적 baseline의 하위 의미를 정의한다.
2. createAreaPlot({x,y})이 baseline 0을 가진 complete area를 만들게 한다.
3. Ranged ribbon은 lower/upper, stacked area는 group/stack policy를 명시한다.
4. Baseline domain 포함, nonlinear scale 호환성, missing position의 path break를 먼저 결정한다.

Source에 가짜 zero field를 붙이는 작업을 facade에 숨기거나 renderer가 area 의미를 추론하게 해서는 안 된다.

### F15 데이터 계층에서 우선 추가할 것

- **Summary:** groupBy와 여러 aggregate output을 한 derived dataset으로 만든다. Point summary, labels, interval, categorical color의 grain을 공유할 수 있다.
- **1D bin data:** 같은 bin boundaries/count/member를 Histogram·frequency line·label이 공유한다. 현재 bin 설정이 encoding과 histogram facade에 묶여 있다.
- **Fold:** 선택된 여러 measure column을 long-form으로 만든다. Radar/parallel/repeated chart가 임의의 외부 전처리에만 의존하지 않게 한다.
- **Computed field:** 비율·차이·단위 변환처럼 범위가 명확한 serializable 연산부터 검토한다. 임의 callback/eval을 기본 transform 언어로 도입하지 않는다.
- **Stack data:** 원시 series의 start/end를 명시적으로 파생한다. Color layout과 독립된 owner를 마련하고 missing/negative/normalized/centered 정책을 정의한다.

새 data action은 provenance만 저장하고 멈추지 말고, 일반 사용자가 반환 dataset을 다음 public action에 쓸 수 있도록 completion contract를 제공해야 한다.

## 7. 함께 정리할 공통 규칙

| 축 | 권장 원칙 |
| --- | --- |
| id / target / source | 새 resource ID와 기존 edit target을 구분. 생성의 source-mark 선택도 역할이 드러나는 이름 사용 |
| inference | Explicit→안전한 current/unique→documented default→error. 임의 첫 후보·numbered ID 금지 |
| create/edit/assign | Create=missing, edit=existing, assignment=명시적 replace. Desired-state enable/disable 예외는 문서화 |
| omission / {} / false | Create omission=infer, edit omission=preserve. {}의 enable과 empty-edit 오류를 구분. False는 disable |
| auto / undefined | Auto는 inference reset. 중요한 opt-out을 JSON에서 사라지는 undefined에 새로 의존하지 않음 |
| field / constant | Grain상 가능한 동일 target capability를 공유. Constant는 불필요한 scale/legend를 만들지 않음 |
| units | Radial position/point area/point radius/angle/rotation/band fraction/logical pixels 명시 |
| defaults | Aggregate/group/normalization과 순수 스타일 defaults 분리. 역할로 설명되는 차이는 허용 |
| lifecycle | Immutable data와 mutable logical owner 분리. 모든 aggregate에 edit 쌍을 강제하지 않음 |
| errors | Unsupported/ambiguous/incomplete 구분. 유효한 incomplete intent는 보존하되 complete facade가 빈 결과를 완성이라 선언하지 않음 |

0.7/0.72/0.8 같은 band default나 area 0.2/point 1의 opacity 차이는 숫자가 다르다는 이유만으로 버그로 세지 않았다. 역할로 설명할 수 있는 차이는 유지할 수 있다. **같은 public intent인데 실행 여부나 분석 의미가 달라지는 차이**를 먼저 다룬다.

## 8. 권장 실행 순서와 완료 기준

**첫 묶음 — 잘못된 결과와 계약 불일치.** B01–B08을 작은 독립 수정으로 처리한다. MCP 검증에는 function call 성공 외에 final mark count, 필요한 channels, coordinate family, 불필요한 layer 유무가 필요하다.

**둘째 묶음 — Pie와 바로 연결할 수 있는 상위 경로.** Pie/Donut, Density, Horizon을 기존 owner 위에 얇게 올린다. Rose/Radial bar의 baseline·면적 의미와 Area baseline은 wrapper 작성 전에 확정한다.

**셋째 묶음 — 아래층까지 계층 완성.** Series/color 분리, layout transition, axis lifecycle, style vocabulary, labels/format, theme을 처리한다. 새 chart facade 수를 늘리는 것만큼 철학에 직접적인 작업이다.

**넷째 묶음 — 기반을 재사용한 확장.** Summary/bin/fold/ECDF, Rug/Strip/Beeswarm, Interval/Raincloud, faceting/repetition을 추가한다. F20은 이후 독립 기능 설계로 다룬다.

Facade 완료 기준:

- Shortest unambiguous call이 drawable chart를 완성한다.
- Facade와 명시적 child chain의 semantic/graphic/render 결과가 같다.
- 실패 시 이전 program과 trace가 변하지 않는다.
- Data/scale/Canvas/filter/selection 편집 후 owner와 의미가 유지된다.
- 필요한 중간·하위 action을 독립 호출할 수 있다.
- Runtime/type/contract/card/discovery가 동일한 supported matrix를 표현한다.

Histogram처럼 **완성 chart→atomic semantic assignment→mark/position/scale→guide/style→primitive**가 이어지는 사례를 다른 차트군으로 확장하는 것이 기준이다.

## 9. 근거와 재현

- [173개 전수표](ACTION_INVENTORY.md) / [CSV](inventory.csv) / [signature·options JSON](inventory.json)
- [API probe](probes.mjs) / [원본 결과](probe-results.json) / [간단 로그](probe-summary.txt)
- [MCP 실행 probe](mcp-execution.mjs) / [7개 생성 코드 실행 결과](mcp-execution.json)
- [TypeScript probe](type-probes.ts) / [diagnostics](type-results.txt)
- [등록-인덱스 대조](inventory-reconciliation.json)

~~~sh
node agent_docs/impl/roadmap6/audit/probes.mjs
node agent_docs/impl/roadmap6/audit/mcp-execution.mjs
node agent_docs/impl/roadmap6/audit/build-inventory.mjs
./node_modules/.bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --skipLibCheck --ignoreConfig agent_docs/impl/roadmap6/audit/type-probes.ts
~~~

재실행 JSON/전수표는 .artifacts/roadmap6-audit-replay/에 기록하며 이 사본을 덮어쓰지 않는다. TypeScript probe는 기준 commit의 불일치를 기록하므로 3개 진단을 내는 것이 이 조사 기준의 관측 결과다. Production source를 변경한 회귀 테스트 suite가 아니다.
