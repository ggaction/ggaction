# ggaction 현재 구현·공개 계약·확장 경계 상세 분석

분석 기준은 ggaction `0.0.26`, commit `40ec7edead7fc84de05aad31888dd0f7d264a512`이다. 이 문서에서 “현재 지원”은 해당 commit의 실제 등록된 action, validator, materializer, renderer, persistence 계약을 뜻한다. “제안”은 아직 구현되지 않은 요구사항이다. 공개 타입에 이름이 있다는 이유만으로 임의 조합, 다른 도구와의 픽셀 일치, 브라우저 이벤트 처리를 지원한다고 판정하지 않았다.

현재 ggaction은 상당히 넓은 **정적 차트 작성·편집·조합 엔진**이다. 다수의 통계 차트, 재사용 가능한 semantic action, immutable history, concrete graphics, Canvas/SVG/PNG/PDF 출력, inspection, editable persistence, animation용 scene 추출까지 갖췄다. 따라서 목표를 위해 엔진을 처음부터 다시 만들 필요는 없다. 그러나 현재 패키지를 그대로 Flint의 렌더링 백엔드로 꽂거나 모든 chart-llm 사례를 완전하게 번역할 수 있다고 말할 근거는 없다. 특히 **event runtime, 명시적인 안정적 item identity, animation player/transition planner, geographic geometry/projection, compound path, 전체 source-expression 의미 보존, source별 layout fidelity**는 별도 작업이다.

## 1. 조사 범위와 증거의 의미

기계 인벤토리는 `src`의 JavaScript **628개 파일, 94,053줄**, 공개 declaration **12개 파일, 6,757줄**을 열거하고 공개 함수 정의와 등록 지점을 찾았다. 이것은 모든 줄을 수동으로 검토했다는 뜻이 아니다. 수동 심층 검토는 architecture/AGENTS, public entry point, action registry/card/contract, ChartProgram/action wrapper, materialization plan, vocabulary/coordinate/scale/transform validators, path/concrete graphics, renderer path/scene, selection/inspection, persistence, revision, theme/text, 현행 release 증거에 집중했다.

독립 실행 가능한 focused probe **19개**를 수행했다. 정상 사용 7개, 의도된 rejection 11개, 지정된 runtime method 이름 부재 관찰 1개가 기대와 일치했다. probe는 작은 대표 입력의 계약 확인이지 전체 차트 fidelity·브라우저 interaction·성능·테스트 suite 결과가 아니다. 브라우저의 실제 드래그·zoom·animation frame 검증을 수행했다고 주장하지 않는다.

증거 파일:

| 파일 | 내용 | 읽는 방법 |
|---|---|---|
| `evidence/ggaction-inventory.json` | 298개 action의 catalog 정보, 옵션, signature, wrapper 관계, prerequisites, lifecycle, 실제 default/basic method 등록, implementation/contract/type line permalink; public export 전수 | 모든 action의 존재와 소유자 추적의 기준 |
| `evidence/ggaction-actions.csv` | 이름·domain·lifecycle·entry point·옵션·source URL 압축표 | 작업 분해/스프레드시트 비교용 |
| `evidence/ggaction-type-contracts.json` | nested 타입를 포함한 공개 declaration 원문 전체 | 카드의 축약된 TypeScript 문자열을 확대할 때 사용 |
| `evidence/ggaction-source-anchors.json` | 핵심 architecture/validation/scene/persistence source permalink | 이 문서의 결론을 원 구현과 대조 |
| `evidence/ggaction-probes.json` | 정상/실패 입력, 오류, inspection/scene/persistence 관찰 | 지원과 불지원의 실제 경계 |
| `scripts/ggaction-inventory.mjs` | 읽기 전용 인벤토리 재생성 | checkout commit이 바뀌면 재실행 |
| `scripts/ggaction-probes.mjs` | 19개 작은 검증 재실행 | full suite와 분리하여 회귀 확인 |

현재 ACTION_INDEX는 **298개 모두 implemented**, planned action/capability 배열은 비어 있다. 이것은 *그 catalog가 열거한 작업이 구현되었다*는 뜻이다. Flint/chart-llm 전체 요구사항을 catalog가 포함했다는 뜻이 아니다. 이 구분을 다음 coverage dashboard와 capability registry에서도 유지해야 한다.

## 2. 현재 architecture: 무엇을 확장해야 하고 무엇을 보존해야 하는가

`ChartProgram`은 action마다 새 immutable program을 반환한다. constructor는 semanticSpec, graphicSpec, resolvedScales, materializationConfigs, children, compositionSpec, context, trace, actionStack을 소유하고 freeze한다. 일부 내부 `_clone`/`_with…` 메서드는 구현 도구이며 외부 변환기가 직접 의존할 안정적 계약이 아니다. [ChartProgram 구현][G01]

| 상태 | 현재 역할 | 확장 시 지켜야 할 경계 |
|---|---|---|
| `semanticSpec` | dataset, mark/layer, encoding, scale, coordinate, guide의 의미 | field/selection/projection 등 의미 있는 개념이 여기 또는 명시적 semantic resource에 존재해야 함 |
| `graphicSpec` | 실제 좌표·색·크기·path·text line이 계산된 backend-neutral graphics | renderer가 source chart dialect나 통계/scale 추론을 다시 하면 안 됨 |
| `resolvedScales` | 실제 mapping에 필요한 확정된 scale 정보 | public 역변환·domain interaction이 필요하면 검증된 별도 API로 노출 |
| `materializationConfigs` | semantic state만으로 복구되지 않는 replay 가능한 작성 의도 | theme, guide placement, selection/highlight 등과 새 animation/interaction의 영속 의도를 명시적으로 분리 |
| `children`/`compositionSpec` | composition 하위 program과 배치 | child path, owner ID, shared scale, clip, guide scope를 유지 |
| `trace`/`actionStack` | 상위 action과 그 action이 호출한 하위 작업의 provenance | 매 animation frame을 history action 수천 개로 기록하지 말 것 |
| `context` | action 실행의 현재 resource/일시적 materialization context | 외부 DOM listener·timer·worker handle 저장소로 사용하지 말 것 |

핵심 특징은 **자동 semantic→graphic 컴파일러가 아니라 명시적 action orchestration**이라는 점이다. `createScatterPlot`은 point mark 생성, X/Y encoding, color/stroke/size/shape encoding, guide 생성을 호출한다. 상위 차트가 primitive 좌표를 한 번 찍어 내는 shortcut이 아니라 의미가 보존되는 하위 action의 조합이다. 이 패턴을 새 차트·Flint adapter에도 유지해야 한다. [scatter facade][G02]

materialization plan의 순서는 `scales → marks → guides → layout → highlights`다. 같은 step을 deduplicate하고 등록된 operation을 순서대로 실행한다. 새로운 resource는 이 의존 순서에 들어가야 한다. 예를 들어 projection 변화는 geographic mark geometry를 바꾸고 그 결과 clip/hit-test bounds/labels/scene을 바꾼다. projection만 저장하고 기존 graphicSpec을 재사용하는 것은 완결된 edit가 아니다. [planner][G03]

공개 확장은 `ggaction/extension`의 `action`, `ChartProgram`, `registerExtension`으로 가능하다. extension action은 wrapper metadata의 op와 이름이 같아야 하고, builtin 또는 기존 method를 덮어쓸 수 없으며, 등록된 extension이어야 trace persistence가 허용된다. 이것은 domain action을 조합할 수 있는 확장점이다. 새로운 semantic grammar나 renderer primitive를 무제한 주입하는 plugin ABI는 아니다. core validator가 새 geometry를 모르면 extension wrapper를 등록해도 통과하지 않는다. [extension registry][G04]

## 3. 공개 surface의 실제 크기

298개 중 user-facing 291개, advanced 4개, primitive 3개다. default ChartProgram에는 **298개가 모두 실제 method**로 존재했고 basic에는 **71개**가 존재했다. catalog domain은 기능 분류이지 bundle 경계와 항상 일치하지 않는다. 예를 들어 일부 통계 데이터 생성은 `core`, 일부 chart constructor는 `statistics`에 들어 있다. “chart domain 28개”를 “전체 가능한 차트가 28개”로 해석하면 안 된다.

| Domain | 개수 | 주요 역할 |
|---|---:|---|
| core | 47 | canvas/theme/text metric/data lifecycle/coordinate/scale/일부 derived transform |
| statistics | 45 | summary/bin/lookup/fold/computed/interval/ECDF 및 통계 차트 |
| marks | 35 | primitive mark의 semantic 작성, label, annotation, jitter/packing, overlay |
| encodings | 39 | position/appearance/group/path/parallel/radial 및 distribution encoding |
| axes | 55 | Cartesian/polar/parallel axis의 생성·수정·제거 및 구성 요소 |
| grid | 11 | Cartesian/theta/radial grid |
| legend_and_title | 13 | legend block/layout/labels/title/symbols/border와 chart title |
| mark-selection | 7 | select/filter/highlight의 저장된 작성 상태 |
| primitives | 3 | editSemantic/createGraphics/editGraphics |
| composition | 15 | facet/grid/repeat/layer/adjacent/child/layout/shared scale |
| charts | 28 | scatter/line/area/bar/polar/radar/endpoint/raincloud 등의 facade |

공개 entry point는 11개다. 실제 import 결과:

| Entry point | Runtime export |
|---|---|
| `ggaction` | `chart`, `render`, `hconcat`, `vconcat` |
| `ggaction/basic` | `chart`, `render` |
| `ggaction/extension` | `ChartProgram`, `action`, `registerExtension` |
| `ggaction/png` | `renderToPNG`, `renderToPNGBuffer` |
| `ggaction/pdf` | `renderToPDF`, `renderToPDFBuffer` |
| `ggaction/svg` | `renderToSVG` |
| `ggaction/diagnostics` | `getErrorDetails` |
| `ggaction/persistence` | `serializeProgram`, `deserializeProgram`, `serializeGraphic`, `deserializeGraphic` |
| `ggaction/accessibility` | `exportAccessibleData` |
| `ggaction/inspection` | `comparePrograms`, `describeAction`, `getDatasetSchema`, `getMarkItems`, `getPlotComposition`, `inspectProgram` |
| `ggaction/scene` | `createTransitionScene`, `renderTransitionScene` |

각 action의 전체 목록은 문서 끝 부록과 JSON에 있다. JSON은 함수별 타입·옵션·contract heading·implementation line까지 보존하므로 구현자는 해당 action의 정확한 계약으로 이동할 수 있다. `options` 타입 문자열 중 `…`는 카드 generator의 TypeScript 표시 축약이다. 이를 “나머지 옵션도 자유롭게 허용”으로 읽지 말고 companion declaration 원문을 확인해야 한다.

## 4. 현재 차트 표현력과 구체적인 제약

### 4.1 Mark와 coordinate는 별도 축이다

semantic mark는 **9종**이다: `point`, `line`, `bar`, `area`, `arc`, `rule`, `tick`, `text`, `rect`. concrete drawable은 **5종**이다: `circle`, `rect`, `line`, `text`, `path`; `collection`과 `canvas`는 구조를 만든다. 통계 차트는 이 mark들의 의미 있는 조합이다. 예를 들어 error bar/box/raincloud를 하나의 새 renderer type으로 추가하지 않아도 현행 component ownership 위에서 구현할 수 있다. [vocabulary][G05] [graphic schema][G06]

coordinate validator는 정확히 **`cartesian`, `polar`, `parallel`** 세 종류를 허용한다. `geographic`과 `mercator`는 실행 시 `Unknown coordinate type`으로 거절된다. latitude/longitude 필드를 일반 x/y에 넣으면 점을 그릴 수 있어도 spherical projection·antimeridian·map clipping을 보존하는 geo 지원은 아니다. [coordinate validator][G07]

position channel은 mark/coordinate 조합별로 다르다. X/Y는 Cartesian point/line/bar/area/rule/tick/text/rect에서 사용하지만 X2/Y2는 모든 mark의 자유로운 두 번째 좌표가 아니다. X/Y offset 또한 bar/point/rule 중심의 계약을 가진다. theta/radius는 polar point/line/arc에 적용된다. arc의 theta는 quantitative/ordinal/nominal이며 temporal은 허용 목록에 없다. radius는 quantitative다. parallel dimension은 quantitative/ordinal, 최소 2개이며 missing은 break/drop-row/error다. frontend가 field type 선택지를 통일해서 보여주면 실제 action rejection과 충돌할 수 있다. [position compatibility][G08] [parallel validator][G09]

### 4.2 이미 갖춘 mark·chart family

| Family | 현재 구현 메커니즘 | 변환 시 확인할 의미 |
|---|---|---|
| scatter/bubble/dot | point + x/y + size/shape/color/stroke/opacity, createScatterPlot/createDotPlot | size는 면적/반지름 계약을 구분; encodePointRadius와 encodeSize를 임의 대체 금지 |
| line/step/smooth | line + group/pathOrder + curve interpolation | series membership, order, missing break/connect, curve 알고리즘 차이 |
| bar/stacked/grouped/normalized/diverging | bar + position/aggregate/color layout/offset/width | source의 baseline, stack order, negative values, group spacing |
| ranged rect/heatmap | rect와 x/y/x2/y2, bin2d/aggregate | categorical cell과 numeric bin의 경계·empty cell 정책 |
| area/stacked area/horizon | area+range/series layout, density/horizon helpers | boundary interpolation, normalization, clipping, source units |
| pie/rose/radial bar | arc + theta/radius, createPiePlot/createRosePlot/createRadialBarPlot | angle가 share인지 category인지, radius가 linear인지 area-preserving인지 |
| polar scatter/line/radar | theta/radius point/line와 radar semantic facade | Cartesian line을 회전한 것과 다름; closed path/order/frame |
| parallel coordinates | dimension별 scale+polyline+parallel guide | ordinal dimension, missing break/drop, dimension identity |
| distributions | histogram/density/ECDF/violin/gradient/box/raincloud | estimator, bandwidth, weighted statistics, quantiles, group grain |
| uncertainty/regression | interval/errorBar/errorBand/regression line/band | confidence method와 level, mean/median, prediction vs confidence |
| endpoint charts | lollipop/dumbbell/dot+component editing | endpoint aggregation와 stem/rule/point ownership |
| annotations/labels/text | text mark, mark labels, annotation, layoutLabels | selected item grain, data-space anchor와 logical-pixel offset의 구분 |

curve interpolation은 `linear`, `step`, `step-before`, `step-after`, `basis`, `cardinal`, `monotone`, `monotone-steffen`, `natural`의 9종이다. cardinal tension은 cardinal에서만, 0–1 범위로 허용된다. source가 단지 “monotone”이라고 부르는 경우 ggaction의 동일 문자열을 선택하기 전에 실제 interpolation 의미를 비교해야 한다. 문자열 이름의 일치는 path 일치의 증명이 아니다. [curve grammar][G10]

point glyph는 14종(`circle`, `square`, `diamond`, 네 방향 triangle, `plus`, `cross`, `star`, `hexagon`, `wye`, `wedge`, `arrow`)과 제한된 custom polygon을 지원한다. custom polygon은 3–1024 vertices, finite coordinate magnitude 한계, 양의 area, normalization 등의 계약을 따른다. 이것은 작은 point symbol에 대한 지원이다. 임의 지형 polygon/holes/GeoJSON geometry의 계약으로 확장 해석할 수 없다. [point shapes][G11] [point polygon][G12]

series color layout은 `stack`, `fill`, `center`, `group`, `overlay`, `diverging`; 별도 stack transform mode는 `zero`, `normalize`, `center`다. 같은 단어라도 owner와 단위가 다르다. `stack/fill/center` series layout은 negative value를 거절하고 diverging이 음수/양수를 별도로 쌓는다. zero segment를 생략하는 동작 또한 소스별 empty/zero mark의 tooltip·selection 수와 차이를 만들 수 있으므로 표기만 맞추지 말고 cell oracle을 비교해야 한다. [series layout][G13]

### 4.3 Scale: 넓지만 모든 channel의 모든 조합은 아니다

global scale type 집합은 13종이다: `linear`, `log`, `pow`, `sqrt`, `symlog`, `time`, `band`, `point`, `ordinal`, `sequential`, `quantize`, `quantile`, `threshold`. 하지만 role별 허용 범위가 있다. quantitative position은 linear/log/pow/sqrt/symlog, temporal position은 time, band/point는 각 전용 role, continuous color는 sequential/log/pow/sqrt/symlog, discretized color는 quantize/quantile/threshold다. size는 linear/log/sqrt/pow 및 quantize/quantile/threshold/ordinal이며 symlog를 포함하지 않는다. [scale types][G14] [size scale][G15]

옵션 또한 type별로 제한된다. midpoint는 sequential, base는 log, exponent는 pow, constant는 symlog, paddingInner/Outer는 band, padding은 point, align은 band/point다. zero는 log/time에 공통 적용하는 boolean이 아니다. frontend의 generic “scale options” dictionary를 그대로 보내지 말고 channel/scale role에 맞추어 validate해야 한다.

색상은 named palette 68개와 continuous color interpolation, whitePoint/gamma/midpoint 및 ordinal/discretized mapping을 지원한다. 이것은 source tool 전체 color engine과 동일하다는 증거가 아니다. source palette version, color space, out-of-domain/unknown, interpolation of transparency, midpoint와 reverse 조합까지 fixture로 고정해야 한다. payload에 임의 palette 이름을 실어 보내고 fallback하면 목표의 “완벽한 번역”을 위반한다.

현재 public export에 scale inversion API는 없다. backend integration에서 brush/zoom/nearest에 필요하므로 private `resolvedScales`를 각 frontend가 해석하도록 만들면 중복 구현과 의미 drift가 생긴다. **제안:** `getScaleTransform` 또는 동등한 공개 read-only 계약으로 forward/invert/domain/band extent와 clamping/ambiguity 정보를 제공한다. discrete scale은 numeric inverse와 다르게 interval→domain value 집합/nearest category 정책을 명시해야 한다.

### 4.4 데이터와 통계: 원본 입력, 파생 의미, row provenance

`createData`는 dense array of plain row objects와 optional schema를 받는다. URL fetch, CSV reader, asynchronous data source는 이 action의 옵션이 아니다. `url`을 추가한 실제 probe는 unknown option으로 거절됐다. URL·file·SQL·Arrow/typed-column loading은 host/adapter의 resource layer에서 명시적으로 처리한 뒤 검증된 rows와 provenance를 넘기는 구조가 필요하다. [createData][G16]

현재 derived transform registry는 26종이다: bin, bin2d, computed, complete, boxOutlier, boxSummary, density, ecdf, filter, flatten, lookup, fold, gradientProfile, horizon, interval, impute, markFilter, normalize, regression, regressionStatistics, sort, summary, stack, statisticalReference, timeUnit, window. `createDerivedData`는 한 단계 transform tuple을 받으며 변환 사슬은 여러 named dataset으로 구성한다. generic 임의 함수 pipeline이 아니다. [transform policies][G17]

| 구역 | 현재 의미 있는 지원 | 중요한 제한/추가 검사 |
|---|---|---|
| aggregate | count/sum/mean/median/min/max/distinct/valid/missing/variance/varianceP/stdev/stdevP/stderr/q1/q3/ciLower/ciUpper; parameterized quantile/first/last/CI | numeric stability, field type, null, sample/population, order, CI method 구분 |
| summary | groupBy, 복수 aggregate, members, weighted variants | 최대 64 output aggregate, 출력 row 한계, field 충돌 검증 |
| bin/bin2d | domain/bin boundary 기반 aggregation | source auto-bin algorithm과 extent rounding을 동일하다고 가정하지 말 것 |
| density/ECDF | named derived dataset과 distribution facade | bandwidth/kernel/grid/normalization/weight를 source와 비교 |
| regression | linear/polynomial/loess/exp | method별 옵션 제한, loess confidence interval 불허, exp는 interval false 조건 |
| interval | mean+stderr/stdev/ci, median+iqr | median↔iqr 조합 강제, CI method/level 별도 검증 |
| window | rowNumber/rank/denseRank/cumulativeSum/lag/lead/movingMean/movingSum | SQL/Vega의 모든 window operation이 아님; duration unit millisecond/second/minute/hour/day |
| calendar | timeUnit year/quarter/month/day/hour/minute/second/week/weekday, IANA zone, week options | timeUnit bucketing과 computed datePart의 표현력이 다름 |
| lookup/fold/flatten | 구조적 field 변환과 lookup | source join의 duplicate key/null/default/one-to-many 의미 비교 필요 |
| normalize/complete/impute/filter/sort | 닫힌 structured transform | arbitrary expression/code, streaming incremental graph와 구분 |

computed AST는 `field`, `constant`, `op` 중 하나를 갖는 plain node이며 eval을 호출하지 않는다. binary add/subtract/multiply/divide, eq/neq/lt/lte/gt/gte, negate/absolute/log/sqrt/floor, not/isNull, and/or, coalesce/concat, if, toNumber, parseTime, getPath, replaceLiteral, datePart 등이 구현돼 있다. 단, **datePart는 year만**, getPath는 literal field root와 1–8개 nonreserved key, constant는 scalar finite 값, depth 16, node 128, work 10,000,000 한계다. `sin`과 `datePart month` 실제 probe는 거절됐다. timeUnit month를 지원한다고 computed month extraction까지 지원한다고 선언하면 안 된다. [computed grammar][G18]

추가 expression 기능은 parser→source AST→source-neutral typed AST→bounded evaluator로 내려야 한다. 사소한 미지원 연산을 외부 JS precompute로 모두 숨기면 trace/field provenance/editability가 사라지고 매 translator가 통계를 다시 구현한다. 그렇다고 원본 임의 expression 문자열을 `eval`로 실행하는 것도 재현성·검증·소유자 구조를 무너뜨린다. source에서 실제 사용된 operator/arity/null/date semantics의 inventory를 생성하고 닫힌 AST에 부족한 최소 연산 집합을 추가하는 것이 맞다.

### 4.5 수정은 가능하지만 streaming runtime은 아니다

`reviseData({source,id,values,schema?})`는 구현돼 있다. 새 원본 dataset ID를 생성하고 dependent graph를 다시 바인딩·materialize하며 과거 source를 보존한다. 따라서 “데이터 수정 기능이 없다”는 판단은 틀리다. 반면 append/upsert subscription, backpressure, stream chunk, worker cancellation, bounded history 정책은 공개 runtime 계약이 아니다. concat parent는 explicit child를 revise한 뒤 replaceCompositionChild를 사용해야 하며, 함수는 dependent materialization이 성공하는지 사전 실행하고 다시 실행해 반환한다. continuous streaming에 그대로 사용하면 비용을 측정해야 한다. [reviseData][G19]

실제 probe에서 데이터 3행 중 한 행의 y만 수정하고 user `id` 값은 그대로 둔 채 `d → d-v2`로 revise했다. point 개수는 그대로 3개였지만 before/after scene의 point key **공통 집합이 0개**였다. 이 사실은 scene가 잘못됐다는 뜻보다 현재 identity가 **사용자가 지정한 entity key와 revision lineage를 표현하는 public 계약이 아니라는 뜻**이다. 차트값 변경을 부드러운 morph로 이어야 하는 backend에는 stable entity key, composite group key, transform lineage, revision scope가 필요하다.

### 4.6 Guide, typography, design

guide surface는 작지 않다. X/Y/theta/radial/parallel axes, line/tick/label/title의 개별 작성, horizontal/vertical/theta/radial grid, named axis targets, 복수 legend block과 layout, label/title/symbol/border, chart title, guide removal을 지원한다. labels에는 format, font, rotation, maxWidth, wrapping, lineHeight, overlap, labelMap, offset, colorMap, align 등 owner별 옵션이 있다. 이 옵션들은 모든 text owner가 공유하는 무제한 CSS 객체가 아니다.

`applyTheme`은 light/dark 또는 정해진 token 집합의 custom theme을 적용한다. token은 background/mark/text/strongText/mutedText/axis/axisTitle/grid/border/statistical colors/highlight/fontFamily/axis text family와 size 등을 포함한다. CSS custom properties/Fluent token/theme provider를 그대로 소비하는 runtime이 아니다. Flint의 design token을 native token 및 explicit style override에 매핑하고 원본 theme identity/version은 adapter metadata로 유지해야 한다.

text는 concrete fontFamily/fontSize/fontWeight/fontStyle/alignment/baseline/rotation, resolved lines를 가진다. `applyTextMetrics`로 측정된 width profile을 반영하고 typography/materialization을 다시 계산할 수 있다. renderer는 계산된 text line을 다시 layout하는 곳이 아니다. browser/Node font가 다르면 줄바꿈, guide overflow, facet packed bounds가 달라질 수 있다. 실제 release Linux에서는 Hangul fallback font 없음으로 source test 1개가 skip됐다. 이것은 해당 폰트/출력 경로의 보장이 비어 있다는 신호로 관리해야 한다. [text metrics action][G20]

현재 value format은 `auto`, 제한된 decimal/fixed/percent/exponential/grouped formatting, `%Y/%m/%d/%b/%a/%H/%M/%S/%L/%%` UTC directive 중심이다. D3-format 전체 grammar, locale-aware currency/compact/ordinal/calendar text 전체와 동일한 계약이 아니다. 사용자 도구의 locale와 timezone이 숫자/날짜 label에 관여하면 별도 source-neutral `format` specification과 host-independent formatter oracle이 필요하다. [value format][G21]

작은 layout probe도 실제 제약을 보여준다. `400×260, margin:35` canvas에 default scatter guide를 붙이면 x-axis title/label overlap 때문에 action이 실패했다. 같은 dataset을 `600×420, margin:80`에서 만들면 성공했다. 이를 단순히 “그리기 실패 버그”로 부를 수는 없다. 현재 layout validation이 명시적인 bounded authoring 계약이기 때문이다. 그러나 responsive backend가 되려면 viewport에 대한 fit, preferred/minimum plot size, text metric availability, overflow/fallback을 누가 결정하는지 계약해야 한다. 무조건 margin을 키우는 translator는 원본 layout fidelity를 보장하지 못한다.

### 4.7 Composition과 ownership

unit의 여러 layer, `createLayerPlot`, follow/snapshot overlay, adjacent plot, hconcat/vconcat, facet/facetGrid, repeatCharts, child insert/remove/replace/reorder, composition layout edit, shared scale edit가 이미 있다. plot-composition registry는 29개 constructor를 역할별로 이해한다. statistics domain constructor도 여기에 포함되므로 chart domain의 28개와 수가 다르다. [composition registry][G22]

`createLayerPlot`은 새 layer의 native constructor를 실행해 의미를 유지한다. `createOverlay`는 원본 mark의 visible item endpoint를 따르는 별도 기능이다. 현재 overlay source는 Cartesian bar/point/line/area, complete X/Y, independent mark를 요구한다. categorical density silhouette와 또 다른 overlay를 원본으로 삼는 경우는 제한된다. basis=visibleItems, mode=follow 등은 실제 contract이므로 임의 composed chart의 universal linking API로 해석하면 안 된다. [overlay grammar][G23]

facet scale은 shared/independent, X/Y/offset/theta/r/color/stroke/size/shape/opacity/strokeDash/parallelDimensions 등의 owner별 resolution을 갖는다. topLane도 stacked/shared로 구분한다. field partition과 guide placement는 의미적으로 지원하지만 arbitrary dashboard auto-layout, independently packed wrapped facet geometry, shared footer axis의 모든 원본 배치가 자동 일치한다는 뜻은 아니다. release closeout은 issue #258의 **external original-chart geometry/source-family fidelity qualification이 남아 있음**을 명시했다. 현재 issue의 전체 현황·target fixture는 상위 보고서의 GitHub/source 비교를 따른다.

backend contract의 target은 문자열 mark ID만으로 부족하다. 최소 `{childPath, ownerId}`가 필요하고, series/item ID와 composition child ID를 섞지 않아야 한다. 현재 inspection ResourceRef와 scoped action target은 좋은 출발점이다. source를 flatten한 canvas pixel snapshot으로 바꾸면 child edit, legend collect, facet header, row highlight, persistence가 모두 역행한다.

## 5. concrete graphics가 보장하는 것과 아직 표현하지 못하는 것

모든 drawable position은 finite, width/height/radius/strokeWidth 등은 nonnegative, opacity는 0–1이다. text fontSize는 positive이며 fill/line style도 닫힌 validator를 통과한다. 실제 primitive property 집합에 image, raster tile, texture/pattern, arbitrary SVG DOM, shadow/filter, mesh가 없다. `createGraphics({type:'image'})`와 point shadowBlur는 실제로 거절됐다. [concrete validator][G24]

현재 structured fill은 linear gradient와 string fill이다. gradient는 rect/path에서 허용되며 circle/text 등의 모든 primitive에서 동일하게 허용되는 것은 아니다. blend도 normal/difference의 제한된 범위이며 circle은 normal만이다. source의 radial gradient, multi-stop alpha, pattern, image fill, arbitrary blend mode를 “색상 문자열 지원”으로 대체해서는 안 된다. 모든 새 paint 종류는 concrete schema, persistence, SVG, Canvas, native PNG/PDF, scene, visual oracle에 동시에 들어가야 한다. [paint grammar][G25]

### 5.1 Geo를 막는 더 낮은 수준의 path 제약

path grammar는 **M/L/C/Z**만 허용한다. 최초 M 하나, subpath 하나, Z는 마지막이라는 검증을 강제한다. SVG의 A/Q/H/V 등의 원본 command는 직접 받지 않는다. A command 부재 자체는 cubic로 정확한 허용 오차 내 lowering하면 해결할 수 있지만, **holes/MultiPolygon의 topology를 표현할 compound subpath/fill-rule 계약이 없는 것**은 구조적인 결손이다. [path grammar][G26]

실행 증거:

| 입력 | 실제 결과 |
|---|---|
| M→L→L→Z 단일 polygon | accepted |
| 외곽 ring M…Z 뒤 내부 ring M…Z | `path.commands supports one subpath and only one initial M.` |
| path `fillRule:'evenodd'` | `Unknown path graphic property "fillRule".` |
| M 뒤 A arc command | `must be an M, L, C, or Z command.` |

Canvas path renderer는 공통 validator를 통과시킨 후 `beginPath`, moveTo/lineTo/bezierCurveTo/closePath, **인수 없는 `fill()`**로 그린다. SVG serializer도 같은 validator와 final Z 검사를 사용하고 `fill-rule` attribute를 생성하지 않는다. Canvas scene는 기존 renderer로 다시 내려간다. 따라서 외부 adapter에서 여러 ring을 임의로 넣어 해결할 수 없다. [Canvas path][G27] [SVG path][G28] [Canvas scene][G29]

**필수 제안:** compound path의 `subpaths` 또는 여러 M/Z를 허용하는 canonical commands와 `fillRule:'nonzero'|'evenodd'`를 정의한다. geometry bounds, clip bounds, gradient bounds, hit-test, scene topology key, persistence migration까지 동일한 ring 구조를 소비해야 한다. 대륙 바깥 ring과 호수 hole을 각각 채워진 shape로 칠하는 편법은 hole 색상을 background로 덮어쓰는 문제를 낳고, 지도 위 다른 layer/texture/transparent background에서 틀린 결과가 된다.

## 6. interaction: 현재 authoring selection은 좋은 기초지만 event engine은 아니다

`selectMarks`, `editMarkSelection`, `highlightMarks`, `filterMarks`, 각 remove action은 실제 구현돼 있고 저장·복원된다. selector는 field/channel/property 또는 source rows 기반이며 eq/neq/gt/gte/lt/lte/oneOf/range/min/max, item/stack grain을 갖는다. row selector는 `{data,indices}`로 원본·파생 row provenance를 연결한다. 이것은 program을 작성하는 연산이다. pointermove, click, drag, wheel, touch, keyboard를 등록하거나 tooltip DOM을 띄우는 작업이 포함돼 있지 않다. [selection grammar][G30]

`getMarkItems`는 semantic item별 key, mark type, fields, channels, concrete geometry 배열, row references, bounds를 반환한다. `inspectProgram`은 rawRows/logicalDataItems/drawablePrimitives/visibleCandidates, opacity-zero/zero-size/outside-clip/missing-skipped 등을 구분한다. 기존 mark의 semantic grain과 geometry를 재사용할 수 있으므로 새로운 hit-test가 raw SVG DOM index를 해석할 필요는 없다. 하지만 bounds가 존재한다는 것만으로 path stroke 거리, ring hole, occlusion, rectangular brush/nearest/lasso 판정을 지원하는 것은 아니다. [inspection API][G31]

**제안하는 engine/runtime 분리:**

1. core에 serializable selection parameter, predicate, target scope, output binding 등의 의미 계약을 둔다. event object/DOM node/callback 함수는 저장하지 않는다.
2. scene/inspection adapter가 mark item→geometry→spatial index를 만든다. stable item key와 original row lineage를 결과로 반환한다. index는 immutable scene version 단위로 cache하고 dispose 가능해야 한다.
3. browser runtime이 pointer/touch/keyboard input을 정규화하고 hit-test→selection value→effect action/ephemeral highlight→render를 수행한다.
4. data filter와 presentation highlight를 분리한다. hover마다 새 source dataset과 전체 immutable trace를 누적하는 방식을 기본으로 삼지 않는다.
5. cross-view linking은 pixel identity가 아니라 declared key/row lineage/field value predicate를 사용한다. aggregate mark는 membership semantics를 명시한다.
6. interaction commit 시점을 구분한다. drag 중 transient preview, pointerup의 committed domain, keyboard step, undo/redo, external controlled state update의 순서를 문서화한다.

**필수 테스트:** clipping된 item 불선택, stroke-only line tolerance, point polygon 정확한 hit, overlapping mark topmost/all policy, transformed child offset, facet scope, devicePixelRatio, CSS canvas resize, touch pointer cancellation, keyboard focus order, aggregate member selection, revised data에서 selection 유지/해제, event listener cleanup, stale async result 미반영, undo 시 transient state 처리. 목록에 있는 runtime을 구현하고 직접 실행한 뒤에야 “interaction compatible”로 판정할 수 있다.

## 7. animation: scene extraction과 player를 구분해야 한다

`createTransitionScene`은 현재 SVG format version 1과 Canvas format version 2를 생성한다. immutable program별 WeakMap cache를 사용하며 scene는 structured-clone 가능한 concrete 데이터다. SVG node는 serialized SVG와 offset/clip 및 key/topology를, Canvas node는 concrete properties와 clip stack을 제공한다. `renderTransitionScene`은 version 2를 검증해 기존 Canvas renderer로 그린다. mutable intermediate scene는 cache하지 않으므로 외부 animation consumer가 frame을 구성할 수 있도록 고려돼 있다. [scene producer][G32] [scene renderer][G29]

그러나 public surface에는 timeline, duration, easing, play/pause/seek/cancel, keyframe schedule, interpolation, interruption arbitration, RAF clock이 없다. 따라서 현재 기능은 **animation consumer용 scene 공급**이다. “애니메이션을 지원한다”는 넓은 문장 대신 “stable correspondence hints를 포함한 transition scene를 만들며 외부 consumer가 재생을 구현할 수 있다”고 기술해야 한다.

identity는 source dataset와 layer scope, member row의 value token을 조합한다. line/area에는 member order의 topology token도 있다. unknown provenance는 보수적인 fallback으로 남는다. 이는 style edit와 filter/sort의 일부 경우에 좋은 출발점이다. 하지만 reviseData probe의 0/3 shared key는 명시적 entity key가 없는 한 값 변경·stream update를 전부 같은 객체의 움직임으로 연결할 수 없음을 보여준다. **새 player 전에 key/lineage contract를 먼저 확정해야 한다.**

**제안:** `TransitionPlan`은 immutable before/after scene, node correspondence, enter/update/exit, interpolation eligibility, timing intent를 저장한다. pure `sampleTransition(plan,t)`는 clock 없이 deterministic intermediate scene를 만든다. host player는 RAF/virtual clock, pause/resume/seek/interrupt/dispose를 소유한다. public 명칭은 설계 예시이며 현재 API가 아니다.

interpolation 최소 규칙은 다음과 같다.

| 변화 | 기본 규칙 제안 | 금지할 편법 |
|---|---|---|
| circle/rect/line의 동일 primitive 숫자 값 | 단위가 같은 finite property를 interpolate | radius와 area를 같은 값으로 취급 |
| color/opacity | 명시된 color space, alpha 규칙, premultiplication 여부 | source color interpolation과 무관한 RGB 문자열 보간 |
| text content/font family/line break | stable label identity, crossfade 또는 명시된 discrete switch | 문자열을 숫자처럼 보간, label이 다른 tick으로 morph |
| path 동일 topology | matching subpaths/command arity/semantic point correspondence | vertex 수만 맞춘 임의 index zip |
| path topology 변경 | crossfade 기본; 별도 검증된 remeshing opt-in | hole 또는 line break가 연결되는 가짜 morph |
| scale/domain change | mark+axes+grid+legend+clip의 coherent plan | mark만 이동하고 tick/label을 마지막에 교체 |
| composition/reorder | child scope identity와 global/relative frame 구분 | DOM 순서를 identity로 사용 |
| interrupt | 현재 sampled scene부터 새 목표로; transaction 우선순위 명시 | 중단된 promise가 나중 상태를 덮어씀 |

테스트는 before/after screenshot만으로 충분하지 않다. t=0,중간,t=1 oracle, seek reversibility, reduced motion, duration=0, reentry/exit, simultaneous data+scale+layout, native/browser frame parity, clipping, long-session memory, scene cache lifetime를 확인해야 한다. full semantic program을 매 frame 재생성할 필요가 없는 변화는 concrete interpolation으로 처리하되 최종 committed program과 scene는 반드시 일치해야 한다.

## 8. geo: core가 가져야 할 의미와 host가 가져야 할 자원

현재 native geography resource/projection/GeoJSON/TopoJSON action은 없다. primitive path/custom point polygon이 존재해도 projection 정의, spherical geometry, ring topology, feature property, projection edit, geospatial hit-test, geographic data lineage를 저장하지 않는다. 목표를 만족하려면 다음을 독립적인 구현 범위로 잡아야 한다.

| 계층 | 필요한 책임 | 기존 접점 |
|---|---|---|
| resource adapter | GeoJSON/TopoJSON fetch/parse, object selection, content hash, license/provenance, size/complexity caps | createData 앞의 외부 loader/manifest |
| semantic geometry | feature ID/property/Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon/GeometryCollection, coordinate reference rules | semantic dataset/schema 및 새 geo geometry resource |
| projection | type/parameter/fit/extent/rotation/precision/clip; known invert availability | coordinate/scale의 새 소유자, 기존 Cartesian/polar와 구분 |
| materialization | spherical clipping, antimeridian cutting, adaptive resampling, projected path, feature row mapping | grammar + materialization plan |
| concrete drawing | compound path/fillRule, clip hierarchy, stroke/fill, point symbols | shared graphic schema, renderer, scene |
| interaction | feature hit, polygon hole, boundary tolerance, map pan/zoom/brush, inverse coordinate | item identity + hit-test + host events |
| animation | projection/camera change의 topology-aware interpolation 또는 crossfade | TransitionPlan, geographic correspondence |
| tiles/attribution | request/cache/cancel/provider-specific attribution, optional image/raster resource | 별도 host capability; semantic map contract에는 provenance 유지 |

projection API를 설계할 때 “mercator 하나를 지원하면 geo 완료”라고 범위를 줄이면 안 된다. 목표 source inventory에 존재하는 projection type·feature collection·point/line/polygon/raster·camera transition·graticule·sphere·choropleth join이 모두 capability requirement가 되어야 한다. 추가 projection은 source의 구현체 이름을 public domain action에 새겨 넣지 말고 수학적 type/parameter와 versioned lowering으로 설명해야 한다.

shape test는 위도경도 몇 개 찍는 것에 그치지 않는다. dateline을 가로지르는 polygon, pole 주변, hemisphere clip, hole orientation, degenerate ring, islands/MultiPolygon, tiny feature, null geometry, duplicated feature key, projection singularity, long route, wrong CRS, join unmatched feature, weighted color domain, nested facet map 등을 포함해야 한다. GeoJSON을 외부에서 SVG로 바꿔서 image/path로 끼워 넣은 결과는 정적 thumbnail fallback일 수 있어도 사용자 목표의 native simple-action translation 성공으로 계산해서는 안 된다.

## 9. persistence, inspection, accessibility와 backend 제품 계약

editable persistence는 schema version 3, graphic-only는 version 1이다. 구버전 editable envelope를 migration하고 program state/trace/extensions를 검증한다. `serializeProgram`은 열린 actionStack을 허용하지 않는다. graphic-only 저장은 렌더링된 geometry를 다시 그릴 수 있지만 semantic 편집 정보를 보존하지 않는다. report/adapter에서 두 저장 형식을 혼용하면 “roundtrip 성공”이 의미를 잃는다. [persistence][G33] [state keys][G34]

interaction/animation/geo를 추가하면 schema revision과 migration이 필요하다. 기존 program을 로드했을 때 새 resource가 absent인 상태가 명확해야 하고, supported version·extension availability·asset resolution failure를 오류로 분리해야 한다. DOM event binding이나 URL fetch를 deserialization side effect로 실행하지 않는다. asset resolver와 runtime attach는 명시적인 후속 단계여야 한다.

`comparePrograms`는 `equal/different/unknown`, `completeProgramComparison`을 제공한다. `inspectProgram` 또한 partial/unsupported를 드러낸다. 이 API는 현재의 불완전한 관찰 범위를 감추지 않는다는 점에서 유용하다. backend의 “번역 성공” check는 `unknown` 또는 partial을 equal로 취급하지 않아야 한다. `describeAction`의 supported/needs-input/incompatible/unsupported/unverified는 action 선택 보조 정보이며 모든 option combination을 렌더링 테스트했다는 증거가 아니다.

`exportAccessibleData`는 chart의 final semantic value/series/owner/child view를 export한다. SVG renderer는 title/description도 받는다. 이는 접근성 지원의 일부지만 focusable mark, keyboard interaction, live region, tooltip semantics, chart summary, brush/zoom의 동등 입력 방식까지 제공하는 complete widget toolkit이 아니다. 새로운 browser interaction layer는 이 export를 재사용하고 native semantic item과 focus/announcement identity를 연결해야 한다. [accessibility API][G35]

**제안하는 backend request/result 계약:**

```ts
// 설계 제안. 현재 ggaction public API가 아니다.
type BackendRequest = {
  requestId: string;
  sourceDialect: { name: string; version: string; sourceHash: string };
  actionPlan: readonly { op: string; options: JsonObject }[];
  resources: readonly ResourceManifestEntry[];
  viewport: { width: number; height: number; pixelRatio: number };
  textMetricsProfile?: TextMetricsProfileRef;
  expectedProgramRevision?: string;
};
type BackendResult = {
  requestId: string;
  programRevision: string;
  program: EditableProgramEnvelope;
  scene: VersionedConcreteScene;
  itemIndex: SemanticItemIndex;
  capabilityDecisions: readonly CapabilityDecision[];
  diagnostics: readonly SourceMappedDiagnostic[];
};
```

actionPlan은 가능한 native action으로 구성한다. 지원하지 않는 작업을 원본 renderer로 몰래 실행하고 result에 성공을 넣지 않는다. SourceMappedDiagnostic은 source JSON path/field/transform/mark와 ggaction target/action/option path를 함께 제공한다. 실패는 missing-data, unsupported-capability, invalid-input, layout-overflow, resource-limit, render-error로 구분한다. 모든 요구 기능을 끝내는 것이 목표이므로 unsupported는 영구 면제가 아니라 명시적인 backlog entry와 required test로 연결한다.

## 10. 성능·자원·패키지 제약

현행 보호 한계는 기능이다. 한계를 끄는 것만으로 대규모 backend가 완성되지 않는다.

| 항목 | 현행 수치/규칙 | 목표에서의 영향 |
|---|---|---|
| 일반 generated items | 10,000 | facets×series×labels 등의 실제 expansion 고려 |
| point-owned graphics | 50,000 | 일반 path/rect까지 같은 수를 허용한다고 추정 금지 |
| generated work | 10,000,000 | group cross product, statistical algorithm 상한 |
| 한 path command | 30,000 | 고해상도 지도/복잡한 trajectory에서 resource 계획 필요 |
| computed AST | depth 16, nodes 128, work 10,000,000 | source expression compiler에서 정규화 후 크기 검사 |
| summary aggregate outputs | 64 | wide-table 번역 시 named transform 분해 |
| summary output rows | 30,000 | 일반 graphical item 한계와 별도임 |
| point custom polygon | 3–1024 vertices | GeoJSON polygon 허용량으로 전용 불가 |
| raster allocation | dimension 32,767; pixels 16,777,216 | canvas size×DPR² 확인, export resolution 제한 |
| PDF | 한 페이지; positive integer dimension, 별도 최대 | dashboard paging/export pagination은 host 설계 |

[공통 resource validation][G36] [raster limits][G37] [PDF adapter][G38]

package는 Node >=20을 요구하며 core에 필수 runtime dependency를 두지 않고 `@napi-rs/canvas`와 MCP SDK를 optional peer로 둔다. PNG/PDF Node adapter와 browser-safe core/scene가 나뉘어 있다. frontend bundle에 native dependency를 실수로 넣지 말고 package exports 수준에서 browser import smoke test를 유지해야 한다. geo/interaction/animation 확장도 `ggaction/geo`, `ggaction/interaction`, `ggaction/animation` 같은 optional entry point를 검토할 수 있으나 이 이름은 제안이다. projection·geospatial parser·spatial index를 default entry에 무조건 넣으면 기존 lightweight consumer 비용이 증가한다.

성능 검증은 `n`개의 source row만으로 충분하지 않다. `source rows, derived rows, semantic items, drawable primitives, path commands, text glyphs, active views, trace nodes, serialized bytes, raster pixels`를 함께 기록해야 한다. coarse source rows만 보고 비용을 제한하면 small input→large complete/facet/label expansion을 놓친다. 처음부터 모든 알고리즘을 incremental로 다시 작성할 필요는 없지만, stream/brush의 burst에서 previous request cancellation, latest-result-wins, caching/eviction, trace retention, disposal이 제품 계약에 들어가야 한다.

## 11. 실제 실행한 현재 API recipe

다음 코드는 신규 API 제안이 아니라 focused probe에서 실행한 **현행 native API**다. 예제의 size/margin은 이 fixture의 guide layout을 통과하기 위한 값이며 모든 viewport의 자동 대응을 보장하지 않는다.

```js
import { chart } from 'ggaction';
import { serializeProgram, deserializeProgram } from 'ggaction/persistence';
import { createTransitionScene } from 'ggaction/scene';

const rows = [
  { id: 'a', x: 1, y: 2, group: 'A' },
  { id: 'b', x: 2, y: 1, group: 'B' },
  { id: 'c', x: 3, y: 4, group: 'A' }
];

// 1. semantic scatter + named source-row highlight + editable roundtrip
const scatter = chart()
  .createCanvas({ width: 600, height: 420, margin: 80 })
  .createData({ id: 'd', values: rows })
  .createScatterPlot({ id: 'p', data: 'd', x: 'x', y: 'y', color: 'group' });
const highlighted = scatter
  .selectMarks({ id: 'sel', target: 'p', rows: { data: 'd', indices: [0, 2] } })
  .highlightMarks({ selection: 'sel', color: '#e64343', dimOthers: { opacity: 0.2 } });
const restored = deserializeProgram(serializeProgram(highlighted));

// 2. field와 aggregate로 정의한 native rose
const rose = chart()
  .createCanvas({ width: 500, height: 500, margin: 80 })
  .createData({ id: 'd', values: rows })
  .createRosePlot({ id: 'rose', category: 'group', value: 'y', aggregate: 'sum', guides: false });

// 3. 원래 program을 공유 scale facet로 composition
const faceted = scatter.facet({
  field: 'group', data: 'd', columns: 2,
  scales: { x: 'shared', y: 'shared' }
});
const canvasScene = createTransitionScene(faceted, { format: 'canvas' });
```

첫 recipe는 원본 scatter를 변경하지 않고 selection/highlight가 저장·복원되며 SVG가 동일한 것을 확인했다. rose는 polar semantic coordinate와 arc item을 생성했고, facet는 두 child와 scene를 생성했다. 이 scene를 만든 사실은 animation을 재생했다는 뜻이 아니다.

## 12. 구현 작업으로 바로 전환할 수 있는 gap 목록

다음 순서는 dependencies를 반영한다. 일부 design/statistics 확장은 identity/runtime 작업과 병렬화할 수 있지만, geo path와 interaction/animation은 공통 geometry/identity 계약을 공유해야 한다.

| ID | 작업 | 구현 owner | 완료 조건 |
|---|---|---|---|
| GA-01 | 외부 requirement→native capability manifest | contract/card generator + source adapters | source별 요구 feature/옵션/행동 100% 열거; unsupported를 성공 분모에서 제거하지 않음 |
| GA-02 | stable semantic item identity와 revision lineage | dataset schema/revision/selection/scene/persistence | 동일 entity 업데이트/reorder/duplicate/group/facet에서 key 관계를 oracle로 검증 |
| GA-03 | compound path와 fillRule | path/concrete schema/bounds/Canvas/SVG/scene/native | holes/MultiPolygon/clip/gradient/hit-test 모두 일치 |
| GA-04 | geographic resource/projection/marks | 새 grammar/action/materialization + loader | target corpus의 geometry/projection 전체, spherical oracle 통과 |
| GA-05 | read-only mapping/inversion 및 hit-test | scales + inspection/scene geometry | coordinate/child offset/clip/DPR 포함 정확한 selection |
| GA-06 | interaction intent와 browser lifecycle | semantic resource + 별도 runtime | pointer/touch/keyboard/linked views/tooltip/brush/zoom/dispose 전수 |
| GA-07 | deterministic transition plan/sample/player | scene identity + optional animation module | intermediate frame, interruption, reduced motion, final program 일치 |
| GA-08 | expression/transform 의미 확장 | closed AST + transform owners | source operator/type/null/order/time semantics 및 numerical oracle |
| GA-09 | image/paint/typography resource 계약 | concrete schema/renderers + style/label owners | 실제 target 요구 image/gradient/pattern/text를 모든 output backend에서 검증 |
| GA-10 | source geometry에 맞는 composition/layout | facet/compose/layout/typography | source chart별 plot box/guide box/text/clip의 명시 tolerance 충족 |
| GA-11 | backend adapter/session API | source-neutral plan + host runtime | request revision/cancel/cache/assets/errors/persistence roundtrip |
| GA-12 | complete compatibility gate | test/consumer/browser/render/realistic/source corpus | 모든 required chart와 event/animation state가 통과, allowlisted skip=0 |

각 작업의 테스트는 action가 property를 저장하는지 확인하는 수준에서 멈추면 안 된다. 예를 들어 GA-03의 최소 fixture는 외곽 사각형+내부 hole이고, semantic owner selection·SVG fill-rule·Canvas bitmap·PNG/PDF·scene roundtrip·bounds·hole hit-test를 한 번에 확인해야 한다. GA-02의 최소 fixture는 이 보고서의 reviseData 3행 예제다. 수정되지 않은 entity의 key가 유지되고, 수정된 entity도 declared key에 따라 대응하며, 제거된 entity는 exit, 새 entity는 enter로 분류되어야 한다.

## 13. 현재 테스트 증거를 어떻게 해석해야 하는가

기존 `study/release-0.0.26/closeout.json`에는 local 6,281/6,281, Linux source 6,280 pass+1 font skip, browser 295/295, render 265/265, coverage lines 95.79%/branches 93.35%/functions 98.72%, critical floors 182개가 기록돼 있다. PR/main/release checks 또한 각각 20/20,20/20,22/22다. 이 숫자는 현재 release의 강한 회귀 검증 근거이며 이 audit에서 대규모 suite를 다시 실행하지 않았다.

**coverage 95.79%는 외부 표현력 95.79%가 아니다.** 새 feature가 source에 구현되지 않았다면 해당 feature는 executable line 분모에도 없다. full compatibility는 요구 chart/state/event/projection별 oracle가 모두 있어야 측정할 수 있다. “298개 action 모두 implemented”, “모든 unit test green”, “source chart screenshot 생성 성공”을 각각 “모든 source chart를 제대로 native action으로 번역했다”와 동치로 취급하지 않는다.

최종 검증은 적어도 네 축이 필요하다: (1) data/statistical meaning, (2) concrete geometry/design, (3) runtime interaction/animation sequence, (4) save/reload/edit/revise/export continuity. 모든 차트가 필요하다는 사용자 목표를 보존하려면 coverage report가 이 네 축 중 부족한 축을 명확히 보여줘야 한다.

## 14. 증거 링크

아래 링크는 모두 분석 commit으로 고정돼 있다. source branch가 바뀌어도 이 보고서의 근거는 바뀌지 않는다. 전체 action별 링크는 machine inventory에 추가로 있다.

[G01]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/core/ChartProgram.js#L27
[G02]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/scatter.js#L27
[G03]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/materialization/planner.js#L3
[G04]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/core/extensionRegistry.js#L77
[G05]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/core/vocabulary.js#L1
[G06]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/schemas/graphic.js#L1
[G07]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/coordinates.js#L5
[G08]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/positionCompatibility.js#L1
[G09]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/parallelCoordinates.js#L15
[G10]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/curveCommands.js#L4
[G11]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/pointShapes.js#L6
[G12]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/pointPolygon.js#L4
[G13]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/seriesLayout.js#L35
[G14]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/scales/types.js#L11
[G15]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/scales/size.js#L20
[G16]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/create.js#L11
[G17]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/transforms.js#L298
[G18]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/computed.js#L8
[G19]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/revise.js#L35
[G20]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/textMetrics/index.js#L34
[G21]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/valueFormat.js#L1
[G22]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/plotComposition.js#L1
[G23]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/overlay.js#L6
[G24]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/schemas/concreteGraphic.js#L30
[G25]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/paint.js#L39
[G26]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/pathCommands.js#L10
[G27]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/canvas/path.js#L6
[G28]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/svgSerialization.js#L313
[G29]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/canvas/scene.js#L57
[G30]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/grammar/markSelection.js#L1
[G31]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/types/inspection.d.ts#L45
[G32]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/scene.js#L27
[G33]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/persistence.js#L1
[G34]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/persistence/validation.js#L63
[G35]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/types/accessibility.d.ts#L37
[G36]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/core/validation.js#L5
[G37]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/canvas/limits.js#L2
[G38]: https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/renderers/pdf.js#L69


## 부록 A. 공개 action 298개 전수 목록

옵션/타입/소스 위치는 companion JSON/CSV에서 같은 이름으로 조회한다. 아래는 domain별 전수 명단이며 서로 중복 집계하지 않았다.

### core (47)

- `createCanvas` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/canvas/actions.js#L135); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L5)
- `editCanvas` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/canvas/actions.js#L103); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L73)
- `fitCanvas` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/canvas/fitting.js#L234); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L115)
- `applyTextMetrics` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/textMetrics/index.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L153)
- `removeTextMetrics` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/textMetrics/index.js#L44); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L174)
- `applyTheme` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/theme/actions.js#L31); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L190)
- `removeTheme` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/theme/actions.js#L73); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L261)
- `createData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/create.js#L13); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L289)
- `reviseData` — user-facing; Immutable create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/revise.js#L61); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L331)
- `removeData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/resources/remove.js#L165); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L352)
- `removeScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/resources/remove.js#L168); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L388)
- `removeCoordinate` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/resources/remove.js#L171); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L412)
- `bindMarkData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/derived.js#L165); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L435)
- `filterData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/filter.js#L85); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L467)
- `createDensityData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/density.js#L47); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L961)
- `createRegressionData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/regression.js#L46); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L893)
- `createRegressionStatisticsData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/regressionStatistics.js#L44); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1468)
- `createWindowData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/window.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1529)
- `createTimeUnitData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/timeUnit.js#L19); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1416)
- `createBin2DData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/bin2d.js#L129); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1588)
- `editBin2DData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/bin2d.js#L170); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1652)
- `editDerivedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L380); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1083)
- `editFilteredData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L455); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1145)
- `editTimeUnitData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L476); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1259)
- `editWindowData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L482); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1275)
- `editDensityData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L487); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1291)
- `editRegressionData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L496); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1322)
- `editRegressionStatisticsData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/regressionStatistics.js#L60); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1506)
- `createCoordinate` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/coordinates/actions.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1700)
- `editCoordinate` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/coordinates/edit.js#L30); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1726)
- `createScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/create.js#L81); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1783)
- `editScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/edit.js#L159); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1871)
- `editXScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L11); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1993)
- `editYScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L19); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2007)
- `editXOffsetScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/offset.js#L42); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2021)
- `editYOffsetScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/offset.js#L43); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2068)
- `editParallelScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/parallel.js#L48); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2090)
- `editThetaScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2112)
- `editRScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L34); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2126)
- `editColorScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L41); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2140)
- `editStrokeScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L48); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2154)
- `editSizeScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L56); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2174)
- `editOpacityScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L63); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2195)
- `editShapeScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L69); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2209)
- `editStrokeWidthScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L73); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2223)
- `editStrokeDashScale` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/scales/channels.js#L80); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2237)
- `createDerivedData` — user-facing; Immutable create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/derived.js#L38); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1049)

### statistics (45)

- `createSummaryData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/summary.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L511)
- `createBinData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/bin.js#L21); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L568)
- `createLookupData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/lookup.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L604)
- `createFlattenData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/flatten.js#L11); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L642)
- `createFoldData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/fold.js#L16); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L677)
- `createComputedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/computed.js#L16); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L706)
- `createNormalizedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/normalize.js#L19); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L749)
- `createSortedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/sort.js#L13); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2258)
- `createCompleteData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/complete.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L784)
- `createImputedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/impute.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L824)
- `createStackData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/stack.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L859)
- `editComputedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L452); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1130)
- `editLookupData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L461); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1161)
- `editFlattenData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L458); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1185)
- `editFoldData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L464); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1212)
- `editSummaryData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L467); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1227)
- `editBinData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L470); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1243)
- `editStackData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L493); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1307)
- `editIntervalData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L505); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1338)
- `editECDFData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L510); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1354)
- `editNormalizedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L515); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1369)
- `editSortedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L502); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L2277)
- `editCompleteData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L521); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1385)
- `editImputedData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/edit.js#L526); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/CORE.md#L1401)
- `createIntervalData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/interval.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L34)
- `createECDFData` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/ecdf.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L5)
- `createRegression` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/create.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L307)
- `editRegression` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/edit.js#L253); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L371)
- `createErrorBar` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBars/create.js#L255); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L77)
- `editErrorBar` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBars/edit.js#L399); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L140)
- `createErrorBand` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBands/create.js#L169); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L183)
- `editErrorBand` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBands/edit.js#L314); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L253)
- `editErrorBandBoundary` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/errorBands/edit.js#L476); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L286)
- `createBoxPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/boxPlots/create.js#L23); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITE_MARKS.md#L9)
- `editBoxPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/boxPlots/edit.js#L201); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITE_MARKS.md#L123)
- `createGradientPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/gradientPlots/create.js#L22); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRADIENT_PLOTS.md#L37)
- `editGradientPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/gradientPlots/edit.js#L114); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRADIENT_PLOTS.md#L114)
- `createViolinPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/violinPlots/create.js#L135); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/VIOLIN_PLOTS.md#L7)
- `editViolinPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/violinPlots/edit.js#L60); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/VIOLIN_PLOTS.md#L65)
- `createRegressionBand` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/components.js#L75); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L405)
- `editRegressionBand` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/components.js#L123); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L474)
- `createRegressionLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/components.js#L187); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L443)
- `editRegressionLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/regression/components.js#L158); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/STATISTICS.md#L494)
- `createDensityPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/density.js#L17); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L604)
- `createHorizonPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/horizon.js#L44); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L647)

### marks (35)

- `createPointMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/create.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L149)
- `createTickMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/tick/actions.js#L96); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L237)
- `createStatisticalReference` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/references.js#L773); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L843)
- `createReferenceLine` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/references.js#L752); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L890)
- `createReferenceBand` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/references.js#L762); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L964)
- `createMarkLabels` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/actions.js#L351); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L996)
- `editMarkLabelSelection` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/selection.js#L43); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1057)
- `editMarkLabelPlacement` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/layout.js#L357); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1089)
- `removeMarkLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/removal.js#L143); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1137)
- `createAnnotation` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/actions.js#L269); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1171)
- `createTextMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/actions.js#L130); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1210)
- `editTextMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/actions.js#L484); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1261)
- `layoutLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/layout.js#L326); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1285)
- `removeLabelLayout` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/text/layout.js#L417); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L1324)
- `editPointMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/edit.js#L25); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L202)
- `editTickMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/tick/actions.js#L148); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L270)
- `jitterPoints` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/jitter.js#L32); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L291)
- `removeJitter` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/jitter.js#L50); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L333)
- `packPoints` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/packing.js#L32); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L350)
- `removePointPacking` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/point/packing.js#L47); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L382)
- `removeMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/remove.js#L218); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L399)
- `createLineMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/line/actions.js#L99); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L422)
- `editLineMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/line/actions.js#L286); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L503)
- `createBarMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/bar/create.js#L25); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L535)
- `editBarMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/bar/edit.js#L26); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L565)
- `createAreaMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/area/actions.js#L63); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L603)
- `createRuleMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/rule/actions.js#L98); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L730)
- `editRuleMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/rule/actions.js#L156); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L761)
- `editAreaMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/area/actions.js#L244); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L647)
- `createArcMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/arc/actions.js#L95); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L681)
- `editArcMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/arc/actions.js#L250); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L709)
- `createRectMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/rect/actions.js#L56); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L785)
- `editRectMark` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/marks/rect/actions.js#L162); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARKS.md#L821)
- `createOverlay` — user-facing; Stable create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/overlays/index.js#L117); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/OVERLAYS.md#L3)
- `editOverlay` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/overlays/index.js#L145); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/OVERLAYS.md#L26)

### encodings (39)

- `encodeX` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/position/index.js#L178); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L187)
- `encodeY` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/position/index.js#L188); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L284)
- `encodeChannels` — advanced; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/channels.js#L404); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L127)
- `encodeX2` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L171); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L563)
- `encodeColor` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/color/index.js#L54); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1167)
- `encodeStrokeDash` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/strokeDash.js#L65); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1310)
- `encodeStroke` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/stroke.js#L106); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L606)
- `encodeStrokeWidth` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ruleAppearance.js#L25); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L652)
- `encodeSize` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L154); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1366)
- `encodeShape` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L181); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1416)
- `encodeAngle` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/angle.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1443)
- `encodeOpacity` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L232); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1475)
- `encodeRadius` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L87); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1514)
- `encodeTheta` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/position/index.js#L198); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1547)
- `encodeR` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/position/index.js#L208); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1585)
- `encodePointRadius` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L120); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1622)
- `removePointRadius` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/appearance.js#L130); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1641)
- `encodeXOffset` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/offset.js#L118); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L468)
- `encodeYOffset` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/offset.js#L119); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L511)
- `encodeY2` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L187); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L534)
- `encodeYRange` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L294); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L694)
- `encodeXRange` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L295); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L726)
- `encodeGroup` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/ranged.js#L297); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L749)
- `encodePathOrder` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/pathOrder.js#L77); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L786)
- `encodeParallelCoordinates` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/parallel.js#L24); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L817)
- `removePathOrder` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/pathOrder.js#L103); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L854)
- `orderCategories` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/categoryOrder/index.js#L82); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L874)
- `removeCategoryOrder` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/categoryOrder/index.js#L96); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L918)
- `removeEncoding` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/remove.js#L208); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L89)
- `encodeText` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/text.js#L34); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1717)
- `encodeDx` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/text.js#L116); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1823)
- `encodeDy` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/text.js#L117); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1846)
- `encodeHistogram` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/histogram.js#L9); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L938)
- `encodeDensity` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/density.js#L117); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L983)
- `editDensity` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/density.js#L262); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1043)
- `encodeHorizon` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/horizon.js#L280); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1092)
- `editHorizon` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/horizon.js#L112); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1141)
- `encodeBarWidth` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/barWidth.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1661)
- `layoutSeries` — user-facing; Assignment; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/encodings/seriesLayout.js#L18); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/ENCODINGS.md#L1771)

### axes (55)

- `createParallelAxes` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L50); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L246)
- `createParallelAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L86); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L261)
- `editParallelAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L87); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L276)
- `removeParallelAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L89); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L291)
- `removeParallelAxes` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/parallel/lifecycle.js#L101); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L306)
- `createAxes` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/axes.js#L198); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L382)
- `createXAxis` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/axis.js#L191); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L800)
- `createYAxis` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/axis.js#L192); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L824)
- `createXAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/lines.js#L172); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L846)
- `createYAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/lines.js#L173); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L865)
- `editXAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/lines.js#L132); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L882)
- `editYAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/lines.js#L133); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L900)
- `createXAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/ticks.js#L251); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L915)
- `createYAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/ticks.js#L251); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L935)
- `editXAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/ticks.js#L207); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L954)
- `editYAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/ticks.js#L207); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L971)
- `createXAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L543); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L989)
- `createYAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L544); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1016)
- `editXAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L478); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1034)
- `editYAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L479); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1051)
- `createXAxisTicksAndLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/tickGroups.js#L169); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1069)
- `createYAxisTicksAndLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/tickGroups.js#L170); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1090)
- `editXAxisTicksAndLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/tickGroups.js#L171); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1108)
- `editYAxisTicksAndLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/tickGroups.js#L172); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1127)
- `createXAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/titles.js#L425); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1144)
- `createYAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/titles.js#L426); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1165)
- `editXAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/titles.js#L362); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1182)
- `editYAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/titles.js#L363); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1199)
- `editAxes` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/axes.js#L332); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1332)
- `editXAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/edit.js#L227); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1218)
- `editYAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/edit.js#L228); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1250)
- `removeXAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/remove.js#L62); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1268)
- `removeYAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/remove.js#L63); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L1286)
- `createThetaAxis` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/facade.js#L234); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L494)
- `createRadialAxis` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/facade.js#L235); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L508)
- `editThetaAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/facade.js#L236); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L522)
- `editRadialAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/facade.js#L237); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L536)
- `removeThetaAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/remove.js#L64); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L776)
- `removeRadialAxis` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/remove.js#L65); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L788)
- `createThetaAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/lines.js#L111); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L558)
- `editThetaAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/lines.js#L113); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L678)
- `createRadialAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/lines.js#L112); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L573)
- `editRadialAxisLine` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/lines.js#L114); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L690)
- `createThetaAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/ticks.js#L156); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L588)
- `editThetaAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/ticks.js#L158); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L702)
- `createRadialAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/ticks.js#L157); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L603)
- `editRadialAxisTicks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/ticks.js#L159); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L714)
- `createThetaAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/labels.js#L229); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L618)
- `editThetaAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/labels.js#L231); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L726)
- `createRadialAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/labels.js#L230); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L633)
- `editRadialAxisLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/labels.js#L232); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L738)
- `createThetaAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/titles.js#L194); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L648)
- `editThetaAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/titles.js#L196); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L750)
- `createRadialAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/titles.js#L195); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L663)
- `editRadialAxisTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/axes/titles.js#L197); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/AXES.md#L763)

### grid (11)

- `createGrid` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L255); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L58)
- `createHorizontalGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L180); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L152)
- `createVerticalGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L181); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L174)
- `editHorizontalGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L182); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L193)
- `editVerticalGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L183); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L215)
- `editGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L185); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L232)
- `removeGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/grids/grid.js#L307); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L250)
- `createThetaGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/grids.js#L243); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L104)
- `createRadialGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/grids.js#L244); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L116)
- `editThetaGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/grids.js#L245); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L128)
- `editRadialGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/polar/grids.js#L246); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/GRID.md#L140)

### legend_and_title (13)

- `createLegend` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/categorical/actions.js#L578); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L54)
- `editLegend` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/edit.js#L953); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L356)
- `editLegendBlock` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/blocks.js#L370); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L438)
- `editLegendLayout` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L515)
- `editLegendLabels` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L29); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L531)
- `editLegendTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L35); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L549)
- `editLegendSymbols` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L46); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L565)
- `editLegendBorder` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/focused.js#L52); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L583)
- `createGuides` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/guides.js#L132); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L655)
- `removeLegend` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/legends/remove.js#L75); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L605)
- `createTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/titles/actions.js#L124); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L699)
- `editTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/guides/axes/labels.js#L471); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L762)
- `removeTitle` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/titles/actions.js#L194); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/LEGEND_AND_TITLE.md#L792)

### mark-selection (7)

- `filterMarks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/filter.js#L302); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L87)
- `removeMarkFilter` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/data/filter.js#L282); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L152)
- `selectMarks` — advanced; Stable create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L271); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L172)
- `editMarkSelection` — advanced; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L283); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L214)
- `removeMarkHighlight` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L316); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L242)
- `removeMarkSelection` — advanced; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L340); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L263)
- `highlightMarks` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/selection/actions.js#L624); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/MARK_SELECTION.md#L284)

### primitives (3)

- `editSemantic` — primitive; Primitive; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/primitives/semantic.js#L34); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/PRIMITIVES.md#L10)
- `createGraphics` — primitive; Primitive; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/primitives/createGraphics.js#L104); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/PRIMITIVES.md#L70)
- `editGraphics` — primitive; Primitive; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/primitives/editGraphics.js#L168); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/PRIMITIVES.md#L129)

### composition (15)

- `editCompositionLayout` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L171); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L370)
- `replaceCompositionChild` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L247); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L470)
- `insertCompositionChild` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L288); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L491)
- `removeCompositionChild` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L328); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L511)
- `reorderCompositionChildren` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L355); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L529)
- `facet` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L352); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L92)
- `facetGrid` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L584); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L196)
- `repeatCharts` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L553); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L226)
- `editFacetSource` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L712); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L260)
- `editFacetHeaders` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L587); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L286)
- `editFacetScales` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L607); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L405)
- `editFacetGuides` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/facets/actions.js#L642); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L440)
- `createLayerPlot` — user-facing; Structural create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/layer.js#L6); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L718)
- `createAdjacentPlot` — user-facing; Structural create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/adjacent.js#L20); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L620)
- `editCompositionScales` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/composition/actions.js#L385); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPOSITION.md#L658)

### charts (28)

- `createScatterPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/scatter.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L58)
- `createTextPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/text.js#L12); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L404)
- `createDotPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/endpoints.js#L265); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L88)
- `createLollipopPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/endpoints.js#L296); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L105)
- `createDumbbellPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/endpoints.js#L340); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L122)
- `editEndpointPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/endpoints.js#L491); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L143)
- `createECDFPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/ecdf.js#L62); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L21)
- `editECDFPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/ecdf.js#L148); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L49)
- `createIntervalPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/interval-regression.js#L85); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L166)
- `createRegressionPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/interval-regression.js#L142); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L199)
- `createLinePlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/line.js#L27); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L112)
- `createPolarScatterPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/polar.js#L42); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L227)
- `createPolarLinePlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/polar.js#L92); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L254)
- `createRadarPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/radar.js#L226); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L279)
- `editRadarPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/radar.js#L340); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L318)
- `createRugPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/rug-strip.js#L82); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L352)
- `createStripPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/rug-strip.js#L209); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L382)
- `createBeeswarmPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/beeswarm.js#L32); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L412)
- `createRaincloudPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/raincloud.js#L408); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L439)
- `editRaincloudPlot` — user-facing; Mutable resource; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/raincloud.js#L417); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L474)
- `createBarPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/bar.js#L40); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L165)
- `createHistogram` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/histogram.js#L26); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L228)
- `createHeatmap` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/heatmap.js#L142); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L280)
- `createParallelCoordinates` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/parallel.js#L56); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/BASIC_CHARTS.md#L349)
- `createPiePlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/pie.js#L4); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L561)
- `createRosePlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/radial.js#L67); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L507)
- `createRadialBarPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/radial.js#L70); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L534)
- `createAreaPlot` — user-facing; Aggregate create-only; [implementation](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/actions/charts/area.js#L14); [contract](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/agent_docs/contract/current/COMPLETE_CHARTS.md#L690)
