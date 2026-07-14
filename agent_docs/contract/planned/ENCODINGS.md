# Planned Encodings contracts

These contracts are accepted or pending future API work; they are not current public behavior.

## rule position and appearance assignments

```typescript
type RulePositionAssignment =
  | {
      field: FieldName;
      datum?: never;
      target?: UserId;
      fieldType: FieldType;
      scale?: PositionScale;
      coordinate?: UserId;
    }
  | {
      field?: never;
      datum: unknown;
      target?: UserId;
      fieldType: FieldType;
      scale?: PositionScale;
      coordinate?: UserId;
    };

encodeStroke({ target?: UserId; value: NonEmptyString }): ChartProgram;
encodeStrokeWidth({ target?: UserId; value: NonNegativeFinite }): ChartProgram;
```

- Rule은 별도 `encodeRule`을 만들지 않는다. `encodeX`, `encodeX2`, `encodeY`, `encodeY2`가
  `RulePositionAssignment`의 field 또는 datum 중 정확히 하나를 받아 independent endpoint를
  할당한다. Existing non-rule positional contracts에는 mark-specific compatibility가 계속 적용된다.
- `encodeX2`/`encodeY2`는 primary channel의 scale과 coordinate를 반드시 공유한다. Primary channel
  없이 secondary channel만 할당할 수 없다. 같은 action을 다시 호출하면 해당 endpoint만 atomic하게
  교체하고 dependent rule/composite consumers를 rematerialize한다.
- `encodeStroke`와 `encodeStrokeWidth`는 constant graphical assignment다. Field-driven series color는
  `encodeColor`, field-driven width는 기존 `encodeSize` contract가 소유하므로 첫 rule contract에서
  중복 field mode를 만들지 않는다.
- `encodeStrokeDash`와 `encodeOpacity`는 existing field/value contracts를 그대로 재사용한다.
  Constant assignment는 scale이나 legend를 만들지 않고, field assignment는 해당 action의 scale 및
  guide contract를 따른다.
- Rule create action은 position/style을 받지 않으며 `editRuleMark`도 만들지 않는다. 위치 또는 style
  변경은 owning encode action의 reassignment다.
- Status: Planned, NOT IMPLEMENTED. field/datum exclusivity, constant style boundaries, endpoint
  reassignment, shared scale/coordinate errors, existing appearance action reuse와 rematerialization coverage가 필요하다.

## scale-backed appearance reassignment

- 같은 target의 `encodeStrokeDash`를 다시 호출하면 기존 field와 scale binding을 atomic하게
  교체한다. 별도 `editStrokeDash` action은 만들지 않는다. `encodeSize`와 `encodeShape`
  reassignment는 current contract에 구현되어 있다.
- omitted scale ID는 현재 channel scale ID를 재사용한다. explicit new scale ID는 새 scale을
  만들고 encoding을 rebind하며 이전 named scale은 삭제하지 않는다. 같은 scale ID의
  domain/range/policy 변경은 accepted `editScale` contract를 wrapped child로 사용한다.
- semantic encoding, scale, mark, existing legend 순서로 explicit rematerialization한다.
  inferred legend title은 새 field로 갱신하고 custom title과 appearance config는 유지한다.
- `encodeStrokeDash`는 color/group series field와 compatible해야 한다. 서로 다른 field가 하나의
  line grouping을 요구하면 오류이며 기존 program은 유지한다.
- explicit ordinal range가 새 domain을 표현할 수 없거나 shared consumer가 incompatible하면
  전체 reassignment를 오류 처리한다.
- Status: Planned, NOT IMPLEMENTED. 구현은 `editScale` parameter contract가 Accepted된 뒤 진행한다.

## grouping reassignment

- reassignment에서 `layout`을 생략하면 현재 `"stack" | "group"` 결정을 유지한다. 첫 계약은
  stack/group 전환을 지원하지 않으며 explicit 다른 layout은 오류다. 전환은 companion 제거와
  scale cleanup 계약을 별도로 정한 뒤 추가한다.
- `encodeGroup` 재호출은 line/area path grouping field를 교체한다. color, shape 또는
  strokeDash가 grouping에 참여하면 같은 field여야 하며 library가 임의로 다른 channel을
  고치지 않는다. `encodeColor`가 소유한 companion group은 `encodeColor`가 wrapped child로 갱신한다.
- `encodeXOffset` 재호출은 grouped bar의 inner slot field와 ordinal scale binding을 교체한다.
  color group field와 같아야 하고 stack layout에서는 오류다. 새 domain order는 bar slot과
  dependent legend order에 함께 반영한다.
- 같은 scale ID의 policy 변경은 `editScale`, explicit new scale ID는 `createScale`을 wrapped
  child로 사용한다. 이전 named scale은 자동 삭제하지 않는다.
- semantic companion actions, scales, mark와 existing legend를 deterministic plan으로
  rematerialize하며 validation 실패 시 기존 program을 그대로 유지한다.
- Status: Planned, NOT IMPLEMENTED. 구현은 `editScale` parameter contract가 Accepted된 뒤 진행한다.

## positional reassignment

- `encodeY2` 재호출은 ranged area의 upper field만 교체하며 existing lower y와 같은 scale,
  coordinate를 요구한다. `encodeYRange`는 lower/upper를 함께 요구하고 wrapped `encodeY`와
  `encodeY2`를 한 atomic hierarchy에서 호출한다.
- `encodeHistogram` 재호출은 binned x와 count y를 함께 교체한다. 새 field와 maxBins에서 bin
  boundaries, count domain, stack geometry, axes와 grids를 다시 계산하고 기존 color grouping과
  stack mode를 유지한다.
- validation 또는 downstream materialization이 실패하면 어느 semantic/graphic branch도
  바뀌지 않는다. 별도 positional edit action은 만들지 않는다.
- Status: Planned, NOT IMPLEMENTED. 구현은 `editScale` parameter contract가 Accepted된 뒤 진행한다.

## area outline

- `createAreaMark`와 `createRegressionBand`는 `stroke?: NonEmptyString`과
  `strokeWidth?: NonNegativeFinite`를 받는다. stroke 생략은 no outline이며 string stroke에 width를
  생략하면 `1`을 사용한다. active stroke 없이 strokeWidth만 주면 오류다.
- `editAreaMark`와 `editRegressionBand`는 `stroke?: NonEmptyString | false`를 받는다. string은
  outline 생성/교체, `false`는 outline과 stored width를 제거한다. strokeWidth-only edit은 기존
  active stroke가 있을 때만 허용한다.
- `createRegression({ band })`는 stroke/strokeWidth를 `createRegressionBand`에 전달한다.
  outline은 graphical config이며 semanticSpec에는 저장하지 않는다.
- create/edit 및 Canvas/scale rematerialization 뒤에도 fill → stroke rendering order와 concrete
  path appearance가 유지되어야 한다.
- Status: Planned, NOT IMPLEMENTED. create/edit/removal, zero width, regression forwarding과
  browser/PNG parity coverage가 필요하다.

## bar width modes

```typescript
encodeBarWidth({
  target?: UserId;
  band?: UnitIntervalExclusiveZero;
  pixels?: PositiveFinite;
}): ChartProgram;
```

- `band`와 `pixels`는 mutually exclusive다. 첫 assignment에서 둘 다 생략하면 `band: 0.72`를
  사용한다. reassignment에서 width mode를 생략하면 현재 mode/value를 유지한다.
- band는 resolved inner slot width의 fraction이라 Canvas resize에 반응한다. pixels는 logical Canvas
  pixel의 고정 width이며 slot 중앙에 배치되고 output pixelRatio와 무관하다.
- Group slot 사이의 padding은 `encodeXOffset`이 소유한다. `encodeBarWidth`는 resolved slot 안의
  실제 bar width만 소유하며 width보다 큰 bar나 명시적 overlap을 전역 오류로 만들지 않는다.
- 변경 시 xOffset band geometry와 bar x/width를 함께 rematerialize한다. outer x band, category
  centers와 legend domain order는 유지한다.
- Status: Planned, NOT IMPLEMENTED. mode switching, padding boundaries, Canvas resize와 overlap
  coverage가 필요하다.

## aggregate vocabulary

```typescript
type AggregateOperation =
  | "count" | "sum" | "mean" | "median" | "min" | "max"
  | "distinct" | "valid" | "missing"
  | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr"
  | "q1" | "q3" | "ciLower" | "ciUpper";
```

- `mean`과 `count`는 Implemented이며 나머지 값이 이 Planned extension의 구현 대상이다.
  모든 aggregate는 source row가 아니라 최종 x/category와 series grouping grain마다 계산한다.
- `count`는 group row 수를 센다. `valid`는 null/undefined/NaN이 아닌 field value, `missing`은
  그 반대, `distinct`는 valid value의 SameValueZero distinct count를 반환한다. 이 세 연산은
  nominal field에도 사용할 수 있다.
- `sum`, `mean`, `median`, `min`, `max`, `variance`, `varianceP`, `stdev`, `stdevP`, `stderr`,
  `q1`, `q3`, `ciLower`, `ciUpper`는 finite quantitative value만 받는다. `variance`와 `stdev`는
  sample denominator `n - 1`, `varianceP`와 `stdevP`는 population denominator `n`, `stderr`는
  sample standard deviation divided by `sqrt(n)`이다.
- `median`, `q1`, `q3`는 정렬된 finite values에 linear interpolation을 적용한 각각 0.5, 0.25,
  0.75 quantile이다. `ciLower`와 `ciUpper`는 mean에서 `1.96 * stderr`를 빼고 더한 deterministic
  two-sided 95% normal interval endpoint다.
- 필요한 valid sample이 없는 연산은 aggregate value를 만들지 않는다. sample variance, sample
  standard deviation, standard error와 confidence interval은 `n < 2`이면 value를 만들지 않는다.
  이 정책이 missing category나 zero-valued graphic을 자동 합성하지는 않는다.
- inferred guide title은 `${aggregate}(${field})`를 사용하고 explicit title은 보존한다. aggregate
  교체는 scale domain, mark geometry, axes와 grids를 deterministic plan으로 rematerialize한다.
- parameter가 필요한 `quantile`과 정렬 계약이 필요한 `first`/`last`는 별도 accepted aggregate
  object가 소유한다. Full-row min/max selection은 scalar vocabulary에 포함하지 않고 accepted
  `selectRows` transform이 소유한다.
- Status: Planned, NOT IMPLEMENTED. 각 operation의 representative/empty/singleton/missing-value
  fixtures와 line/bar grain, title/domain/rematerialization coverage가 필요하다.

## color layout vocabulary

```typescript
type ColorLayout =
  | "stack" | "fill" | "group" | "overlay" | "diverging";
```

- `encodeColor.layout`이 color series의 graphical arrangement를 소유한다. 기존 `"stack"`과
  `"group"`은 Implemented이며 나머지 세 값이 이 Planned extension의 구현 대상이다.
- `"stack"`은 각 x/category에서 series의 absolute quantitative value를 zero baseline부터
  누적한다. `"fill"`은 같은 stack partition의 non-negative values를 합계 1로 정규화해 누적하며
  auto y domain은 `[0, 1]`이다. partition 합계가 0인 위치에는 graphic을 합성하지 않는다.
- `"group"`은 bar에만 적용하고 wrapped `encodeXOffset`으로 series를 나란히 배치한다. 이것은
  line/area path를 field별로 나누는 별도 action `encodeGroup`과 다른 개념이다.
- `"overlay"`는 bar 또는 area series를 같은 baseline과 coordinate에 겹쳐 그린다. series domain의
  deterministic order를 rendering order로 사용하며 library가 opacity를 임의로 바꾸거나 overlap을
  오류로 만들지 않는다.
- `"diverging"`은 stackable bar 또는 area에서 positive values는 zero 위로, negative values는
  zero 아래로 각각 누적한다. `"center"` streamgraph layout은 Proposed로 유지한다.
- 첫 구현의 compatibility matrix는 bar에 `"stack" | "fill" | "group" | "overlay" |
  "diverging"`, area에 `"stack" | "fill" | "overlay" | "diverging"`를 허용한다.
  point/line에는 layout을 허용하지 않으며 series 분리는 기존 color/group materialization을 사용한다.
- resolved layout은 semantic color encoding에 저장한다. `"group"`은 xOffset companion, 나머지
  stack layouts는 y stack policy를 explicit wrapped child action으로 설정한다. y scale, mark geometry,
  axes와 grids를 deterministic plan으로 rematerialize하고 color scale과 legend domain order는 유지한다.
- 기존 layout에서 다른 layout으로 재할당하는 전환은 companion 제거, y policy cleanup과 scale
  conflict를 원자적으로 처리하는 별도 reassignment contract가 구현될 때까지 지원하지 않는다.
- Status: Planned, NOT IMPLEMENTED. mark compatibility, positive/negative/zero partitions, deterministic
  overlap order, normalized/diverging domains와 rejected layout-transition coverage가 필요하다.

## Implemented named palette baseline

```typescript
type ImplementedPaletteName =
  | "accent"
  | "category10" | "category20" | "category20b" | "category20c"
  | "observable10"
  | "dark2" | "paired" | "pastel1" | "pastel2"
  | "set1" | "set2" | "set3"
  | "tableau10" | "tableau20"
  | "blues" | "tealblues" | "teals" | "greens" | "browns"
  | "oranges" | "reds" | "purples" | "warmgreys" | "greys"
  | "viridis" | "magma" | "inferno" | "plasma" | "cividis" | "turbo"
  | "bluegreen" | "bluepurple"
  | "goldgreen" | "goldorange" | "goldred"
  | "greenblue" | "orangered"
  | "purplebluegreen" | "purpleblue" | "purplered" | "redpurple"
  | "yellowgreenblue" | "yellowgreen" | "yelloworangebrown" | "yelloworangered"
  | "darkblue" | "darkgold" | "darkgreen" | "darkmulti" | "darkred"
  | "lightgreyred" | "lightgreyteal" | "lightmulti" | "lightorange" | "lighttealblue"
  | "blueorange" | "brownbluegreen" | "purplegreen" | "pinkyellowgreen"
  | "purpleorange" | "redblue" | "redgrey"
  | "redyellowblue" | "redyellowgreen" | "spectral"
  | "rainbow" | "sinebow";

type ImplementedPalette =
  | ImplementedPaletteName
  | {
      name: ImplementedPaletteName;
      count?: PositiveInteger;
      extent?: readonly [UnitInterval, UnitInterval];
    };
```

- 이 68개 closed vocabulary는 contract 승인 시점에 고정되었다. 외부 palette library가 scheme을
  추가해도 ggaction vocabulary는 contract와 tests를 갱신하기 전까지 자동으로 변하지 않는다.
- Existing `"tableau10"` behavior를 유지하며 `palette`와 explicit `range`는 mutually exclusive다.
  Palette resolution은 ggaction 내부 registry가 소유하고 외부 palette runtime을 호출하지 않는다.
- Categorical scheme은 native discrete color order를 사용한다. Sequential, diverging, cyclical
  scheme도 이 첫 contract에서는 nominal/ordinal domain용 discrete colors로만 샘플링한다.
- `count`는 positive integer sample count다. 생략 시 categorical scheme은 native color count,
  continuous scheme은 resolved domain cardinality를 사용한다. Domain cardinality가 resolved color
  count보다 크면 existing ordinal range behavior처럼 deterministic하게 순환한다.
- `extent`는 sequential, diverging, cyclical scheme에만 허용한다. 두 endpoint는 finite `[0, 1]`
  값이고 서로 달라야 한다. descending extent는 palette order를 뒤집으며 scale `reverse`가 함께
  있으면 final resolved range를 다시 뒤집는다.
- Resolved palette는 concrete CSS color array로 graphical scale state에 저장한다. Mark와 categorical
  legend는 semantic scheme name을 해석하지 않고 해당 array만 사용한다.
- Quantitative/temporal color encoding, continuous interpolation and gradient legend는 아래 accepted
  vertical contract가 소유한다. Arbitrary user colors는 explicit `range`가 담당하며 별도 palette
  registration API는 두지 않는다.
- Status: Implemented. The canonical current contract moved to
  [`../current/PALETTES.md`](../current/PALETTES.md). This compatibility note remains only because the planned
  continuous-color contract below references the implemented palette vocabulary.

## continuous color vertical contract

```typescript
type ContinuousColorInterpolation =
  | "rgb"
  | "hsl" | "hsl-long"
  | "lab"
  | "hcl" | "hcl-long"
  | "cubehelix" | "cubehelix-long";

type ContinuousColorScale = {
  id?: UserId;
  type?: "sequential";
  domain?: "auto" | OrderedQuantitativePair | OrderedTemporalPair;
  range?: readonly [NonEmptyString, NonEmptyString, ...NonEmptyString[]];
  palette?: PaletteName | {
    name: PaletteName;
    extent?: readonly [UnitInterval, UnitInterval];
  };
  interpolate?: ContinuousColorInterpolation;
  clamp?: boolean;
  reverse?: boolean;
  unknown?: NonEmptyString;
};
```

- `encodeColor.fieldType` accepts `"quantitative" | "temporal"` in addition to existing nominal.
  Continuous color is first accepted for point and bar marks, whose concrete children each own one fill.
  Line and area paths remain unsupported until a segment/gradient-path materialization contract exists.
- The scale type is `"sequential"` whether inferred or explicit. Auto quantitative domain is the finite
  field extent; auto temporal domain is the normalized timestamp extent. The first contract rejects
  `nice`, `zero` and color layout because those choices do not define continuous color grouping.
- `range` and `palette` are mutually exclusive. If both are omitted, palette defaults to `"viridis"`.
  Explicit range has at least two valid CSS colors. Named palette resolution uses the accepted frozen
  registry, but continuous palette objects reject discrete `count`; `extent` may crop or reverse the scheme.
- `interpolate` defaults to `"rgb"` and resolves every mapped mark color into a concrete CSS string during
  materialization. Renderers never interpret the interpolation token. `reverse`, `clamp` and `unknown` follow
  the accepted shared scale policies, and an explicit domain remains ahead of automatic inference.
- A sequential color scale may be shared only by compatible continuous-color consumers with the same field
  type and complete definition. Encoding or scale edits rematerialize all marks and its gradient legend in a
  deterministic plan while preserving earlier programs.
- `createLegend({ channels: ["color"] })` infers the gradient form from the sequential scale; the concrete
  layout contract is owned by [continuous color gradient legend](GUIDES_AND_LAYOUT.md#continuous-color-gradient-legend).
- Status: Planned, NOT IMPLEMENTED. quantitative/temporal domains, default and explicit palettes/ranges,
  every interpolation token, policies, invalid mark/layout combinations, shared consumers, mark/legend
  rematerialization and browser/PNG color parity coverage가 필요하다.

## histogram bin controls

```typescript
encodeHistogram({
  field: FieldName;
  target?: UserId;
  maxBins?: PositiveInteger;
  binStep?: PositiveFinite;
  binBoundaries?: readonly [Finite, Finite, ...Finite[]];
  // existing coordinate, stack, xScale and yScale options
}): ChartProgram;
```

- `maxBins`, `binStep`, `binBoundaries`는 mutually exclusive다. 셋 다 생략하면 existing default
  `maxBins: 10`을 사용한다. aggregate는 선택한 mode를 wrapped `encodeX.bin`에 그대로 전달한다.
- `maxBins`는 현재처럼 data와 scale policy에서 최대 개수에 가까운 nice bins를 추론한다.
  `binStep`은 exact positive width이며 auto domain에서는 zero를 anchor로 data minimum을 내림하고
  maximum을 올림한 step 배수를 first/last boundary로 사용한다.
- explicit x domain과 `binStep`을 함께 쓰면 domain endpoints가 zero-anchored step grid에 놓이고
  span이 step의 정수배여야 한다. explicit domain이 data extent를 포함하지 않으면 오류이며
  `nice`는 explicit step/domain을 바꾸지 않는다.
- `binBoundaries`는 최소 두 개의 strictly increasing distinct finite values다. irregular intervals를
  허용하고 first/last boundary가 전체 finite data extent를 포함해야 한다. boundaries가 x domain을
  소유하며 별도 explicit x domain은 같은 endpoints일 때만 허용한다.
- 모든 mode에서 interval은 `[lower, upper)`이고 마지막 interval만 upper endpoint를 포함한다.
  빈 interval은 semantic bin에는 남지만 default materialization은 zero rect를 합성하지 않는다.
- resolved mode와 concrete boundaries를 semantic state에 저장한다. x/y scale, bars, histogram axis
  ticks, vertical grid와 color stack consumers를 deterministic plan으로 rematerialize한다.
- Status: Planned, NOT IMPLEMENTED. exclusivity/defaults, negative/constant data, exact and irregular
  boundaries, explicit domain conflicts, empty bins와 guide/rematerialization coverage가 필요하다.

## Position field-type compatibility

```typescript
type PlannedPositionFieldType = "quantitative" | "temporal" | "ordinal";
```

- Point x/y는 세 field type을 모두 허용한다. Line과 area의 independent axis는 세 type을 모두
  허용하고 measure 또는 ranged axis는 quantitative를 요구한다.
- Bar는 vertical `ordinal | temporal x + quantitative y`와 horizontal
  `quantitative x + ordinal | temporal y` 조합을 지원한다. Orientation은 compatible channel
  pair에서 추론하며 사용자가 별도 mark orientation을 중복 지정하지 않는다.
- Temporal은 `time | utc`, ordinal position은 `ordinal | band | point`, quantitative는 compatible
  continuous scale type을 사용한다. Explicit incompatible field/scale 조합은 오류다.
- Aggregate, bin, stack, ranged channel과 mark grain이 허용 조합을 더 좁힐 수 있다. Library는
  unsupported pair를 다른 field type으로 자동 변환하지 않는다.
- 새 조합은 scale, mark geometry, axes, grids와 existing guides를 같은 materialization plan에서
  갱신한다.
- Status: Planned, NOT IMPLEMENTED. 전체 mark × channel × fieldType compatibility matrix와
  orientation, shared-scale conflict, guide inference coverage가 필요하다.

## Parameterized aggregate operations

```typescript
type ParameterizedAggregate =
  | { op: "quantile"; probability: UnitInterval }
  | {
      op: "first" | "last";
      orderBy: FieldName;
      order?: "ascending" | "descending";
    };
```

- `quantile`은 grouping grain의 sorted finite values에 linear interpolation을 적용한다.
  probability `0`과 `1`은 각각 min과 max이며 기본 probability를 추론하지 않는다.
- `first | last`는 같은 grouping grain을 `orderBy` field와 stable source order로 정렬한 뒤
  선택한 row의 encoded field value를 반환한다. `order` 기본값은 `"ascending"`이다.
- Missing/invalid order key, empty group과 incompatible output field는 aggregate value를 만들지
  않으며 library가 임의의 대체 row를 선택하지 않는다.
- Guide title, scale domain, mark geometry와 downstream guides는 existing aggregate vocabulary와
  같은 ownership 및 rematerialization 규칙을 사용한다.
- Row 전체를 선택하는 min/max operation은 aggregate가 아니라 accepted `selectRows` transform이
  소유한다.
- Status: Planned, NOT IMPLEMENTED. probability boundaries, ties, stable ordering, missing values,
  grouped grain과 rematerialization coverage가 필요하다.

## Normalized stack mode

```typescript
type PlannedStackMode = "normalize";
```

- `encodeY({ stack: "normalize" })`는 각 x/category partition의 non-negative series 합계를
  `1`로 정규화하고 zero baseline부터 누적한다. Auto y domain은 `[0, 1]`이다.
- Partition 합계가 zero이거나 valid value가 없으면 graphic을 합성하지 않는다. Negative values는
  첫 contract에서 오류이며 diverging normalization은 별도 계약이다.
- `encodeColor({ layout: "fill" })`은 wrapped y assignment로 이 mode를 사용한다. `fill`과
  `normalize`는 각각 high-level series layout과 low-level y stack vocabulary다.
- Stack change는 y scale, mark geometry, axes와 horizontal grid를 atomic하게 rematerialize한다.
- Centered/silhouette stack과 `encodeColor.layout: "center"`는 streamgraph 계약까지 Proposed다.
- Status: Planned, NOT IMPLEMENTED. positive/zero/negative partitions, shared scales, guide domains,
  fill hierarchy와 reassignment coverage가 필요하다.

## Offset padding controls

```typescript
type UnitIntervalLessThan1 = number; // finite && 0 <= value && value < 1

encodeXOffset({
  field: FieldName;
  target?: UserId;
  paddingInner?: UnitIntervalLessThan1;
  paddingOuter?: NonNegativeFinite;
  // existing fieldType and scale options
}): ChartProgram;
```

- `paddingInner`은 sibling offset bands 사이 step fraction이며 `[0, 1)`, `paddingOuter`는
  첫/마지막 band 바깥의 non-negative step fraction이다. 둘의 기본값은 `0`이다.
- Padding은 group slot의 centers와 bandwidth를 소유한다. `encodeBarWidth`는 각 resolved slot
  안의 concrete width만 결정하고 padding을 받지 않는다.
- Explicit offset range와 padding은 함께 사용할 수 있으며 range endpoints는 유지한 채 내부 step과
  bandwidth를 계산한다. Excessive padding이 zero bandwidth를 만들면 오류다.
- 변경은 xOffset scale과 dependent bar geometry를 rematerialize하되 outer x band, color domain,
  legend order를 유지한다.
- Status: Planned, NOT IMPLEMENTED. boundary values, explicit/reversed ranges, grouped-bar Canvas resize,
  bar-width interaction과 invalid zero-bandwidth coverage가 필요하다.

## Horizontal ranged position

```typescript
encodeX2({
  field: FieldName;
  target?: UserId;
  fieldType?: "quantitative";
  scale?: { id?: UserId };
}): ChartProgram;

encodeXRange({
  lower: FieldName;
  upper: FieldName;
  target?: UserId;
  fieldType?: "quantitative";
  coordinate?: UserId;
  scale?: PositionScale;
}): ChartProgram;
```

- `encodeX2`는 existing x와 같은 scale 및 coordinate를 공유하는 upper horizontal bound다.
  독립 scale 생성이나 incompatible field type은 허용하지 않는다.
- `encodeXRange`는 wrapped `encodeX`와 `encodeX2`를 순서대로 호출하는 atomic action이다.
  중간 incomplete area 상태를 public workflow에 노출하지 않는다.
- Area materialization은 x lower/upper와 y independent values를 concrete closed path로 만든다.
  Horizontal interval, confidence band와 density/ribbon 표현이 이 contract를 재사용한다.
- Scale, area path, x axis와 vertical grid consumer를 deterministic plan으로 rematerialize하며
  validation 실패 시 이전 program을 그대로 유지한다.
- Status: Planned, NOT IMPLEMENTED. direct child actions, semantic x2 path validation, horizontal path
  geometry, shared scale, Canvas edit와 renderer parity coverage가 필요하다.

## Named and constant stroke dash vocabulary

```typescript
type DashStyle = "solid" | "dashed" | "dotted" | "dashdot";
type DashValue = DashStyle | DashPattern;
type DashScaleWithNamedValues = Omit<DashScale, "range"> & {
  range?: "auto" | readonly DashValue[];
};

type PlannedStrokeDashEncoding =
  | {
      field: FieldName;
      value?: never;
      target?: UserId;
      fieldType?: "nominal";
      scale?: DashScaleWithNamedValues;
    }
  | {
      field?: never;
      value: DashValue;
      target?: UserId;
    };
```

- Named styles resolve to backend-neutral logical Canvas patterns:
  `solid → []`, `dashed → [6, 4]`, `dotted → [1, 3]`,
  `dashdot → [6, 3, 1, 3]`. Pattern lengths do not scale with stroke width or output pixel ratio.
- Direct `DashPattern` remains an even-length array of non-negative finite logical lengths. Empty
  `[]` is solid. A non-empty pattern may not contain only zeros.
- Named styles are accepted both as a constant `value` and inside an explicit field-driven ordinal
  dash scale range. Resolved scale ranges contain concrete numeric patterns, not style names.
- `field` and `value` are mutually exclusive. Constant mode does not create a scale or legend.
  Field mode retains existing series grouping and categorical legend behavior.
- Reassigning between field and constant modes is atomic. Obsolete scale definitions are retained as
  named resources, while an existing legend drops the removed strokeDash component or is removed when
  it has no remaining channel.
- Status: Planned, NOT IMPLEMENTED. Four named recipes, direct patterns, field/value exclusivity,
  mode switching, legend cleanup, Canvas rematerialization and renderer parity coverage가 필요하다.

## Field-driven opacity

```typescript
type PlannedOpacityEncoding =
  | {
      value: UnitInterval;
      field?: never;
      target?: UserId;
    }
  | {
      value?: never;
      field: FieldName;
      target?: UserId;
      fieldType?: "quantitative";
      scale?: {
        id?: UserId;
        type?: "linear" | "log" | "pow" | "sqrt" | "symlog";
        domain?: ContinuousDomain;
        range?: "auto" | readonly [UnitInterval, UnitInterval];
        nice?: boolean;
        zero?: boolean;
        clamp?: boolean;
        reverse?: boolean;
      };
    };
```

- `field`와 `value`는 mutually exclusive다. Existing constant mode는 graphical mark config를
  사용하고 field mode는 semantic opacity encoding과 scale binding을 저장한다.
- 첫 field-driven contract는 quantitative point mark만 지원한다. Auto domain은 finite field
  values, auto range는 `[0.2, 1]`이며 explicit range의 두 endpoint는 각각 `[0, 1]` 안에 있어야
  하지만 ascending일 필요는 없다.
- Scale mapping 뒤 concrete opacity를 모든 point child에 적용한다. Shape, size, color와 position
  materialization order에 독립적이어야 한다.
- 같은 action의 reassignment는 constant↔constant, field↔field와 constant↔field를 atomic하게
  교체한다. Unreferenced named scale은 자동 삭제하지 않는다.
- Constant mode는 legend channel을 만들지 않는다. Field mode는 explicit `createLegend({ channels:
  ["opacity"] })`와 aggregate `createGuides` inference에 eligible하며 concrete guide behavior는
  [field-driven opacity legend](GUIDES_AND_LAYOUT.md#field-driven-opacity-legend)가 소유한다.
- Status: Planned, NOT IMPLEMENTED. default/explicit domains and ranges, boundary opacity, mode
  exclusivity and switching, shared scale conflicts, appearance call order, legend integration, Canvas
  rematerialization and renderer parity coverage가 필요하다.
