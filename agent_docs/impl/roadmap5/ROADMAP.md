# Roadmap 5 — Temporal Derivation, Ordering, and Directional Marks

> **문서 상태 — 현재 실행 계획.** R5-P0-A contract가 승인되어 Phase 1을 진행 중이다. 현재 Phase pointer는
> [`../ROADMAP_INDEX.json`](../ROADMAP_INDEX.json), approved proposal은
> [`PROPOSALS.json`](./PROPOSALS.json)이 소유한다. 현재 observable API는 계속
> [`../../contract/ACTION_INDEX.json`](../../contract/ACTION_INDEX.json)이 소유한다.

## 목표

시간을 달력 단위로 파생하고, 범주 순서를 의미로 저장하며, 이동 창 계산과 방향을 가진 point/tick 표현을
추가한다. 마지막으로 non-negative area series를 가운데 기준선에 쌓는 center layout을 완성한다.

이번 Roadmap은 여섯 capability를 다룬다.

1. `createTimeUnitData`
2. semantic category ordering
3. `createWindowData`의 moving mean/sum
4. Tick mark lifecycle
5. point/tick용 `encodeAngle`
6. center-stacked area layout

## 범위 원장

| ID | 범위 | 제품 결과 | Phase |
| --- | --- | --- | ---: |
| TO-01 | Calendar derivation | UTC bucket-start field를 가진 immutable derived data | 1 |
| TO-02 | Category ordering | explicit/category/summary order와 explicit reset | 2 |
| TO-03 | Moving windows | partition/sort를 재사용하는 moving mean/sum | 3 |
| TO-04 | Tick primitive | centered line glyph의 create/edit/remove lifecycle | 4 |
| TO-05 | Direction encoding | point와 tick의 direct-degree angle assignment | 4 |
| TO-06 | Center stacking | non-negative area series의 symmetric center baseline | 5 |
| TO-07 | Integration | contracts, types, docs, package와 cross-capability evidence | 6 |

## 최상위 원칙

- 새 derived data는 source row를 mutate하지 않고 immutable dataset과 transform provenance를 만든다.
- Temporal bucketing은 현재 time scale과 같은 UTC normalization을 사용한다.
- Category order는 resolved scale domain만 바꾸는 그래픽 편법이 아니라 semantic assignment다.
- Window frame은 sorted partition 안의 row offsets이며 시간 간격을 암묵적으로 추론하지 않는다.
- Angle은 polar coordinate와 같은 degree convention을 사용한다: 0°는 위쪽, 양수는 시계 방향이다.
- Tick과 rotated point는 materialization에서 backend-neutral concrete geometry가 된다. Renderer는 angle이나 mark
  의미를 추론하지 않는다.
- Center stack은 non-negative area series만 받으며 wiggle baseline이나 signed stacking을 몰래 포함하지 않는다.
- Persistent assignment에는 명시적 edit/reassignment 또는 removal 경로를 함께 제공한다.
- 승인된 future contract만 `ACTION_INDEX.json` Planned surface에 두고 구현 전에는 Current로 승격하지 않는다.

## 진행 상태

| Phase | 상태 | 범위 |
| ---: | --- | --- |
| 0 | completed | Exact public contract, chart contract, compatibility와 R5-P0-A approved |
| 1 | in-progress | UTC time-unit derived data와 monthly trend chart |
| 2 | planned | Semantic category ordering과 reset lifecycle |
| 3 | planned | Moving mean/sum window operations |
| 4 | planned | Tick primitive visual Gate, Tick lifecycle와 point/tick angle |
| 5 | planned | Center-stack primitive visual Gate와 area layout |
| 6 | planned | Cross-capability integration, docs/types/package와 Roadmap closeout |

## Approval Gates

Gate 상태는 `planned | ready-for-review | approved | changes-requested`만 사용한다. 사용자의 명시적 승인 없이
다음 Gate로 이동하지 않는다.

| Gate | Phase | 승인 대상 | 승인 전 차단 범위 |
| --- | ---: | --- | --- |
| R5-P0-A | 0 | Exact API, semantics, initial limits, chart contracts와 Phase 순서 | 모든 runtime 구현 |
| R5-P1-A | 1 | UTC bucket values, provenance, immutability와 monthly chart | Category ordering 구현 |
| R5-P2-A | 2 | Ordering modes, ties, reset, guide/facet replay | Moving window 구현 |
| R5-P3-A | 3 | Frame boundaries, partitions, moving values와 combined trend | Tick primitive 구현 |
| R5-P4-V | 4 | Unrotated/rotated Tick과 point concrete geometry의 시각 비교 | Public Tick/Angle flow |
| R5-P4-A | 4 | Tick lifecycle, angle reassignment/removal, chart parity | Center-stack 구현 |
| R5-P5-V | 5 | zero-stack과 center-stack area의 concrete/visual 비교 | Public center flow |
| R5-Exit | 6 | All contracts, docs/types/package, renderer parity와 closeout | 완료 선언 |

Visual Gate는 exact primitive source, generated Canvas/SVG/PNG/PDF artifacts, structural assertions와 나란한 최신
rendered image를 함께 제시한다.

## 의존 관계

```text
Phase 0 contract approval
  ├─ Phase 1 time-unit derivation
  │    └─ Phase 3 moving windows
  ├─ Phase 2 category ordering
  └─ Phase 4 Tick + Angle
       └─ Phase 5 center stack
            └─ Phase 6 integration and closeout
```

Phase 1과 2는 독립 capability지만 한 Phase씩 검증한다. Phase 3의 대표 chart는 Phase 1 output을 사용한다.
Phase 4는 public action보다 concrete Tick/rotation primitive를 먼저 검토한다. Phase 5도 같은 visual-first 순서를
따른다.

## 모든 구현 Phase의 공통 완료 조건

1. Earlier program과 caller-owned input을 mutate하지 않는다.
2. Ambiguous data/mark/channel candidate는 explicit ID를 요구한다.
3. Semantic change가 필요한 graphical materialization을 domain action이 명시적으로 호출한다.
4. Filter/facet/Canvas/scale/guide replay 뒤에도 stored intent와 concrete output이 일치한다.
5. Action trace는 meaningful public/wrapped decomposition을 보존한다.
6. Runtime, strict declarations, current contracts, generated references와 examples를 같은 Gate에서 동기화한다.
7. Focused unit/contract/chart/renderer evidence와 cumulative suites를 통과한다.
8. 각 Gate package를 commit하고 remote branch에 push한 뒤 승인을 요청한다.

## Explicit non-goals

- Geo, projection, geographic marks 또는 map-specific transforms
- Join aggregate, impute, flatten, extent 또는 generic transform executor
- Local-time/time-zone/DST calendar policy와 configurable week start
- Duration-based rolling windows, weighted windows, centered smoothing shortcut와 `minPeriods`
- Generic category comparator callback이나 locale collation
- One-dimensional plot-edge rug placement; initial Tick은 complete x/y anchor를 요구한다.
- Angle scale, angle legend, radians, arc start/end angle 또는 arbitrary transform matrix
- Negative/diverging center stack, wiggle baseline, centered bar layout 또는 streamgraph interpolation
- Generic style config, image/annotation mark, animation 또는 interaction
- Package publish, documentation deployment, release 또는 PR creation

## Phase 0 — Exact contract proposal

Current source/types/contracts와 비교해 six-capability boundary를 확정한다. Machine-readable proposal은
[`PROPOSALS.json`](./PROPOSALS.json), review package는 [`phase0/`](./phase0/)가 소유한다.

## Phase 1 — UTC time-unit derivation

Temporal field를 UTC calendar bucket의 시작 timestamp로 변환하는 immutable derived dataset을 구현한다. Monthly
trend chart에서 raw timestamp가 month 단위로 안정적으로 묶이는지 확인한다.

## Phase 2 — Semantic category ordering

Categorical x/y의 explicit values, category value, count 또는 quantitative summary 기반 순서를 semantic state로
저장하고 guide와 geometry를 함께 rematerialize한다. 별도 removal action으로 automatic first-appearance order를
복원한다.

## Phase 3 — Moving windows

Existing partition/sort pipeline에 row-frame moving mean/sum을 추가한다. Partition edge의 truncated window,
stable ties와 multiple operations를 검증하고 Phase 1의 monthly output과 결합한다.

## Phase 4 — Tick and Angle

고정 길이 line glyph primitive와 rotation geometry를 먼저 만들고 시각 승인을 받는다. 이후 Tick create/edit
lifecycle, point/tick angle assignment, reassignment/removal과 renderer parity를 public flow로 연결한다.

## Phase 5 — Center-stacked area

각 independent position에서 non-negative series 합계를 구해 `-total / 2`에서 쌓는다. Existing area color layout과
`encodeY` stack vocabulary에 center를 추가하고 guides, selection, facets와 renderer output을 검증한다.

## Phase 6 — Integration and closeout

네 representative chart contract를 stable example/evidence로 승격하고 current contracts, declarations, generated
docs, package consumer와 all-renderer matrix를 닫는다. 별도 R5-Exit 승인 뒤에만 Roadmap을 완료로 전환한다.
