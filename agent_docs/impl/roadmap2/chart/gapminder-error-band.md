# Gapminder Error Band

## 목적

Gapminder dataset의 연도별 평균 `life_expect`와 95% 신뢰구간을 `cluster`별 area band로 표현한다. 이 차트는
vertical/horizontal ranged area, 통계/명시 interval, optional boundary line, curve 공유와
`createErrorBand` composite hierarchy의 canonical oracle이다. Cars variant는 동일 계약을 다른 데이터와
반대 orientation에서 검증한다.

## Canonical target

- Data: finite `life_expect`, numeric temporal `year`, finite `cluster`를 가진 gapminder rows
- Independent position: x = temporal `year`
- Interval: y = `mean(life_expect)` with two-sided 95% Student-t confidence interval
- Series: `cluster`, source first-appearance order
- Mark: cluster별 closed area path; boundary lines는 기본적으로 없음
- Fill: `cluster` categorical color through existing `encodeColor`
- Area defaults: shared default mark color, opacity `0.2`, curve `linear`
- Scale: automatic temporal x, quantitative y with `nice: true`, `zero: false`
- Guides: x/y axes, horizontal grid and color legend
- Canvas: `760×480`, margin `{ top: 90, right: 150, bottom: 70, left: 80 }`
- Title: `Life Expectancy by Cluster`; subtitle: `Mean and 95% confidence interval`

Renderer는 완성된 path commands와 concrete style만 읽는다. Interval 통계, group, scale, curve token이나
boundary ownership을 renderer가 추론하지 않는다.

## Final user-facing API

```javascript
const program = chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 90, right: 150, bottom: 70, left: 80 }
  })
  .createData({ values: gapminder })
  .createErrorBand({
    x: { field: "year", fieldType: "temporal" },
    y: { field: "life_expect" },
    groupBy: "cluster"
  })
  .encodeColor({
    target: "errorBand",
    field: "cluster",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .createGuides()
  .createTitle({
    text: "Life Expectancy by Cluster",
    subtitle: "Mean and 95% confidence interval"
  });
```

`id`, `data`, coordinate, interval statistic, level, opacity, curve와 boundaries는 생략한다. 각각
`errorBand`, current data, main Cartesian, mean/CI/0.95, `0.2`, linear와 false로 결정된다. `encodeColor`는
기존 field-driven color assignment를 명시적으로 재사용하며 composite가 이를 복제하지 않는다.

## Public parameter contract

```typescript
type PositionChannel = {
  field: FieldName;
  fieldType: FieldType;
  scale?: PositionScale;
};

type StatisticalIntervalChannel = {
  field: FieldName;
  center?: "mean" | "median";
  extent?: "stderr" | "stdev" | "ci" | "iqr";
  level?: UnitIntervalExclusive;
  scale?: PositionScale;
};

type ExplicitIntervalChannel = {
  center: FieldName;
  lower: FieldName;
  upper: FieldName;
  scale?: PositionScale;
};

createErrorBand({
  id?: UserId;
  target?: UserId;
  data?: UserId;
  x?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel;
  y?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel;
  groupBy?: FieldName;
  coordinate?: UserId;
  fill?: NonEmptyString;
  opacity?: UnitInterval;
  curve?: CurveInterpolation;
  boundaries?: false | {
    stroke?: NonEmptyString;
    strokeWidth?: NonNegativeFinite;
    strokeDash?: DashStyle | DashPattern;
    opacity?: UnitInterval;
    curve?: CurveInterpolation;
  };
} = {}): ChartProgram;
```

### Inference and precedence

- `id`는 unique할 때만 `errorBand`다. 같은 role의 두 번째 composite는 explicit ID가 필요하다.
- x/y가 생략되면 explicit `target`, current eligible layer, unique eligible layer 순서로 source를 찾는다.
  Source data, coordinate, scales와 group binding을 재사용하고, 둘 이상이면 임의 선택하지 않는다.
- 정확히 한 channel이 interval이고 다른 channel이 independent position이다. Statistical interval은
  `{ field }`에 mean/CI/0.95 defaults를 쓸 수 있지만, 두 field가 모두 quantitative라면 `extent`, `center`
  또는 explicit triple로 interval channel을 명확히 해야 한다.
- Explicit `center/lower/upper`는 기존 rows를 사용한다. Center는 provenance/title용이며 band geometry는
  lower/upper만 사용한다.
- Explicit domain/range는 `nice`/`zero`보다 우선하는 기존 scale contract를 그대로 따른다.
- `boundaries` 기본값은 false다. 활성화 시 기본 stroke는 shared mark color, width `1`, solid, opacity `1`이고
  boundary curve는 band curve를 상속한다. `boundaries.curve`만 독립 override한다.
- `groupBy`는 path segmentation을 소유한다. Field-driven fill/legend는 생성 후 기존 `encodeColor`로 지정한다.

## Important action hierarchy

### Statistical vertical band

```text
createErrorBand
├─ createIntervalData(errorBandIntervalData)
│  ├─ createDerivedData
│  └─ materializeIntervalData
├─ createAreaMark(errorBand)
├─ encodeX(year)
├─ encodeYRange(lower, upper)
│  ├─ encodeY(lower)
│  └─ encodeY2(upper)
└─ encodeGroup(cluster)
```

`encodeColor`는 aggregate 밖에서 representative area에 적용된다. `createErrorBand` 구현은 semantic 또는
graphic branch를 직접 조립하지 않고 위 wrapped actions를 실제 호출한다.

### Horizontal band

```text
createErrorBand
├─ createIntervalData(errorBandIntervalData)
├─ createAreaMark(errorBand)
├─ encodeY(Year)
└─ encodeXRange(lower, upper)
   ├─ encodeX(lower)
   └─ encodeX2(upper)
```

Horizontal area는 y 순서에 따라 lower path와 reversed upper path를 연결한 closed path다. 별도 horizontal
mark나 renderer primitive를 만들지 않는다.

### Optional boundaries

```text
createErrorBand
├─ ... area composition
├─ createErrorBandBoundary(lower)
│  ├─ createLineMark(errorBandLowerBoundary)
│  ├─ independent position assignment
│  ├─ lower-bound position assignment
│  ├─ encodeGroup (when grouped)
│  └─ encodeStroke / encodeStrokeWidth / encodeStrokeDash / encodeOpacity
└─ createErrorBandBoundary(upper)
   └─ same wrapped assignments for upper bound
```

Area를 먼저 그리고 lower/upper boundary를 뒤에 그린다. Band와 boundaries는 coordinate, position scales,
group order와 기본 curve를 공유한다.

### Regression delegation

```text
createRegression
├─ createRegressionData
├─ createRegressionBand
│  └─ createErrorBand(explicit interval mode)
└─ createRegressionLine
```

`createRegressionBand`는 regression provenance와 field inference를 소유하는 compatibility wrapper로 남는다.
Generic error band는 regression을 추론하지 않는다. 기존 regression area outline은 delegation 후에도
representative area style로 유지하며 generic lower/upper boundaries로 바꾸지 않는다.

## Stored-result contract

### Semantic state

- Statistical mode는 source, group fields, center/extent/level, generated field names와 concrete rows를 가진
  immutable derived dataset 하나를 저장한다.
- Representative layer는 ordinary semantic `area`이고 ID는 resolved composite ID다.
- Vertical band는 x/y/y2, horizontal band는 y/x/x2를 저장한다. Secondary endpoint는 primary endpoint와
  scale 및 coordinate를 공유한다.
- Boundary는 ordinary `line` layers이고 같은 source/derived data, grouping과 scales를 참조한다.
- `semanticSpec.composites` registry는 만들지 않는다.

### Graphical state

- 각 series는 backend-neutral closed `path` 하나다. Commands에는 최종 finite coordinates가 들어간다.
- Boundary가 있으면 lower/upper concrete line paths가 area path 뒤에 위치한다.
- `graphicSpec`에는 resolved fill, opacity, stroke와 commands만 있고 통계나 semantic scale token은 없다.
- Empty group 또는 유효 interval point가 없는 group은 placeholder graphic을 만들지 않는다.

### Internal identity

```text
errorBand                     representative area
errorBandIntervalData         statistical derived rows only
errorBandLowerBoundary        optional lower line
errorBandUpperBoundary        optional upper line
```

Generated child IDs는 implementation detail이지만 deterministic하다. Explicit owner ID도 같은 suffix 규칙을
사용한다. Rematerialization plan은 area, lower, upper consumers의 ordered deduplicated union이다.

## Dataset roles

### Gapminder canonical vertical band

Gapminder는 numeric four-digit temporal values, six cluster series와 grouped vertical statistical derivation을
검증한다. 각 year × cluster에는 4–20개 국가가 있어 Cars의 sparse Origin-year spike 없이 구분되는 trend와
안정적인 interval을 만든다.
통계 reference는 production transform을 import하지 않고 sample variance와 Student-t critical value로 계산한다.

### Cars horizontal range

Cars는 ISO-like `Year` strings를 temporal로 normalize하고, Origin을 합친 각 year의 `Acceleration` 평균과
95% CI를 horizontal x/x2 band로 표현한다.

```javascript
chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 90, right: 50, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createErrorBand({
    x: { field: "Acceleration", extent: "ci" },
    y: { field: "Year", fieldType: "temporal" },
    boundaries: { stroke: "#355f8a", strokeWidth: 1.5 }
  })
  .createGuides()
  .createTitle({
    text: "Acceleration over Time",
    subtitle: "Mean and 95% confidence interval across cars"
  });
```

이 variant는 Gapminder chart의 field, row count, temporal representation과 orientation을 모두 바꿔서 구현이
fixture-specific해지는 것을 방지한다.

## Visual variants and approval gates

| Gate | Variant | Dataset | Target capability |
| --- | --- | --- | --- |
| A | `gapminder-vertical` | gapminder | grouped statistical y/y2 area, numeric temporal x, default no boundaries |
| B | `cars-horizontal` | cars | string temporal y, statistical x/x2 area, boundaries |
| C | `gapminder-curved-boundaries` | gapminder | curve inheritance/override and custom boundary styles |

각 variant는 raw primitive를 먼저 만들고 승인 후 public program을 구현한다. 저장 경로는
`.artifacts/test/png/roadmap2/gapminder-error-band/<variant>/{primitive,user-facing}.png`이며 manifest가 exact target
call chain을 소유한다. Statistical/explicit mode는 같은 independent expected rows로 concrete path와 pixels가
일치해야 하며, 이 convergence는 별도 장식 variant 대신 mechanical test로 고정한다.

## Errors and atomicity

- Unknown dataset/target/field/scale/coordinate, ambiguous source/owner/orientation, incompatible field type와
  incomplete explicit triple은 mutation 전에 실패한다.
- Interval lower/upper가 finite하지 않거나 lower > upper인 row는 contract에 따라 제외되며 group에 유효한
  두 점 미만이면 path를 만들지 않는다.
- Invalid opacity, curve, boundary width/dash/style 또는 unsupported option은 전체 aggregate를 atomic하게
  실패시킨다.
- Derived data, source rows와 이전 `ChartProgram`은 모든 success/failure/rematerialization 뒤에도 immutable하다.

## Out of scope

- Gradient fill, field-driven boundary color, interaction와 animation
- Renderer-side statistics, scale inference or semantic compilation
- Regression-specific inference inside generic `createErrorBand`
- `editErrorBand` 또는 composite registry
- Box plot/ranged bar consumers; 이들은 후속 Phase가 generic range actions를 재사용한다.
