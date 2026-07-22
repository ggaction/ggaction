# STEP 1 — Current Lifecycle Evidence and Phase Design

## 진행 상태

- [x] Action lifecycle 수치와 partial coverage 확인
- [x] Encoding/selection/legend/axis/facet removal gap 조사
- [x] Statistical and Bin2D revision owner 조사
- [x] Mark outline parameter asymmetry 조사
- [x] Selected/non-selected scope 분리
- [x] Contract와 unit baseline 실행
- [x] Exact proposal와 Gate 질문 작성
- [x] Proposal package remote checkpoint `ffe163b` 기록

## Baseline

시작 commit은 `d89e147`이며 clean `main`에서 `codex/roadmap4-1-lifecycle` branch를 만들었다.

| 항목 | 결과 |
| --- | --- |
| Direct action | 159 |
| Create / edit / remove / encode / other | 56 / 57 / 11 / 27 / 8 |
| Lifecycle | mutable 99, assignment 31, aggregate create-only 16, immutable create-only 8, stable/structural create-only 각 1, primitive 3 |
| Partial test coverage action | 26 |
| `npm run test:contracts` | 137/137 pass |
| `npm run test:unit` | 1231/1231 pass |

Baseline green은 lifecycle completeness를 뜻하지 않는다. ACTION_INDEX의 `Reassignment — Implemented`는 같은
channel replacement만 설명하고 teardown/reset을 증명하지 않으며, `editLegend`는 complete audit에도
stroke-width target을 runtime에서 명시적으로 거부한다.

## Selected gap evidence

### LC-01 — Encoding and radius teardown

- Position policy error는 incompatible `xOffset`/`yOffset` removal을 요구하지만 public semantic encoding removal이
  없다.
- Field size와 constant radius는 서로 배타적이며 replacement 전에 이전 assignment를 해제할 수 없다.
- Color transition도 constant appearance 또는 layout companion 때문에 막힐 수 있지만 raw `editSemantic`은
  legend/config/graphic cleanup을 수행하지 않는다.
- Existing `removePathOrder`는 topology-specific precedent이며 모든 channel별 remove action을 늘릴 근거는 아니다.

추천은 one closed `removeEncoding({ target?, channel })` dispatcher와 graphical
`removePointRadius({ target? })`다. Dispatcher는 semantic assignment와 owned companions/guides를 정리하고
unreferenced scale object는 보존한다.

### LC-03 — Selection/highlight lifecycle

- `selectMarks`는 duplicate ID를 거부하고 selector edit가 없다.
- `highlightMarks`는 같은 selection의 appearance replacement는 지원하지만 clean baseline 복원은 mark
  rematerialization 또는 mark removal에 의존한다.
- `removeMark` 내부에는 이미 target selection/highlight cleanup precedence가 있다.

추천은 selection ID/target을 유지한 selector replacement, highlight-only removal, selection removal과 dependent
highlight cascade의 세 action이다.

### LC-04/12 — Legend lifecycle

- `createStrokeWidthLegend`와 `removeLegend`는 존재하지만 `editLegend`는 stroke-width config를 만나면 오류다.
- 한 target은 categorical/size/continuous/stroke-width block을 동시에 가질 수 있는데 current `removeLegend`는
  전부 제거한다.
- Internal legend config kind를 public selector로 노출하면 implementation taxonomy가 API가 된다.

추천은 stroke-width의 bounded typography/count edit와 existing `LegendOptions.channels` vocabulary를 재사용한
whole-block selection이다. Combined categorical block은 완전한 represented channel set을 요청해야 하며 일부
channel만 지정하면 atomic error다.

### LC-05/07/09 — Immutable derived revisions

- Error bar/band edit는 appearance만 바꾸고 statistical interval center/extent/level을 유지한다.
- Density edit는 kernel/extent/placement를 revise하지만 source/field/group을 고정한다.
- Regression edit는 method/confidence와 components를 revise하지만 data/x/y/group을 고정한다.
- Box/gradient edit는 statistical appearance를 revise하지만 source data와 categorical/quantitative role을 고정한다.
- `createBin2DData`는 same logical ID에서 revision/rebind/release를 이미 수행하지만 explicit partial-edit action이 없다.

모두 새 mutable dataset을 만드는 대신 existing `planDerivedDataRevision`, `rebindLayerData`, materialization plan과
safe `releaseDerivedData`를 사용한다. Error-band `boundaries: false`는 statistical data와 body를 보존한 채 optional
owned lower/upper layers만 정리한다.

### LC-06 — Axis component removal

- Complete axis remove와 leaf edit는 있지만 existing axis line/ticks/labels/title 중 하나만 해제할 수 없다.
- Raw graphic removal은 semantic/config를 남겨 partial axis 또는 later rematerialization failure를 만든다.

추천은 새 remove action 10여 개 대신 `editXAxis`/`editYAxis`의 nested leaf 값에 `false`를 허용하는 것이다.
`ticksAndLabels: false`는 두 components를 함께 제거하고 existing mutual-exclusion rule을 유지한다.

### LC-08 — Facet editing

- `editCompositionLayout`은 facet gap/align/padding을 지원하지만 `columns`를 제외한다.
- Facet scale and guide policy는 compositionSpec의 stable intent지만 create 뒤 수정할 public action이 없다.
- Facet parent는 retained child 외에도 pre-facet unit semantic/materialization state를 top-level program에 보존하므로
  persisted schema를 추가하지 않고 current derivation/replay를 다시 실행할 수 있다.

추천은 `columns` extension과 focused `editFacetScales`/`editFacetGuides`다. Field/data/value identity는 structural
recreate-only를 유지한다.

### LC-11 — Point/arc outline removal

- Area/bar/rect family는 edit-time `stroke: false`를 지원한다.
- Point/arc는 create/edit stroke string만 받아 한번 활성화된 outline 또는 arc default outline을 끌 수 없다.

추천은 edit-only `stroke: false`, simultaneous `strokeWidth` rejection과 later string restoration이다.

## Compatibility policy

- 모든 변경은 additive signature 또는 previously rejected call의 지원이다.
- `removeLegend()` omission은 기존 whole-target behavior를 그대로 유지한다.
- `createBin2DData({ id: existing })` revision behavior는 deprecate하거나 바꾸지 않는다.
- Existing create/edit success output은 representative equivalence tests로 고정한다.
- Direct removal은 missing/ambiguous target error다. Aggregate `false`는 already-disabled 상태에서도 desired-state
  request로 받아들인다.
- Public resource deletion, dataset mutation, scale/coordinate cleanup은 추가하지 않는다.

## Proposed Phase order rationale

1. Encoding/appearance cleanup이 later revision의 stale guide와 mark state 기준을 만든다.
2. Selection/highlight lifecycle이 data-cardinality changes의 replay 기준을 만든다.
3. Legend/axis removal을 닫아 revision과 facet changes가 partial guide를 만들지 않게 한다.
4. Bin2D로 smallest immutable edit facade를 먼저 검증한다.
5. Interval/density/regression, box/gradient 순으로 revision complexity를 늘린다.
6. Facet은 완성된 unit-program revision owners를 child replay에 재사용한다.

## Phase 0 validation

`PROPOSALS.json`의 action names는 현재 `ACTION_INDEX.json.actions`와 중복되지 않으며 proposed entries는
`plannedActions`/`plannedCapabilities`가 계속 빈 상태인 동안 runtime/type surface에 추가하지 않는다. Gate 승인
뒤 exact accepted subset만 Planned로 승격한다.
