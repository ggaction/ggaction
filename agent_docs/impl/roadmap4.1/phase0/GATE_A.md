# Gate R41-P0-A — Public Lifecycle Contract Proposal

## Gate state

`approved`

Approved by the user on 2026-07-22. The approved scope is the complete proposal at remote checkpoint
`ffe163b`; no action or extension was removed or modified during approval.

## Review target

Runtime 구현 전 다음 package를 승인한다.

### New direct actions

```text
removeEncoding
removePointRadius
editMarkSelection
removeMarkHighlight
removeMarkSelection
editBin2DData
editFacetScales
editFacetGuides
```

### Existing action extensions

```text
editLegend                      stroke-width target dispatch
removeLegend                    channels-selected whole-block removal
editXAxis / editYAxis           nested component false
editErrorBar                    statistics partial revision
editErrorBand                   statistics revision + boundaries false/object
editDensity                     source / field / groupBy revision
editRegression                  data / x / y / groupBy revision
editBoxPlot                     data / x / y role revision
editGradientPlot                data / x / y role revision
editCompositionLayout           facet-only columns
editPointMark / editArcMark     stroke false
```

Exact option shapes are machine-readable in [`../PROPOSALS.json`](../PROPOSALS.json).

## Recommended decisions

1. Encoding removal은 channel별 action 대신 closed dispatcher를 사용한다. Constant point radius는 Polar radius
   semantic channel과 분리한다.
2. Removal은 owned companion/config/guide/highlight를 정리하지만 source data, scale와 coordinate resource는
   보존한다.
3. Selection edit는 ID와 target을 유지하고 selector 전체를 교체한다. Target change는 remove+create다.
4. Highlight removal은 selection을 보존하고, selection removal은 dependent highlight를 먼저 제거한다.
5. Stroke-width legend edit는 current right-side layout을 유지하고 title/count/labels/titleStyle만 지원한다.
6. Selective legend removal은 public channels로 complete block을 선택한다. Combined block 일부만 요청하면
   collateral removal 대신 오류다.
7. Direct remove는 missing target error이며 aggregate `false`는 idempotent desired-state disable이다.
8. Statistical/Bin2D edits는 immutable revision + explicit rebind + safe orphan release를 사용한다.
9. Facet edit는 새 persisted source snapshot을 추가하지 않고 parent에 retained된 pre-facet unit state에서 children을
   rederive한다.

## Compatibility and architecture impact

- Additive public methods and option values only; existing valid calls retain behavior.
- No persisted schema or package entry change is proposed.
- Existing `semanticSpec`/`materializationConfigs` ownership, derived revision flow, composition parent/children boundary와
  renderer-only-graphicSpec boundary를 유지한다.
- Affected current contracts and `SECOND_ARCHITECTURE.md`의 lifecycle/rematerialization explanation은 approved
  implementation과 함께 갱신하되 action parameter catalog를 architecture에 복제하지 않는다.

## Evidence

- Baseline: `npm run test:contracts` — 137/137 pass
- Baseline: `npm run test:unit` — 1231/1231 pass
- Current gap/source evidence: [`STEP1.md`](./STEP1.md)
- Scope/dependencies/completion criteria: [`../ROADMAP.md`](../ROADMAP.md)
- Proposed-only inventory: [`../PROPOSALS.json`](../PROPOSALS.json)
- Remote checkpoint: `ffe163b` on `origin/codex/roadmap4-1-lifecycle`

## Approval effect

Approval은 위 public contract와 Phase order의 구현을 허용한다. npm publish, docs deployment와 PR creation 권한은
포함하지 않는다. 승인 후 Gate state와 exact approved commit을 기록하고 ACTION_INDEX Planned inventory를
동기화한 다음 Phase 1을 시작한다.

## Work blocked before approval

- Public runtime/type changes
- Current contract/docs promotion
- Phase 1 implementation and later Gates
