# Planned Authoring Lifecycle contracts

Roadmap 4.1 Gate R41-P0-A에서 승인된 additive lifecycle 계약이다. 이 문서의 action과 option은 구현 전까지
public runtime/type에 존재하지 않으며, 구현된 항목은 owning current domain contract로 이동한다.

## `editMarkSelection`

```typescript
editMarkSelection({ selection?, ...selector }): ChartProgram;
```

- Existing selection ID와 target을 유지하고 normalized selector를 교체한다.
- Active highlight가 있으면 clean mark baseline을 materialize한 뒤 새 selected keys, complement dimming,
  selected-last order와 applicable legend reflection을 다시 적용한다.
- Selection target replacement는 지원하지 않으며 remove+select lifecycle을 사용한다.
- Status: Planned, accepted.

## `removeMarkHighlight`

```typescript
removeMarkHighlight({ selection? } = {}): ChartProgram;
```

- 해당 selection의 highlight assignment만 제거하고 selection resource는 보존한다.
- Target mark와 applicable legend를 unhighlighted baseline으로 복원한다. Missing/ambiguous highlight는 오류다.
- Status: Planned, accepted.

## `removeMarkSelection`

```typescript
removeMarkSelection({ selection? } = {}): ChartProgram;
```

- Dependent highlight가 있으면 먼저 제거한 뒤 stable selection config와 matching current context를 정리한다.
- 다른 selection/highlight assignment는 보존한다. Missing/ambiguous selection은 오류다.
- Status: Planned, accepted.

## `editBin2DData`

```typescript
editBin2DData({
  target?, source?, x?, y?, bins?, extent?, includeEmpty?, members?, as?
}): ChartProgram;
```

- `target`은 current/unique logical Bin2D owner를 선택하고 최소 한 transform/source change를 요구한다.
- Omitted option은 current transform provenance에서 보존한다. Complete candidate와 dependent datasets를 첫
  state change 전에 검증한다.
- 새 immutable revision을 만들고 direct layer consumers를 wrapped `rebindLayerData`로 연결한 뒤 affected
  scales/marks/guides를 rematerialize하고 unreferenced prior revision만 release한다.
- Existing `createBin2DData({ id: existing })` revision behavior는 compatibility를 위해 유지한다.
- Status: Planned, accepted.

## `editFacetScales`

```typescript
editFacetScales(options: FacetScaleResolutions): ChartProgram;
```

- Existing facet composition과 최소 한 channel policy change를 요구한다.
- Omitted channel은 current shared/independent policy를 보존한다.
- Parent에 retained된 pre-facet unit state에서 모든 child를 immutable하게 rederive/replay하고 parent snapshot을
  교체한다. Facet field/data/value order, layout, headers, title와 guide policy는 보존한다.
- Status: Planned, accepted.

## `editFacetGuides`

```typescript
editFacetGuides(options: FacetGuideOptions): ChartProgram;
```

- `axes?: "each" | "outer"`, `legend?: false | "shared"`를 partial edit한다.
- Child guide compatibility를 preflight하고 retained children/parent snapshot을 atomic하게 교체한다.
- Facet field/data/value order, scale policy, layout, headers와 title은 보존한다.
- Status: Planned, accepted.

## Capability: legend-lifecycle-completion

- `editLegend`는 stroke-width target에 title/count/labels/titleStyle을 적용한다. Current right-side placement
  limitation은 유지하고 unsupported layout/symbol/border option은 preflight error다.
- `removeLegend({ target?, channels? })`에서 omitted channels는 current whole-target removal을 유지한다.
  Explicit channels는 matching complete legend block만 제거하고 other target blocks를 보존한다.
- Combined categorical block의 represented channel 일부만 요청하면 collateral removal 대신 오류다.
- Status: Planned, accepted.

## Capability: cartesian-axis-component-removal

- `editXAxis`/`editYAxis`의 `line`, `ticks`, `labels`, `ticksAndLabels`, `title`은 `false`를 받는다.
- `ticksAndLabels: false`는 ticks와 labels를 함께 제거하며 existing group/leaf mutual exclusion을 유지한다.
- Aggregate는 selected removals/edits를 전부 preflight하고 semantic/config/graphics를 atomic하게 정리한다.
- Direct missing component removal은 오류이며 last component removal은 complete axis semantic/config를 정리한다.
- Status: Planned, accepted.

## Capability: statistical-owner-revisions

- `editErrorBar`는 `statistics?: { center?, extent?, level? }`을 statistical owner에서만 지원한다.
- `editErrorBand`는 같은 `statistics`와 `boundaries?: false | ErrorBandBoundaryAppearance`를 지원한다.
  `false`는 already-disabled에서도 desired-state disable이며 object는 both boundaries를 create/edit한다.
- `editDensity`는 `source?`, `field?`, `groupBy?: FieldName | false`를 추가하고 output fields, density channel,
  coordinate와 scale IDs를 보존한다.
- `editRegression`은 `data?`, `x?`, `y?`, `groupBy?: FieldName | false`를 추가하고 stable owner/component IDs,
  coordinate와 position scale IDs를 보존한다.
- 모든 data/statistical change는 immutable revision, explicit consumer rebind, deterministic rematerialization과
  safe orphan release를 사용한다.
- Status: Planned, accepted.

## Capability: distribution-owner-role-revisions

- `editBoxPlot`과 `editGradientPlot`은 `data?`, `x?`, `y?`를 create-time position channel vocabulary로 받는다.
- Complete candidate는 exactly one categorical and one quantitative role을 가져야 하며 orientation change를
  포함한 source fields/scales/components를 첫 state change 전에 검증한다.
- Stable owner/component IDs를 유지하고 summary/outlier 또는 profile sibling revisions, bindings, scales,
  guides와 selection/highlight를 한 plan으로 갱신한다.
- Status: Planned, accepted.

## Capability: facet-policy-editing

- `editCompositionLayout`은 facet에서만 `columns?: PositiveInteger`를 받고 concat에서는 거부한다.
- `editFacetScales`/`editFacetGuides`는 field/data/value replacement 없이 parent-retained unit state와 current
  derivation/replay registry를 사용한다.
- Persisted schema와 renderer boundary는 바꾸지 않는다.
- Status: Planned, accepted.
