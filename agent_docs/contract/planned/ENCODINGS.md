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

## positional reassignment

- `encodeY2` 재호출은 ranged area의 upper field만 교체하며 existing lower y와 같은 scale,
  coordinate를 요구한다. `encodeYRange`는 lower/upper를 함께 요구하고 wrapped `encodeY`와
  `encodeY2`를 한 atomic hierarchy에서 호출한다.
- validation 또는 downstream materialization이 실패하면 어느 semantic/graphic branch도
  바뀌지 않는다. 별도 positional edit action은 만들지 않는다.
- Status: Planned, NOT IMPLEMENTED. 구현은 `editScale` parameter contract가 Accepted된 뒤 진행한다.

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
  continuous-color bar contract below references the implemented palette vocabulary.

## continuous color bar consumer

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

- `encodeColor.fieldType` already accepts `"quantitative" | "temporal"` for point marks. This remaining
  planned extension adds bar marks, whose concrete children each own one fill.
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
- Status: Planned, NOT IMPLEMENTED. Point quantitative/temporal domains, palettes/ranges, all interpolation
  tokens, policies, gradient legend, rematerialization and renderer parity are Current. This contract now
  contains only the continuous bar consumer and its `unknown` fallback.

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
