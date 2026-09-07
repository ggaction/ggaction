# API 계약 보충과 타입 동결 체크

상태: Proposed. feature의 TypeScript block은 설계 표기이며 현재 export를 선언한 것이 아니다. `...ExistingOptions`는 해당 current type의 모든 기존 옵션을 그대로 보존한다는 뜻이다. 구현자가 빈 interface나 any로 대체하지 않도록 아래 연결표를 사용한다.

## 기존 타입 재사용

Canonical declarations: repository root `types/program.d.ts`.

| 설계 표기 | 구현할 때 사용할 기존 타입/경로 | 금지 사항 |
| --- | --- | --- |
| Scalar | DatasetScalar; number는 runtime finite | Date/object를 암묵 scalar로 넣지 않기 |
| SortBy | readonly WindowSort[] | R07 groupBy와 기존 Window partitionBy 이름 혼동 금지 |
| RequestedTransform | DatasetTransform에서 승인된 edit type을 추출하고 resolved/internal ownership fields 제거 | generic unknown transform passthrough 금지 |
| ScaleEditPatch | EditScaleOptions에서 id 제외 후 consumer family-compatible fields만 | 불가 option을 any로 통과시키지 않기 |
| OffsetScaleEditPatch | band offset: domain, reverse, padding, paddingInner, paddingOuter, align | absolute range/type 전환 없음 |
| ColorScaleOptions | CategoricalColorScaleOptions / ContinuousColorScaleOptions / DiscretizedColorScaleOptions union | 임의 ColorScaleOptions라는 현재 export가 있다고 가정 금지 |
| X/Y/Secondary/Theta/R options | PositionEncodingOptions, YPositionEncodingOptions, SecondaryPositionEncodingOptions, ThetaEncodingOptions, RadialEncodingOptions에서 target 제외 | datum/field union 양쪽을 모두 보존 |
| appearance options | Color/Opacity/StrokeWidth/StrokeDash/Text/Group/PathOrder와 기존 encodeSize/Shape/Angle 인라인 타입에서 target 제외 | unsupported mark로 자동 변환 금지 |
| LegendChannel | 현재 channels union + R22 stroke | R37 sample values를 모든 channel에 허용 금지 |
| LegendTextPatch | 현재 legend label 집중 편집의 fontSize, fontFamily, fontWeight, color와 지원되는 기존 spacing | 일반 DOM/CSS props 없음 |
| LegendSymbolPatch | 현재 block channel의 symbol size/fill/stroke/strokeWidth/opacity 등 실제 지원 whitelist | 다른 channel의 scale mapping 우회 금지 |
| Placement/Statistic/ThemeTokens | 각각 R33/R36/R47에 열거된 closed union을 새 export 타입으로 정의 | callback/임의 token map 없음 |

각 타입의 정확한 export 이름은 Phase A에서 declaration diff로 고정한다. 필수 옵션/union의 `never` 배제를 runtime validator와 동기화한다. 예제를 복사할 때 `...partialDefinition`을 실제 JSON key로 넣지 않는다.

## 데이터 create와 edit 표면

| 기존/신규 create | 제안 focused edit | 요청 patch 기준 |
| --- | --- | --- |
| filterData | editFilteredData | FilterDataOptions의 field와 filter mode union |
| createComputedData | editComputedData | ComputedDataOptions의 as/expression |
| createFoldData | editFoldData | FoldDataOptions의 fields/as |
| createSummaryData | editSummaryData | SummaryDataOptions의 groupBy/aggregates/members 및 R10 weight |
| createBinData | editBinData | BinDataOptions 및 R10 weight |
| createBin2DData | 기존 editBin2DData 유지 | 기존 target 추론/source patch와 완전한 as 조건 보존 |
| createTimeUnitData | editTimeUnitData | TimeUnitDataOptions + R08 |
| createWindowData | editWindowData | WindowDataOptions + R09 |
| createDensityData | editDensityData | DensityDataOptions + R10 weight |
| createStackData | editStackData | StackDataOptions |
| createRegressionData | editRegressionData | RegressionDataOptions |
| createIntervalData | editIntervalData | IntervalDataOptions; chart-owned interval editor와 분리 |
| createECDFData | editECDFData | ECDFDataOptions; 기존 weight 의미 보존 |
| createNormalizedData | editNormalizedData | R07 |
| createCompleteData | editCompleteData | R05 |
| createImputedData | editImputedData | R05 |

새 focused edit는 `target` 필수, source/id 변경 없음, dependents 기본reject. 모든 public standalone create에 대한 edit coverage를 확인한다. CategoricalDensity 같은 내부 wrapped creator는 public focused API를 인위적으로 추가하지 않고 owner replay로 처리한다.

`editDerivedData`는 같은 transform 종류의 완전한 requested definition으로 교체하는 공통 공개 domain operation이다. 새 focused edit는 이를 감싸거나 동일 wrapped revision executor를 호출하되 사용자의 의미 단위 trace가 남아야 한다. 기존 source를 바꿀 수 있는 숨은 `source` patch를 허용하면 R01 scope 침범이다.

## R05/07 새 transform의 정확한 정규화

- groupBy: string 또는 배열 → 중복 없는 배열, 기본[]. sortBy: WindowSort[], order 생략 ascending. as/key/field는 nonempty string.
- R05 complete values는 nonempty unique Scalar 배열. sequence는 values와 exclusive, numeric finite start/end/step, step>0, start<=end. i번째 값은 start+i*step이고 end inclusive; 부동소수 누적 while-loop 금지. end에 도달하지 않는 마지막 부분 step을 생성하지 않는다. number precision 때문에 동일 key가 생성되면 error. values/sequence 생략은 source 전체 key의 first-appearance union.
- complete source가 비어 있으면 groupBy=[]+explicit domain일 때 global empty group 1개에서 synthesis 가능, groupBy가 있으면 observed groups0이므로 output0. empty+implicit domain은output0. fill은 key/groupBy/members 이름을 덮을 수 없고 source non-key fields 또는 새 명시 fields를 채운다. 기존 row cells는 수정하지 않는다.
- impute fields는 nonempty unique field array. constant이면 value 필수(Scalar, null도 명시 허용), sortBy 생략 가능. forward/backward이면 sortBy nonempty. linear이면 정확히1개 numeric 또는 temporal sort field, finite 거리, strict increasing distinct positions; duplicates는 error. maxGap은 양의 정수이며 field별 연속 missing run row count. maxGap 초과 run은 그대로 missing, edges:error는 boundary missing run에만 적용.
- forward는 직전 known cell, backward는 다음 known cell, linear는 양쪽 known numeric endpoints 보간. constant/string은 type consistency를 지키며 linear에서 string output 금지. missing field 자체는 error; row에 field가 존재하고 값 undefined인 경우 missing. 완성된 rows의 null은 정상 missing.
- R07 methods별 허용: share/minmax → baseline, variance, sortBy 금지; zscore → variance만; index/change/percentChange → baseline/sortBy, variance 금지. zeroDenominator는 분모가 있는 method만, change에 명시하면 오류. value baseline은 finite, position baseline은 first/last만. baseline은 각 그룹에 대해 정렬 후 선택하되 반환 row order는 유지.

## R08/09 시간값 타입

R08 createTimeUnitData는 기존 id/source/field/unit/as/temporalUnit을 보존하고 timeZone/weekStartsOn/weekRule만 추가한다. week와 weekday는 현재 unit union을 확장한다. 출력 timestamp는 ms UTC, weekday는 nominal numeric.

R09는 WindowDataOptions root에 새 `temporalUnit?:TemporalInputUnit`을 추가한다. duration op가 한 개라도 있을 때 sortBy가 정확히1개여야 하며 그 field parsing에 적용; default는 기존 normalizeTemporalValue의 auto지만 예제는 timestamp/year를 명시한다. duration op가 없는데 temporalUnit을 주면 오류. DatasetWindowTransform에는 duration mode에서만 normalized temporalUnit을 기록한다. 모든 moving operation에 minPeriods/missing, frame union을 추가하고 other operation에 배제한다. partitionBy 이름은 기존 window 그대로 유지한다. minPeriods는 weight sum이 아니라 유효 row count다.

## R23 새 size scale 타입의 정확한 값

기존 range는 모든 타입에서 px² 면적이다. continuous type=linear/log/sqrt/pow는 domain:auto 또는2 endpoints, range:auto 또는2 nonnegative increasing areas, unknown은 nonnegative area. 새 타입에도 clamp 기본false, reverse 기본false를 명시 제공하고 기존 linear 기본 output을 유지한다. log base 기본10(>0,!=1), pow exponent필수>0, sqrt는 exponent를 받지 않는다. reverse는 t → 1-t, clamp는 t를[0,1]로 제한. unknown은 기존 missing mapping에서만 사용하고 malformed numeric을 숨기지 않는다.

quantize: domain auto/strict min<max, range는최소2 nondecreasing areas 필수. quantile: domain auto/finite nonempty sample array, range 최소2필수; auto는 positive/zero를 포함한 consumer field values의 전체 sample이며 source duplicates 유지. threshold: domain strictly increasing cutpoints 최소1개 필수, range length=cuts+1. discrete는 clamp 옵션 없음(outer bins로 매핑), reverse=true는 bucket index를 반전한다. reverse 후 size ordering이 반대가 되는 것은 명시 요청이므로 허용. type migration은 새 타입의 필수range/domain/base/exponent를 검증한다.

## R39 호출 위치와 R49 style entry

R39 labelMap은 기존 categorical axis label actions(`createXAxisLabels`/`editXAxisLabels`, y 대응), categorical legend의 create/edit 및 R38 editLegendBlock에 추가한다. polar categorical theta axis label에도 같은 map helper를 적용한다. continuous axes에는 map을 허용하지 않는다. facet header role/side/align은 editFacetHeaders가 소유한다.

R49는 기존 create/edit mark 옵션을 확장한다. Rect/Bar: cornerRadius+현재 지원 stroke attrs; Line/Area/Rule/Tick/Arc: cap/join/miterLimit; Point: shape가 stroked path일 때cap/join/miterLimit(원은 시각효과 없음을 명시). Text는 이 phase의 stroke props 대상이 아니다. Line endpoint arrows가 있는 경우 cap을 arrow geometry 크기로 전파하지 않는다. applicable face action의 options가 하위 mark style을 이미 전달하면 동일 필드를 추가해 계층 일관성을 유지한다.
