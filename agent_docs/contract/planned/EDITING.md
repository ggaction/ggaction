# Planned Editing contracts

These contracts are accepted or pending future API work; they are not current public behavior.

## mark edits

```typescript
editPointMark({
  target?: UserId;
  shape: "circle" | "square";
}): ChartProgram;

editLineMark({
  target?: UserId;
  strokeWidth: NonNegativeFinite;
}): ChartProgram;

editAreaMark({
  target?: UserId;
  fill?: NonEmptyString;
  opacity?: UnitInterval;
}): ChartProgram;
```

- `target`은 existing compatible mark selector이며 수정 property가 아니다. compatible mark가
  유일하면 생략할 수 있고 여러 개면 explicit target이 필요하다. target 외 최소 한 변경값을
  요구하며 `editPointMark`와 `editLineMark`는 현재 하나의 editable property만 가진다.
- 이 action들은 mark가 직접 소유한 graphical materialization config만 수정한다. dataset
  binding, field encoding, scale과 coordinate는 변경하지 않는다.
- `editPointMark.shape`는 field-driven `encodeShape`가 있으면 충돌하므로 오류다.
  `editAreaMark.fill`도 field-driven `encodeColor`가 있으면 오류지만 opacity는 독립적으로
  수정할 수 있다.
- 각 action은 대응하는 내부 wrapped `rematerializePointMark`, `rematerializeLineMark`,
  `rematerializeAreaMark`를 호출한다. 기존 legend recipe가 변경된 mark property에서 파생되면
  materialization plan이 `rematerializeLegend`도 호출한다.
- `createBarMark`는 현재 직접 소유한 editable parameter가 없으므로 `editBarMark`를 계획하지
  않는다. width, color, grouping, stack과 position은 기존 encoding action이 소유한다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.

## editDensity

```typescript
editDensity({
  target?: UserId;
  bandwidth?: "auto" | PositiveFinite;
  extent?: "auto" | OrderedFinitePair;
  steps?: IntegerAtLeast2;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
}): ChartProgram;
```

- `target`은 existing density-encoded area layer selector다. eligible layer가 유일하면 생략할
  수 있고 여러 개면 explicit target이 필요하다. target 외 최소 한 변경값을 요구한다.
- 기존 density transform provenance에서 source, input field, groupBy와 output fields를 유지하고
  bandwidth/extent/steps/kernel/normalization 중 전달된 값만 교체한다. densityChannel, coordinate와
  value/density scale binding도 유지한다.
- 기존 derived dataset values를 덮어쓰지 않는다. `${target}DensityDataRevision${n}` 형태의
  deterministic namespaced 새 ID로 `createDensityData`를 호출하고 area layer를 explicit wrapped
  semantic action으로 rebind한다.
- rebind 뒤 이전 derived dataset을 참조하는 layer가 없으면 새 program에서 internal wrapped
  `releaseDerivedData`로 제거한다. source dataset이나 아직 참조되는 derived dataset은 제거하지
  않으며 이전 `ChartProgram`은 기존 dataset과 binding을 그대로 유지한다.
- affected value/density scales, area paths, axes와 grids를 deterministic materialization plan으로
  갱신한다. validation, derivation 또는 layout 실패 시 어느 branch도 바뀌지 않는다.
- source/field/groupBy/output names/densityChannel 변경은 accepted parameter가 아니다. 이 구조적
  변경은 새 area mark에 `encodeDensity`를 적용한다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 derivation, ownership, orphan-release,
  rematerialization coverage는 구현 단계에서 추가한다.

## regression component edits

```typescript
editRegressionBand({
  target?: UserId;
  color?: NonEmptyString;
  opacity?: UnitInterval;
}): ChartProgram;

editRegressionLine({
  target?: UserId;
  strokeWidth: NonNegativeFinite;
}): ChartProgram;
```

- `target`은 existing regression band/line layer ID다. compatible component가 유일하면 생략할
  수 있고 여러 개면 explicit target이 필요하다. target 외 최소 한 변경값을 요구한다.
- 이 action들은 regression component의 visual design만 수정한다. data, result fields,
  grouping, coordinate와 scale binding은 변경하지 않는다. 통계적 의미를 바꾸려면 새로운
  regression derivation과 component를 만든다.
- `editRegressionBand`는 regression-specific validation 뒤 Planned `editAreaMark`를 wrapped
  child로 호출해 color/fill과 opacity를 갱신한다.
- `editRegressionLine`은 Planned `editLineMark`를 wrapped child로 호출해 stroke width를
  갱신한다. generic child가 mark와 dependent legend rematerialization을 소유한다.
- band border, line color/dash/opacity는 corresponding create contract와 함께 확장하기 전까지
  accepted parameter가 아니다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.

## directional grid edits

```typescript
type EditGridOptions = {
  count?: PositiveInteger;
  values?: readonly Finite[] | "auto";
  color?: NonEmptyString;
  lineWidth?: NonNegativeFinite;
  strokeDash?: DashPattern;
};

editHorizontalGrid(options: EditGridOptions): ChartProgram;
editVerticalGrid(options: EditGridOptions): ChartProgram;
```

- 해당 방향의 기존 grid가 필수이며 최소 한 option을 요구한다. `scale`과 `coordinate`는
  stable binding이므로 edit parameter에 포함하지 않는다.
- `count`는 explicit `values`를 제거하고 scale에서 새 values를 생성한다. finite `values`
  array는 stored count를 제거하며, `values: "auto"`는 count와 explicit values를 모두 지우고
  axis/scale inference를 복원한다. `count`와 `values`를 함께 주면 오류다.
- style option은 전달된 property만 변경한다. 각 action은 대응하는 내부 wrapped
  `rematerializeHorizontalGrid` 또는 `rematerializeVerticalGrid`를 호출한다.
- `createGrid`는 aggregate create-only로 유지하며 별도 `editGrid`는 만들지 않는다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.

## editLegend

```typescript
editLegend({
  target?: UserId;
  position?: "right" | "bottom" | "top" | "left";
  align?: "left" | "center" | "right";
  direction?: "horizontal" | "vertical";
  columns?: PositiveInteger;
  offset?: NonNegativeFinite;
  titlePosition?: "top" | "left";
  title?: NonEmptyString | "auto" | false;
  symbol?: "auto" | LegendSymbolLayer | { layers: readonly LegendSymbolLayer[] };
  labels?: TextStyle;
  titleStyle?: TextStyle;
  itemGap?: PositiveFinite;
  border?: LegendBorder;
  count?: IntegerAtLeast2;
}): ChartProgram;
```

- `target`은 existing legend selector이며 수정 property가 아니다. eligible legend가 유일하면
  생략할 수 있고 여러 개면 explicit target이 필요하다. target 외 최소 한 변경값을 요구한다.
- `channels`는 semantic binding이므로 edit parameter에 포함하지 않는다. layout과 appearance만
  부분 수정하며 nested text style은 전달된 leaf를 기존 stored style에 merge한다.
- title 생략은 기존 값을 유지하고, string은 custom title, `"auto"`는 encoding provenance 기반
  inference 복원, `false`는 title graphic을 숨긴다.
- position과 layout 값은 기존 legend kind가 지원해야 한다. Planned left position은 categorical,
  point composite와 size legend를 지원하고 right-side layout을 mirror한다. Accepted top/bottom
  point-composite contract는 existing top/bottom item grid 안에서 같은 symbol recipe를 유지한다.
- action은 내부 wrapped `rematerializeLegend`를 호출한다. compatible point size block에서
  `count`가 바뀌면 stored count를 갱신하고 `rematerializeSizeLegend`도 호출한다.
- overlap, margin 부족, incompatible option과 없는/ambiguous target은 명확한 오류다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.

## editTitle

```typescript
editTitle({
  text?: NonEmptyString;
  subtitle?: NonEmptyString | false;
  position?: "top" | "bottom" | "left" | "right";
  align?: "left" | "center" | "right";
  offset?: Finite;
  gap?: NonNegativeFinite;
  maxWidth?: PositiveFinite;
  wrap?: "word" | "character";
  lineHeight?: PositiveFinite;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}): ChartProgram;
```

- 기존 chart title이 필수이며 최소 한 option을 요구한다. unknown option과 invalid value는
  program을 변경하기 전에 거부한다.
- 생략한 property는 기존 값을 유지한다. `text`와 string `subtitle`은 semantic text를
  교체하며 `subtitle: false`는 semantic subtitle과 concrete subtitle graphic을 제거한다.
- `titleStyle`과 `subtitleStyle`은 전달한 style leaf만 기존 stored style에 merge한다.
  생략한 style leaf는 유지한다.
- `position`, `align`, `offset`, `gap`과 style은 graphical materialization config를 갱신한다.
  position 변경은 같은 title resource를 새 edge에서 rematerialize하며 semantic text는 유지한다.
- `maxWidth`는 wrapping을 활성화하고 `wrap`과 `lineHeight`는 accepted title-wrapping contract를
  따른다. 세 값 중 일부만 수정해도 기존 stored wrapping config와 합친 뒤 complete combination을
  검증하며, line break는 renderer가 아니라 shared text measurement가 다시 계산한다.
- action은 내부 wrapped `rematerializeTitle`을 호출해 최신 Canvas, margin, title config로
  concrete text를 다시 만든다. title/legend overlap이나 margin 부족은 layout error다.
- 기존 `ChartProgram`은 변경하지 않고 새로운 program을 반환하며 `editTitle` 아래에 semantic,
  graphic, rematerialization child action이 trace로 남는다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.
