# Roadmap 4.1 — Authoring Lifecycle and Compatibility Completion

> **문서 상태 — 현재 실행 계획.** Phase 6 statistical owner revision and error-band boundary lifecycle 구현과
> 검증을 완료했고 R41-P6-A가 `ready-for-review`다. Phase 7은 명시적 승인 전까지 차단된다.
> 현재 observable behavior는
> [`ACTION_INDEX.json`](../../contract/ACTION_INDEX.json)이 소유하며, active Phase 포인터는
> [`ROADMAP_INDEX.json`](../ROADMAP_INDEX.json)이 소유한다.

## 목표

Roadmap 4.1은 새 chart family나 renderer capability를 추가하지 않는다. 이미 생성 가능한 semantic resource와
graphical assignment를 안전하게 해제·수정·복원할 수 있도록 lifecycle을 완성하고, 현재 create/edit 사이의
비대칭과 declaration보다 좁은 runtime dispatch를 수정한다.

사용자가 선택한 감사 항목은 다음 열 가지다.

1. Encoding과 constant point radius 해제
2. Selection/highlight 편집과 제거
3. Stroke-width legend의 `editLegend` 지원
4. Statistical owner의 data/statistical-role revision 확대
5. Cartesian axis component 제거
6. Error-band boundary 비활성화
7. Facet layout/scale/guide 재편집
8. `editBin2DData` 명시적 partial-edit facade
9. Point/arc outline 제거
10. Target 내 선택적 legend block 제거

명시적으로 선택되지 않은 public mark-data rebind와 standalone data/scale/coordinate removal은 범위 밖이다.

## 범위 원장

| ID | 범위 | 제품 결과 | Phase |
| --- | --- | --- | ---: |
| LC-01 | Encoding teardown | `removeEncoding`, `removePointRadius` | 1 |
| LC-03 | Selection lifecycle | `editMarkSelection`, `removeMarkHighlight`, `removeMarkSelection` | 2 |
| LC-04 | Stroke-width legend edit | 기존 `editLegend` dispatch 확장 | 3 |
| LC-05A | Interval statistics | `editErrorBar`/`editErrorBand` statistical revision | 6 |
| LC-05B | Density/regression revision | source/field/group/role partial edit | 6 |
| LC-05C | Distribution owner revision | box/gradient data와 position role partial edit | 7 |
| LC-06 | Axis component removal | `editXAxis`/`editYAxis` component에 `false` | 4 |
| LC-07 | Boundary removal | `editErrorBand({ boundaries: false })` | 6 |
| LC-08 | Facet edit | columns, `editFacetScales`, `editFacetGuides` | 8 |
| LC-09 | 2D-bin edit | `editBin2DData`와 repeated-create compatibility | 5 |
| LC-11 | Mark outline removal | point/arc `stroke: false` | 1 |
| LC-12 | Selective legend removal | `removeLegend({ channels })` | 3 |

ID 번호는 최초 감사의 사용자 선택 번호를 유지한다. `LC-05`는 독립적인 immutable revision owner 세 묶음으로
나누지만 하나의 선택 범위다.

## 최상위 원칙

- `ChartProgram`, earlier program과 caller-owned input은 항상 immutable이다.
- Removal은 raw graphic 삭제가 아니다. Semantic assignment, owned materialization config, concrete graphics,
  applicable guide와 highlight replay를 한 atomic transition으로 정리한다.
- Source data와 derived data는 immutable revision 정책을 유지한다. Public `edit*`는 새 revision을 만들고
  existing internal `rebindLayerData`와 orphan release를 wrapped child로 사용한다.
- 사용자가 만들었거나 공유할 수 있는 scale, coordinate와 source dataset은 자동 삭제하지 않는다.
- 기존 action의 omission semantics와 create-time vocabulary를 재사용한다. 새 generic mutation primitive나
  semantic-to-graphic compiler를 만들지 않는다.
- Every public behavior change updates runtime, strict types, current contract, `ACTION_INDEX.json`, generated catalog,
  public docs, package consumer와 executable evidence together.
- 각 conceptual change는 focused와 cumulative verification 뒤 commit하고 current branch에 push한다.

## 진행 상태

| Phase | 상태 | 범위 |
| ---: | --- | --- |
| 0 | completed | 선택 범위 재감사, exact public contract proposal과 R41-P0-A 승인 |
| 1 | completed | Encoding/radius teardown과 point/arc outline removal; R41-P1-A approved |
| 2 | completed | Selection/highlight edit/remove lifecycle; R41-P2-A approved |
| 3 | completed | Legend lifecycle complete; R41-P3-A approved |
| 4 | completed | Cartesian complete-axis component removal; R41-P4-A approved |
| 5 | completed | `editBin2DData` partial revision facade; R41-P5-A approved |
| 6 | in-progress | Error bar/band, density, regression statistical revisions와 boundary disable |
| 7 | planned | Box/gradient data와 positional-role revisions |
| 8 | planned | Facet columns, scale policy와 guide policy editing |
| 9 | planned | Cross-capability regression, docs/package closeout |

## Approval Gates

모든 Gate 상태는 `planned | ready-for-review | approved | changes-requested`만 사용한다. Gate 승인은 사용자의
명시적 응답 없이 기록하지 않는다.

| Gate | Phase | 승인 대상 | 승인 전 차단 범위 |
| --- | ---: | --- | --- |
| R41-P0-A | 0 | 8개 새 action, 12개 existing-action extension과 removal/revision policy | 모든 runtime 구현 |
| R41-P1-A | 1 | Encoding/appearance cleanup state, trace, guide와 highlight 결과 | Phase 2 |
| R41-P2-A | 2 | Selection/highlight replacement/removal cascade | Phase 3 |
| R41-P3-A | 3 | Legend-kind dispatch와 selective block preservation | Phase 4 |
| R41-P4-A | 4 | Axis leaf removal/recreate와 aggregate atomicity | Phase 5 |
| R41-P5-A | 5 | Bin2D owner inference, revision/rebind/release와 compatibility | Phase 6 |
| R41-P6-A | 6 | Statistical revision preflight, derived revision과 consumer rematerialization | Phase 7 |
| R41-P7-A | 7 | Box/gradient role replacement, orientation and guide handoff | Phase 8 |
| R41-P8-A | 8 | Facet child re-derivation, retained state와 parent snapshot | Phase 9 |
| R41-Exit | 9 | Current inventory, full suites, docs, package and clean closeout | 완료 선언 |

Phase implementation Gate는 source, resulting state/trace, focused tests, cumulative tests, compatibility와 docs
impact를 함께 제시한다. 새 appearance target은 없으므로 별도 visual design 승인은 만들지 않지만, concrete
graphic removal이나 layout이 바뀌는 대표 case는 Browser Canvas와 Node PNG 회귀로 검증한다.

## 의존 관계

```text
Phase 0 public contract approval
  └─ Phase 1 encoding/appearance removal
       └─ Phase 2 selection lifecycle
            ├─ Phase 3 legend lifecycle
            ├─ Phase 4 axis component lifecycle
            └─ Phase 5 Bin2D edit
                 └─ Phase 6 statistical revisions
                      └─ Phase 7 distribution owner revisions
                           └─ Phase 8 facet re-derivation/edit
                                └─ Phase 9 closeout
```

Encoding, selection과 guide cleanup을 statistical revision보다 먼저 닫아 이후 data revision이 stale
appearance/guide state를 숨기지 않게 한다. Facet edit는 모든 unit-program revision contract가 완료된 뒤 같은
replay registry를 사용한다.

## 모든 구현 Phase의 공통 완료 조건

1. Complete proposed state와 affected consumers를 첫 state change 전에 preflight한다.
2. Missing/ambiguous target은 명시적 오류이고 첫 eligible resource를 임의 선택하지 않는다.
3. Empty edit/remove와 unsupported family 조합은 original program을 바꾸기 전에 실패한다.
4. Earlier program, sibling branch, source rows와 option objects가 immutable이다.
5. Semantic removal과 materialization config/graphic cleanup이 일치하고 Canvas 또는 scale edit로 stale state가
   복원되지 않는다.
6. Selection/highlight는 clean baseline에서 current final-item identity로 다시 계산한다.
7. Statistical/data edit는 immutable revision ID, explicit rebind, dependent rematerialization과 safe orphan
   release를 trace에 남긴다.
8. Runtime method, declaration, package exports, current contract, catalog, docs와 examples가 일치한다.
9. Focused unit/contract tests, cumulative unit/contract/chart tests와 representative Browser/PNG evidence가
   해당 위험에 비례해 통과한다.
10. Phase Gate package를 commit/push한 뒤에만 다음 Phase 승인을 요청한다.

## Explicit non-goals

- 새 chart facade, mark family, scale type, renderer, interaction 또는 animation
- Public `editMarkData`/`rebindMarkData`
- `removeData`, `removeScale`, `removeCoordinate`, `editData`, generic `editDerivedData`
- `editScatterPlot`, `editLinePlot`, `editViolinPlot`, `editRuleMark`, generic `editGuides`
- Facet field/data replacement, facet child-by-child replacement, Polar facet expansion
- Combined categorical legend block 내부의 일부 channel만 몰래 분해하는 mutation
- Persisted schema나 package boundary 변경

## Phase 0 — Contract proposal

### 목표

Current 159 direct action의 lifecycle과 선택된 gap을 source/types/contracts/tests에서 다시 대조하고, 구현 전에
필요한 exact public names, option vocabulary, cascade와 immutable revision policy를 승인받는다.

### 산출물

- [`PROPOSALS.json`](./PROPOSALS.json): Gate 전 Proposed-only machine-readable inventory
- [`phase0/GOAL.md`](./phase0/GOAL.md): Gate scope와 evidence
- [`phase0/STEP1.md`](./phase0/STEP1.md): baseline과 API decision rationale
- [`phase0/GATE_A.md`](./phase0/GATE_A.md): self-contained approval package

### Exit

- Proposed action/extension이 `ACTION_INDEX.json` Planned/Current에 들어가지 않는다.
- 사용자가 R41-P0-A를 명시적으로 승인한다.
- 승인 뒤에만 accepted subset을 Planned inventory로 승격하고 Phase 1 runtime work를 시작한다.

## Phase 1 — Encoding and mark appearance teardown

`removeEncoding`은 closed semantic channel dispatcher이고 `removePointRadius`는 Polar radius channel과 구분되는
graphical constant reset이다. Existing path-order removal은 `removePathOrder`가 계속 소유한다. Point/arc
`stroke: false`는 outline과 stored width를 함께 비활성화한다. Scale resource는 보존하고 channel-owned guide와
layout companion만 정리한다.

## Phase 2 — Selection and highlight lifecycle

Selection ID와 target을 안정적으로 유지한 selector replacement, highlight-only removal과 selection+dependent
highlight removal을 분리한다. Active legend reflection과 selected-last ordering을 clean mark baseline에서 다시
계산한다.

## Phase 3 — Legend lifecycle

Stroke-width legend가 `editLegend`의 bounded common edit subset을 사용하도록 dispatch한다. `removeLegend`는
omitted `channels`에서 현재 전체 제거를 보존하고, explicit channels에서는 완전한 legend block만 선택적으로
제거한다.

## Phase 4 — Axis component lifecycle

`editXAxis`/`editYAxis` nested component option의 `false`가 line, ticks, labels, tick-label group과 title을
domain-aware하게 제거한다. Aggregate call은 모든 selected edit/removal을 preflight하고 partial axis나 partial
trace를 남기지 않는다.

## Phase 5 — 2D-bin edit

`editBin2DData`는 logical Bin2D owner를 선택하고 omitted transform decision을 current provenance에서 보존한다.
Existing `createBin2DData({ id: existing })` revision behavior는 compatibility를 위해 유지하되 docs에서 create와
edit intent를 구분한다.

## Phase 6 — Statistical revision owners

Error bar/band statistical parameters, density source/field/group와 regression data/x/y/group을 immutable revision으로
교체한다. Error-band boundary false는 optional owned boundary 두 개를 제거하고 later boundary edit로 복원할 수
있다. Shared scale/guide와 selection/highlight consumer를 deterministic plan으로 갱신한다.

## Phase 7 — Distribution owner revisions

Box/gradient owner의 data와 categorical/quantitative x/y role을 partial edit한다. Orientation change를 포함한
complete proposed state를 먼저 검증하고 summary/profile sibling revisions, component bindings, scales, guides와
selection을 한 transition으로 갱신한다.

## Phase 8 — Facet editing

Facet columns는 existing layout edit가 소유한다. Scale/guide policy edit는 parent에 보존된 canonical pre-facet
unit semantic state에서 immutable children을 다시 derive/replay하고 complete parent snapshot을 교체한다.
Facet field, source data와 value order는 유지한다.

## Phase 9 — Closeout

선택된 모든 gap을 Current 또는 명시적 비범위로 닫고 ACTION_INDEX lifecycle/audit/coverage, generated catalog,
declarations, docs, examples, architecture routing과 package consumer를 동기화한다. Roadmap-local proposal
inventory는 역사 기록으로 남기되 executable tests는 current capability owner로 이동한다.
