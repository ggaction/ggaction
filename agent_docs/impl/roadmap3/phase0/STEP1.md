# STEP 1 — Current Baseline

## 진행 상태

- [x] Repository, release와 toolchain identity 확인
- [x] Full test suite 실행
- [x] Generated contract catalog freshness 확인
- [x] Fresh installed-package consumer 실행
- [x] Direct action lifecycle와 partial coverage 수집
- [x] Current chart-suite inventory 수집
- [x] Public TypeScript precision/export gap 수집
- [x] Architecture, ACTION_INDEX와 public reference의 API-layer 분류 비교
- [x] Polar/current limitation 문구와 runtime 상태 비교
- [x] Step 1 범위 밖의 source, test와 public docs를 변경하지 않음

## 목적

Roadmap 3가 시작되는 현재 상태를 재현 가능한 기준선으로 고정한다. 이 STEP은 신규 API를 설계하거나
구현하지 않는다. 발견한 항목은 bug로 과장하지 않고 다음 중 하나로 분류한다.

- verified current behavior
- executable coverage debt
- declaration/discoverability debt
- contract lifecycle wording mismatch
- public API-layer classification mismatch
- Roadmap 3에서 구현할 actual capability gap

## Repository와 release 기준선

검증일은 2026-07-17이다.

| 항목 | 기준선 |
| --- | --- |
| Branch | `main` |
| Commit | `8db1659` |
| Package | `ggaction@0.0.2` |
| Node.js | `v23.5.0` |
| npm | `11.18.0` |

Roadmap 3 계획이 시작되기 전 Current implementation commit을 기록한 값이다. 이후 STEP은 이
기준선에서 생긴 conceptual change를 개별 commit으로 남긴다.

## Executable verification

### Full suite

```text
npm test
tests 1120
pass 1120
fail 0
duration 8.88s
```

Full suite는 chart primitive/public parity, unit grammar, action behavior, contracts, renderer, PNG,
package-boundary와 artifact helper tests를 포함한다.

### Contract catalog

```text
npm run contracts:catalog:check
exit 0
```

`ACTION_CATALOG.md`는 현재 `ACTION_INDEX.json`에서 생성된 상태와 일치한다.

### Installed package consumer

```text
npm run test:package
package ggaction@0.0.2
```

Fresh packed artifact에서 다음 boundary가 모두 통과했다.

- Node public import
- Extension import
- PNG export
- TypeScript consumer
- Private export rejection

검증된 tarball SHA-256은
`4db2efc61ef0020cee50ca3c77d761e1a104a66123db73696bdbd5915af3a253`다.

## Direct action inventory

`ACTION_INDEX.json`의 direct action은 총 87개다.

| Layer | 개수 |
| --- | ---: |
| `user-facing` | 83 |
| `advanced` | 1 |
| `primitive` | 3 |

모든 87개 action의 machine-readable status는 `implemented`이고 Planned direct action/capability table은
현재 비어 있다.

Lifecycle 분포:

| Lifecycle | 개수 |
| --- | ---: |
| Mutable resource | 46 |
| Assignment | 19 |
| Aggregate create-only | 10 |
| Immutable create-only | 7 |
| Primitive | 3 |
| Stable create-only | 1 |
| Structural create-only | 1 |

## Partial executable coverage

Contract와 effects는 complete지만 test coverage가 partial로 표시된 direct action은 26개다.

```text
editCanvas
createData
createDensityData
createRegressionData
encodeX
encodeY
encodeSize
encodeShape
createRegression
createAxes
createXAxis
editXAxisLine
createYAxisTicks
editYAxisTicks
createYAxisLabels
editYAxisLabels
createXAxisTicksAndLabels
createYAxisTicksAndLabels
editYAxisTitle
createVerticalGrid
editVerticalGrid
createLegend
editLegend
createGuides
editSemantic
editGraphics
```

이 26개를 Phase 0에서 일괄 구현하거나 complete로 바꾸지 않는다. Roadmap 3 capability가 해당 action을
변경하는 Phase에서 missing parameter/error/rematerialization case를 실제 test와 함께 닫는다. Evidence
없이 coverage label만 complete로 바꾸지 않는다.

## Current chart suites

현재 `test/charts/`에는 16개 capability-oriented chart suite가 있다.

### Cars

- box plot
- density area
- error bar
- histogram
- line chart
- regression scatterplot
- scatterplot

### Gapminder

- continuous color bars
- discretized color scales
- error band
- temporal discrete scales
- transformed scales

### Jobs and selection

- grouped bar
- bar selection/highlight
- line selection/highlight
- point selection/highlight

이 suite들은 Roadmap 3 focused-edit regression evidence와 capability lab의 existing-behavior reference로
재사용한다. 새 기능을 검증하기 위해 기존 primitive baseline을 덮어쓰지 않는다.

## Public TypeScript baseline

Runtime option validation보다 declaration이 느슨한 direct methods가 남아 있다.

```typescript
createGuides(options?: ActionOptions): ChartProgram;
createCoordinate(options?: ActionOptions): ChartProgram;
createScale(options: ActionOptions & { id: string }): ChartProgram;
createRegressionBand(options: ActionOptions & { ... }): ChartProgram;
createRegressionLine(options: ActionOptions & { ... }): ChartProgram;
```

`ActionOptions`는 `Record<string, unknown>`이므로 runtime이 이미 소유한 exact option vocabulary를
TypeScript consumer가 발견하거나 compile time에 검증하기 어렵다.

다음 option interface는 `types/program.d.ts`에 존재하지만 main `types/index.d.ts`에서 export되지 않는다.

```text
DensityDataOptions
IntervalDataOptions
ErrorBarOptions
ErrorBandOptions
BoxPlotOptions
EditDensityOptions
LegendTextOptions
LegendTitleStyleOptions
LegendBorderOptions
```

또한 `CreateGuidesOptions`, `CreateCoordinateOptions`, exact `CreateScaleOptions`와 regression component
create option은 named public type으로 존재하지 않는다. 이는 runtime failure가 아니라 declaration과
discoverability debt이며 Phase 0의 contract audit 뒤 owning implementation Phase에 배치한다.

## API-layer classification baseline

Current architecture는 public API를 Chart Authoring, Advanced Domain과 Internal wrapped action으로
구분한다. Advanced Domain 예시에는 coordinate, scale, derived data, interval, ranged/offset/group encoding,
axis component와 directional grid가 포함된다.

현재 machine-readable catalog는 87개 중 `selectMarks` 하나만 `advanced`이고 coordinate, scale과 axis
components를 대부분 `user-facing`으로 분류한다. Public reference는 coordinate/derived/regression
components를 Advanced Chart API에 두지만 scale actions는 Extension API table에 둔다.

따라서 세 surface가 동일한 action의 public availability는 공유하면서도 audience layer 이름은 일치하지
않는다.

```text
SECOND_ARCHITECTURE   Advanced Domain API
ACTION_INDEX          mostly user-facing
public reference      Advanced Chart API + scale under Extension API table
```

Step 1은 분류를 변경하지 않는다. Phase 0 contract audit에서 canonical layer vocabulary와 scale의 위치를
결정하고 runtime export를 바꾸지 않는 documentation/catalog correction인지 먼저 판별한다.

## Contract lifecycle wording baseline

Machine-readable Planned inventory는 비어 있지만 Current contract 일부는 아직 다음 표현을 사용한다.

- Polar resource storage는 Implemented
- Polar position/guide materialization은 `Planned capability`
- 같은 section의 formal value는 `Proposed (NOT IMPLEMENTED)`

현재 public behavior는 명확하다.

- `createCoordinate({ type: "polar" })`는 semantic resource를 저장할 수 있다.
- `encodeTheta`, `encodeR`, Polar mark materialization과 Polar guide graphics는 구현되지 않았다.
- Public docs도 이를 current limitation으로 설명한다.

문제는 runtime 동작이 아니라 Planned와 Proposed lifecycle wording의 불일치다. Roadmap 3 Gate A 전에는
Polar candidate를 Planned로 간주하지 않는다. Approved contract만 Planned inventory에 올리고 Current
contract의 future wording도 같은 conceptual change에서 정리한다.

## Public documentation comparison

표본으로 확인한 `supported-features`, Coordinates, Axes와 Appearance 문서는 current runtime limitation과
대체로 일치한다.

- Polar semantic coordinate storage는 가능하지만 position/guide rendering은 불가능하다고 명시한다.
- Facet과 program composition은 미구현이라고 명시한다.
- Highlight는 point, bar, line, area와 rule을 지원한다고 현재 policy와 일치하게 설명한다.

Step 1에서 확인된 문서 문제는 잘못된 support claim보다 API-layer classification과 contract lifecycle
wording 쪽이다. Capability Lab에서 실제 call chain과 문서가 달라지는 사례가 발견되면 별도 evidence와
함께 추가한다.

## Step 1 결론

Current package는 전체 suite와 installed-consumer boundary를 통과하는 안정된 기준선이다. Roadmap 3의
선행 문제는 기존 기능 실패가 아니라 다음 네 가지다.

1. 실제 chart use case로 검증되지 않은 신규 capability 후보
2. Stable component에 대한 focused edit facade 공백
3. Exact public TypeScript option/export 공백
4. API layer와 future lifecycle vocabulary의 문서 간 불일치

다음 STEP은 이 결론을 바꾸지 않고 existing public API로 representative charts를 직접 작성해
`possible`, `awkward`, `unsupported` capability matrix를 만든다. 사용자 확인 전에는 STEP 2로 진행하지
않는다.
