# Planned Data And Statistics contracts

These contracts are accepted or pending future API work; they are not current public behavior.

## density kernel vocabulary

```typescript
type DensityKernel =
  | "gaussian" | "epanechnikov" | "uniform" | "triangular";
```

- `createDensityData.kernel`, `encodeDensity.kernel`, `editDensity.kernel`은 하나의 shared closed
  vocabulary와 pure kernel grammar를 사용한다. 생략 시 existing behavior인 `"gaussian"`이다.
- normalized kernel recipe는 `u = (x - sample) / bandwidth`에 대해 Gaussian
  `exp(-u² / 2) / sqrt(2π)`, Epanechnikov `0.75 * (1 - u²)`, uniform `0.5`, triangular
  `1 - abs(u)`를 사용한다. 마지막 세 kernel은 `abs(u) <= 1` 밖에서 0이다.
- 각 group의 estimate는 `sum(K(u)) / (n * bandwidth)`다. kernel이 달라도 bandwidth의 단위와
  shared sample grid, group first-appearance order, output row ordering은 바뀌지 않는다.
- `bandwidth: "auto"`는 kernel과 무관하게 existing deterministic Scott-rule width를 사용하고
  resolved positive number를 transform provenance에 저장한다. provenance에는 resolved kernel도
  반드시 저장한다.
- `encodeDensity`는 kernel을 wrapped `createDensityData`로 전달한다. `editDensity`에서 kernel을
  바꾸면 source dataset을 수정하지 않고 namespaced derived revision을 만든 뒤 consumer를 explicit
  rebind하고 density scales, area paths, axes와 grids를 rematerialize한다.
- Status: Planned, NOT IMPLEMENTED. kernel formula fixtures, default/invalid values, grouped/ungrouped
  estimates, provenance, edit revision과 browser/PNG path parity coverage가 필요하다.

## density normalization modes

```typescript
type DensityNormalization = "unit" | "count";
```

- `createDensityData.normalization`, `encodeDensity.normalization`과 `editDensity.normalization`은 같은
  closed vocabulary를 사용하며 생략 default는 `"unit"`이다. Resolved value는 transform provenance에
  저장하고 downstream action이 다시 추론하지 않는다.
- 한 group의 valid finite sample 수를 `n`, kernel input을 `u = (x - sample) / bandwidth`라고 할 때
  `"unit"` estimate는 `sum(K(u)) / (n * bandwidth)`다. 전체 실수축에서 적분이 1인 group-local
  probability-density scaling이며 y 값 자체를 probability로 해석하지 않는다.
- `"count"` estimate는 `sum(K(u)) / bandwidth`, 즉 같은 sample grid의 unit estimate에 `n`을 곱한다.
  전체 실수축 적분은 group의 valid sample count이며 grouped density는 각 group의 own count를 사용한다.
- Extent는 output sample grid만 제한하고 normalization denominator를 바꾸지 않는다. Truncated extent에서
  materialized path의 visible area가 target integral보다 작아도 남은 sample을 다시 renormalize하지 않는다.
- `encodeDensity`는 값을 wrapped `createDensityData`로 전달하고 resulting density scale, area path,
  axes와 grids를 materialize한다. Planned `editDensity` 변경은 immutable derived-data revision을 만들고
  같은 consumers를 deterministic plan으로 rematerialize한다.
- Status: Planned, NOT IMPLEMENTED. grouped/ungrouped exact formulas, default/invalid value, truncated extent,
  provenance, edit revision, density scale/guide updates와 browser/PNG parity coverage가 필요하다.

## filter predicate modes

```typescript
type FilterComparison =
  | { op: "eq" | "neq"; value: unknown }
  | { op: "lt" | "lte" | "gt" | "gte"; value: Finite | string };

type FilterRange = {
  min: Finite | string;
  max: Finite | string;
  inclusive?: boolean;
};
```

- `filterData`는 existing `oneOf`, Planned `predicate`, Planned `range` 중 정확히 하나를 요구한다.
  `inclusive` 기본값은 `true`이며 false이면 양쪽 endpoint를 모두 제외한다.
- `eq`/`neq`는 existing membership과 같은 strict (`===`) scalar equality를 사용한다. ordered
  comparison과 range는 field value와 operand가 모두 finite number이거나 모두 string이어야 하며
  string은 ECMAScript lexicographic order로 비교한다. missing 또는 incompatible value는 row를 유지하지 않는다.
- range endpoints는 같은 type이고 `min <= max`여야 한다. `min === max`는 inclusive range에서
  equality filter, exclusive range에서는 empty result가 된다. empty derived dataset은 허용한다.
- resolved predicate mode와 owned operand/range를 filter transform provenance에 저장한다. wrapped
  `materializeFilteredData`가 source order를 보존해 immutable derived values를 만들며 source는 변하지 않는다.
- Status: Planned, NOT IMPLEMENTED. 각 operator/type, endpoint inclusivity, sparse/mixed rows,
  exclusivity, ownership과 empty-result coverage가 필요하다.

## regression method vocabulary

```typescript
type RegressionMethod = "linear" | "polynomial" | "loess";
```

- `method` 기본값은 existing `"linear"`다. `"polynomial"`은 `degree?: PositiveInteger`를 받고
  기본값은 `2`다. degree 1은 linear fit과 수치적으로 같은 결과를 내지만 provenance에는
  polynomial method와 degree 1을 그대로 저장한다.
- polynomial은 group마다 degree + 1개의 distinct finite x와 residual degrees of freedom을 위한
  최소 degree + 2개의 valid rows를 요구한다. stable least-squares fit을 사용하고 raw-x basis의
  coefficients를 낮은 차수부터 provenance에 저장하며 observed unique x 오름차순으로 평가한다.
- `"loess"`는 `span?: UnitIntervalExclusiveZero`를 받고 기본값은 `0.75`다. group별 valid row의
  `ceil(span * n)`개 nearest neighbors를 사용하는 tricube-weighted local-linear fit이며 최소 두
  neighbor를 사용한다. 거리 tie는 source order로 해소하고 robust reweighting은 첫 계약에 포함하지 않는다.
- `degree`는 polynomial에서만, `span`은 loess에서만 허용한다. 모든 method는 group first-appearance
  order와 group 안의 observed unique x 오름차순 output을 유지하고 resolved defaults와 parameters를
  transform provenance에 저장한다.
- 첫 LOESS 계약은 fitted rows와 regression line만 만든다. `confidence`, `interval` 또는 object
  band option을 LOESS와 함께 주면 오류이며 `createRegression({ method: "loess" })`는 wrapped
  `createRegressionBand`를 생략하고 line만 만든다.
- Status: Planned, NOT IMPLEMENTED. exact coefficient/fit fixtures, degree/span boundaries, singular
  groups, deterministic ties, grouped ordering, line-only trace와 rematerialization coverage가 필요하다.

## regression prediction interval

- `interval: "prediction"`은 linear와 polynomial regression에서 지원한다. existing `"mean"`은
  fitted mean response의 uncertainty를 나타내고 prediction은 새 observation의 residual uncertainty까지
  포함하므로 같은 confidence에서 더 넓거나 같다.
- confidence 기본값과 `(0, 1)` contract는 유지한다. linear/polynomial mean standard error가
  `sqrt(residualVariance * leverage)`라면 prediction standard error는
  `sqrt(residualVariance * (1 + leverage))`이고 같은 residual degrees of freedom의 Student-t critical
  value로 lower/upper를 계산한다.
- method, interval, confidence와 resolved model parameters를 provenance에 저장한다. `createRegression`
  은 이를 wrapped `createRegressionData`로 전달하고 existing band action이 선택된 interval output을
  그린다. LOESS에서는 prediction과 mean interval 모두 첫 계약에서 허용하지 않는다.
- `createRegression.band`는 Planned `false | RegressionBandOptions`를 받는다. linear/polynomial에서
  생략하면 existing default band를 만들고 false이면 명시적으로 생략한다. LOESS에서는 생략이
  line-only를 의미하며 false도 허용하지만 object band는 오류다.
- Status: Planned, NOT IMPLEMENTED. mean/prediction inequality, confidence boundaries, polynomial
  leverage, band opt-out, LOESS rejection과 semantic/graphic provenance coverage가 필요하다.
