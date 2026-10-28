# STEP4 — STEP-014 통계 경계의 최소 추가 설계

## 진행 상태

- [x] 원본 STEP-014, data-statistics 계약과 현재 구현·선언·시험 위치 대조
- [x] 기존 동작과 추가 구현을 구분한 API·저장·소비자 설계
- [x] 전체 계획 실행 승인 연결
- [ ] 독립 실패 시험과 실제 expected/actual evidence 작성
- [ ] pivot 및 LOESS degree 2 구현과 소비자 연결
- [ ] focused·누적 검증, 현재 계약·선언·문서 동기화
- [ ] 검증된 구현 checkpoint commit/push 및 STEP-014 종료

상태: **설계 초안, 제품 구현 미착수**. 2026-10-28의 현재 checkout을 읽어 작성했다.
이 문서는 다음 구현의 구체적인 범위를 정하며 시험 성공이나 Current 승격을 뜻하지 않는다.
현재 STEP-013 checkpoint의 source freeze 동안 runtime과 공개 문서는 수정하지 않았다.

## 범위와 승인

[원본 STEP-014](../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-014-statistics-oracles.ko.md),
[data-statistics 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/data-statistics.ko.md),
[현재 CORE](../../../contract/current/CORE.md)를 기준으로 한다.
사용자가 승인한 STEP-077까지의 실행 범위는 [AUTHORIZATION](../AUTHORIZATION.json)에 기록돼 있다.
이번 설계는 그 범위의 pivot duplicate, LOESS degree 1/2, singular, weight, empty 정책을 구체화한다.
전체 실행 담당자는 이 최소 추가 방향을 확인했다. 같은 범위의 승인을 다시 요청하지 않는다.
구현 시작은 선행 STEP-013의 남은 resolver 통합과 해당 checkpoint 종료 뒤다.

OR-16/17/18과 AT-17 중 통계 부분을 소유한다. AT-17 전체 closure는 STEP-015이고
최종 qualification은 STEP-074이므로 이 STEP만으로 전체 시험군을 닫지 않는다.

## 현재 구현과 남은 차이

아래의 ‘있음’은 source와 기존 시험을 확인했다는 뜻이며, 이번 조사에서 해당 시험을 실행했다는 뜻은 아니다.

| 영역 | 현재 owner와 동작 | 이번 STEP의 차이 |
| --- | --- | --- |
| summary | `grammar/summary.js`, `aggregate.js`: 표본/모집단 분산, 결측·빈 결과, 안정 group 순서, frequency/reliability weight | OR-16 literal 및 기존 정책 조합의 독립 검증. 계산을 새로 만들지 않음 |
| quantile | `numeric.js`, `aggregate.js`: linear interpolation; `quantile-policies.test.js`가 aggregate/box/scale 정책 차이를 고정 | `[1,2,3,4]`의 q25=1.75, q50=2.5와 endpoint fixture. 새로운 method 옵션을 발명하지 않음 |
| bin/bin2d | `bin.js`, `bin2d.js`: explicit boundaries, 마지막 경계 포함, empty/members 및 기존 budget | OR-17 및 4 corner fixture, invalid/empty/zero/limit coverage 연결 |
| stack/window | `stack.js`, `window.js`: 별도 양수/음수 누계, rows/range frame·ties·stable order | 명시 frame의 trailing mean `[1,1.5,2.5]`, 음수 누계의 독립 값 검증 |
| fold/flatten/lookup | 기존 변환과 schema/lineage/revision 통합 있음 | lookup의 왼쪽 중복 many-to-one 허용, 오른쪽 중복으로 생기는 one-to-many 확장 거부, unmatched null 보존을 방향별로 명시·검증 |
| regression | `grammar/regression/`: linear/polynomial/loess/exp, prediction, CI, finite/work 검사 | OR-18 slope=2/intercept=1, 기존 singular/empty/CI 경계 고정 |
| LOESS | tricube local-linear, source-order distance tie, robust iterations 0..32, local zero-variance mean fallback, residual weight 0 fallback | local quadratic `degree:2` 추가. 기본 degree 1 결과·저장 shape 유지 |
| density/ECDF | 기존 kernel/bandwidth/grid, weighted mass/positive-row lineage, ties/right-continuity | Gaussian f(0)와 ECDF literal; zero/all-zero/invalid weight를 기존 owner에서 검증 |
| pivot | 현재 source/type/current action에 pivot 데이터 변환 없음 | 새 pure transform + create/edit domain action + lifecycle 전체 |
| timezone/calendar | `timeUnit.js`의 UTC/IANA floor·week·DST 존재 | 날짜 domain/completion은 [STEP5](STEP5.md) 소유 |

`lookup` 체크리스트의 1:1/1:many는 cardinality의 지원·거부 정책을 숨기지 않고 검증한다.
현재 요구의 left-row-preserving lookup을 행 확장 join으로 바꾸지 않는다. 새로운 join API는 이 변경에 없다.
`weight`는 기존 summary/bin/KDE/ECDF의 관측 weight와 LOESS의 tricube/residual weight를 뜻한다.
원본 카드에 없는 LOESS 관측 weight API를 추가하지 않는다.

## Pivot의 공개 호출과 정규형

기본 entry의 Full authoring에 `createPivotData`와 `editPivotData`를 추가한다.
기존 summary/complete/regression과 같은 범위이며 Basic에 전체 통계 family를 끌어오지 않는다.

```js
chart()
  .createData({ id: "raw", values: [
    { group: "A", key: "x", value: 1 },
    { group: "A", key: "x", value: 2 }
  ] })
  .createPivotData({
    id: "wide", groupBy: "group", field: "key", value: "value", op: "sum"
  });
// [{ group: "A", x: 3 }]
```

제안 options:

```ts
type PivotColumn = { value: string | number | boolean | null; as: string };
type PivotOptions = {
  id: string;
  source?: string;
  groupBy?: string | readonly string[];
  field: string;
  columns?: readonly PivotColumn[];
  fill?: number | null;
} & (
  | { op?: "none" | "sum" | "mean" | "min" | "max"; value: string }
  | { op: "count"; value?: never }
);
```

- `source`는 기존 unique/current resolver, `id`는 필수 새 ID다. `groupBy` 기본은 `[]`이며
  실제 관측 tuple만 사용한다. Group key는 기존 typed scalar identity를 사용한다.
- `field`는 열을 결정하는 입력 key다. `columns`의 `value`는 typed equality로 비교하고 `-0`은 0과 같다.
  숫자 1, 문자열 `"1"`, boolean true, null은 서로 다른 값이다. 문자열 변환으로 합치지 않는다.
- `columns` 생략은 관측 key가 모두 nonempty string이며 출력 이름으로 충돌 없이 사용 가능할 때만
  first-appearance 순서로 추론한다. Empty source 또는 비문자 key는 명시 columns가 필요하다.
  추론 결과는 create action이 한 번 결정해 저장한다. 이후 replay는 저장된 columns를 소비한다.
- 명시 columns는 1..64개다. Key와 `as`는 각각 고유하고 `as`는 nonempty field다.
  Group output 이름과 충돌하면 오류다. 관측되지 않은 column은 허용해 빈 cell을 만든다.
  선언되지 않은 관측 key는 오류로 처리하며 조용히 행을 버리지 않는다.
- `op` 기본은 `"none"`이다. 동일 group×column에 두 행 이상이면 값이 같아도 오류다.
  `sum|mean|min|max|count`를 명시해야 중복을 집계한다. `count`는 cell의 관측 행 수를 센다.
  다른 op는 `value`를 요구한다. 원본 value가 null인 행은 허용하며 absent/undefined,
  비수치 및 nonfinite value는 전체 입력 preflight에서 거부한다.
- `none`은 한 행의 finite number 또는 null을 보존한다. 수치 op는 null을 제외한다.
  관측 cell의 유효 수치가 모두 null이면 기존 scalar aggregate와 맞춰 sum=0,
  mean/min/max=null이다. 결과 overflow는 오류다. Count는 value field를 받지 않는다.
- **관측이 없는 cell**만 `fill`을 사용한다. 기본 null, 명시 finite number 또는 null이다.
  따라서 `fill:0`도 관측된 null을 0으로 바꾸지 않는다. Missing category와 all-null category를 구별한다.
- 입력이 비면 결과는 `[]`다. 명시 columns를 사용해 출력 schema는 유지하며 가짜 group 한 행을 만들지 않는다.
  Group별 first appearance 순서와 저장 column 순서가 결과의 순서를 결정한다.
- 출력에는 group fields와 선언된 columns만 있다. 원본의 다른 cell을 임의로 대표 선택하지 않는다.

Canonical transform은 `{type:"pivot", groupBy:[], field, columns:[{value,as}], op:"none", fill:null}`과
count가 아닌 경우의 `value`를 저장한다. 관측에 따라 columns가 변하는 자동 replay는 없다.
`editPivotData({target, field?, value?, op?, groupBy?, columns?, fill?, dependents?})`는 기존 focused
derived editor를 사용하고 array는 전체 교체한다. 생략한 columns는 유지한다. `op:"none"`은 집계 제거다.
Count로 전환할 때 value를 제거하고 count에서 전환할 때 value를 요구한다.
새 source category는 명시 columns 편집 전까지 source revision을 atomic하게 거부한다.

Row grain은 한 group tuple이며 row lineage는 그 group의 실제 기여 입력 행 전체다.
Column lineage는 group fields와 pivot `field`, 해당 수치 `value`를 가리킨다. Count는 수치 value ref가 없다.
Missing cell에 fictitious row reference를 만들지 않는다. Output role은 typed column value로 고정하여
같은 key의 `as` 변경만 소비자 field rename으로 연결한다. Key 제거/교체는 기존 dependency preflight를 거친다.
편집과 revision은 기존 logical dataset identity와 stable topological rematerialization을 그대로 사용한다.

출력 row 최대 10,000, column 최대 64, 전체 작업 최대 10,000,000을 allocation 전에 검사한다.
작업에는 입력 key/group/value 검증과 group×column 출력 cell 수를 포함한다.
입력 수·columns·group 수를 먼저 제한하고 large Cartesian output을 만든 뒤 거부하지 않는다.

## LOESS degree 2의 최소 추가

`createRegressionData`, `editRegressionData`, `createRegressionPlot`, `createRegression`, `editRegression`의
기존 공통 parameter 경로에 `method:"loess", degree:1|2`를 연결한다. Polynomial degree 1..32 계약은 유지한다.
생략 또는 degree 1은 현재 local-linear 경로를 그대로 사용하고 기존 transform에는 degree를 추가하지 않는다.
Degree 2만 canonical transform/model에 `degree:2`를 저장한다.

Degree 2는 현재 neighborhood 순서와 tricube/residual weight를 사용하되 prediction x를 중심으로
scale한 `[1, dx, dx²]` weighted least squares를 계산한다. 기존 polynomial의 stable solve를 가능한 범위에서
재사용하고 finite preflight를 공유한다. Neighbor 수는 `max(3, ceil(span*n))`을 n으로 제한한다.
Degree 1의 `max(2, ceil(span*n))`는 그대로다. Neighborhood를 몰래 늘려 singular을 피하지 않는다.
Rank가 부족한 local fit은 동일 neighborhood의 weighted mean 상수로 fallback한다. Degree 1도 현재 zero-variance
mean fallback을 유지한다. 수치 rank 판정은 scaled basis의 tolerance로 고정하고 시험에서 경계값을 잠근다.

전체 group n<2 또는 varying x 없음은 기존 오류다. Degree 2의 n=2는 유효 group이지만 local rank가 부족해
상수 fallback한다. Empty input의 현재 group 정책은 별도 literal로 고정하며 degree 추가로 바꾸지 않는다.
거리 weight가 모두 0이면 같은 neighborhood의 equal distance weights, residual multiplication 후 모두 0이면
같은 neighborhood의 ordinary distance weights를 사용하는 기존 우선순위를 유지한다.
예측 grid도 최종 residual weights를 사용한다. LOESS CI는 계속 지원하지 않는다.

Degree 2 work preflight에는 각 local solve의 `(degree+1)² * neighborCount + (degree+1)³`와 sorting을
포함한다. 기존 degree 1 허용 경계는 보존하고 degree 2에 필요한 추가 work만 더한다.
기본 출력·기존 robust fixture를 바꾸거나 numeric tolerance를 완화해서 새 시험을 통과시키지 않는다.

## 구현 파일과 소비자 연결

| 책임 | 최소 파일 계획 | 확인할 소비자 |
| --- | --- | --- |
| pivot kernel | 새 `src/grammar/pivot.js` | closed normalization, typed key, scalar aggregate reuse, finite/work preflight |
| pivot orchestration | 새 `src/actions/data/pivot.js`; 기존 `data/index.js`, `data/edit.js` | explicit createDerivedData→materializePivotData trace, standalone logical owner, focused edit |
| registry | `grammar/transforms.js`, `transformTopology.js`, `core/vocabulary.js`, `grammar/transformInput.js`의 해당 경계 | statistical facet replay, requested options, output roles, Full registration 및 Basic unsupported 경계 |
| schema/identity | `grammar/datasetSchema.js`, `rowLineage.js` | empty declared schema, typed column role, unique row key, actual input refs |
| LOESS | `grammar/regression/parameters.js`, `models.js`, `derive.js`; 공통 regression edit/mode cleanup | scalar normalization, fit/predict, degree reset, facade와 follow-source 재계산 |
| persistence/inspection | 기존 transform policy·resource/lineage validation 경로 | schema 4 안의 additive transform. 복원 시 계산·materialization 없이 저장 검증; readonly scene은 concrete output 소비 |
| 공개 표면 | `types/program.d.ts`, `types/index.d.ts`, current CORE/ACTION_INDEX, action sources/metadata/generated docs | Full method/type parity, shortest calls, numerical policy 및 closed options |

Pivot은 dataset source 한 개만 참조하므로 새 graph/ref 종류가 필요하지 않다. 기존 source collector 경로에
등록하고 removeData protection, source revise, derived edit, serialization roundtrip을 직접 증명한다.
Facet은 statistical topology로 child source에서 다시 계산한다. Repeat는 기존 statistical transform 제한을
유지하며 미지원 조합을 명시적으로 거부한다. Renderer별 의미 해석과 새 graphic primitive는 필요하지 않다.
공유 encoder/scale/guide/selection/scene이 최종 materialized rows와 lineage를 소비하는지 integration으로 검증한다.

## 시험과 종료 evidence 계획

Durable fixture는 `test/oracles/statistics-fixtures.js` 등 capability owner로 복사한다.
시험은 study/roadmap JSON을 import하지 않는다. 기존 `observation-statistics.js`, `numeric.js`,
`regression-statistics.js`, `window.js`, `bin2d.js` 중 실제 독립 oracle를 재사용한다.
`test/oracles/time.js`는 frame clock이므로 calendar oracle로 잘못 재사용하지 않는다.

| 시험군 | 입력과 독립 기대값 | 제안 경로 |
| --- | --- | --- |
| OR-16 | `[1,2,3]`: mean2, sampleVariance1, populationVariance2/3; `[1,2,3,4]`: linear q25=1.75/q50=2.5; trailing2 mean `[1,1.5,2.5]` | `test/unit/grammar/transforms/statistics-oracles.test.js` |
| OR-17 | edges `[0,1,2,3]`, values `[0,1,2,3]` → counts `[1,1,2]`; ECDF `[1,1,3]`: F0=0/F1=2/3/F3=1 | 같은 focused module 및 기존 bin/ECDF tests |
| OR-18 | `(0,1),(1,3),(2,5)` slope2/intercept1; one point0,h1 Gaussian f0=0.3989422804014327 | 같은 focused module 및 기존 regression/density tests |
| pivot | duplicate A/x1,A/x2: sum3, no op 오류; typed key 구별; 명시 absent column fill; null과 absent 구별; empty/schema; aliases/collision; budget | 새 `test/unit/actions/data/pivot-data.test.js`, `test/unit/grammar/pivot.test.js` |
| LOESS | degree1 affine; degree2 quadratic exact fit; shuffled distance ties; grouped fits; robust0/positive; zero residual weights; singleton/all-same-x 오류; local singular constant; finite extremes/work | 기존 `robust-loess.test.js` 및 새 `loess-degree.test.js`; 독립 small weighted-system oracle |
| lifecycle | frozen caller/source; failed program/trace equality; create/edit/revise diamond; output alias consumers; row membership selection; facet replay; restored source edit | focused action tests + 새 `test/contracts/statistics-lifecycle.test.js` |
| package/render | installed Full positive and Basic unsupported methods; positive/negative types; ordinary marks의 derived data geometry; SVG/Canvas/PNG/PDF/scene 공통 concrete result | 기존 package/type/renderer harness를 좁혀 추가 |

Floating tolerance는 `absTol + relTol * max(abs(expected), abs(actual))`, OR fixture는 각각 1e-9다.
Quadratic exact-fit은 충분한 positive-weight distinct x를 둔 interior를 사용하고 rank-deficient fixture와 분리한다.
Independent oracle는 production kernel을 import하지 않고 literal 기준점을 함께 둔다.
Summary/bin/KDE/ECDF의 관측 weight 시험에는 zero-weight value 선검증, all-zero group 오류,
frequency integer와 reliability finite 조건, positive-row lineage를 포함한다.

Focused runner는 기존 `node scripts/run-tests.js unit ...`와 `contracts ...`를 사용한다.
구현 후 실제 실행 command/exit, input/expected/actual/diff hashes, source revision 및 consumer matrix를 저장한다.
현재 checkpoint의 통과한 docs suite를 이 설계 때문에 다시 실행하지 않는다.
