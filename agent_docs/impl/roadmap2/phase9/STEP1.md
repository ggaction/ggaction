# Roadmap 2 — Phase 9 Step 1: Contract and Migration Audit

## 목표

Selector, selection storage, highlighting and `filterMark` migration boundaries를 구현 전에 고정한다.

## 진행 상태

- [x] Current filterData/filterMark behavior, examples, types, docs and trace inventory
- [x] Point/bar/line/area/rule materialization grain and stable child identity audit
- [x] `filterMarks`, `selectMarks`, `highlightMarks`, `editBarMark` exact signatures
- [x] Selection/highlight lifecycle, IDs, context and replacement/conflict rules
- [x] Appearance precedence, dimming, front order and offset rematerialization rules
- [x] Three Gate manifests, artifact paths and exact future call chains
- [x] Contract tests reject inventory/API drift
- [x] STEP status and local verification

## 핵심 결정

- `filterMark` is removed, not aliased.
- `filterMarks` changes semantic item membership; `selectMarks` alone changes no graphics.
- Selection intent is persisted outside transient context; highlight intent is graphical configuration.
- Aggregate preflight validates target, selector and complete style before creating any child state.
- Multi-valued line/area channels require explicit future reduction and are rejected in Phase 9.

## 감사 결과

### 기존 동작과 migration

- Current `filterMark`는 point row를 immutable derived dataset으로 만들고 target layer를 rebind한 뒤
  data/scale/guide materialization plan을 실행한다. Regression example, public declarations, docs와 tests가 이 이름을
  사용하므로 STEP10에서 한 번에 `filterMarks`로 migration하고 compatibility alias는 두지 않는다.
- STEP2–STEP9의 새 selector/resolver는 migration 전에도 독립적으로 추가한다. 따라서 Gate A 이전에는 current
  `filterMark`의 runtime behavior나 public surface를 바꾸지 않는다.
- `filterMarks`, `selectMarks`, `highlightMarks`, `editBarMark`의 canonical signatures와 accepted values는
  [`../../../contract/current/MARK_SELECTION.md`](../../../contract/current/MARK_SELECTION.md)가 소유한다.

### Mark item grain과 identity

| Mark | Semantic item grain | Current concrete child identity | Phase 9 resolver source |
| --- | --- | --- | --- |
| point | source dataset row | `${layerId}:${rowIndex}` | row plus encoded field/channel values |
| bar item | final histogram/aggregate/grouped/ranged segment/rectangle | `${layerId}:${cellIndex}` | concrete rectangle을 만든 final semantic item |
| bar stack | same bin/category의 stacked segments | multiple child IDs | semantic start/end와 concrete union bounds를 분리한 group |
| line | derived series | `${layerId}:${seriesIndex}` | `deriveLineSeries().series` |
| area | derived series | `${layerId}:${seriesIndex}` | area/density series derivation |
| rule | derived rule row | `${layerId}:${ruleIndex}` | `deriveRuleValues()` final rule values |

Child ID 자체를 semantic selection key로 사용하지 않는다. Resolver는 semantic item key를 먼저 만들고, 같은 순서의
concrete child ID를 attachment identity로 연결한다. Canvas/scale range 변경은 item key를 바꾸지 않으며 data,
aggregation, grouping 변경은 resolver를 다시 실행해 현재 item set을 만든다.

### Stored state와 precedence

- Selection definition은 `materializationConfigs.selections[id]`, highlight assignment는
  `materializationConfigs.highlights[id]`가 canonical owner다. `context.currentSelection`은 omitted option을 해석하는
  transient convenience일 뿐이다.
- 첫 omitted selection ID는 `${target}Selection`이다. 같은 role이 이미 존재하면 explicit ID가 필요하다.
- `selectMarks`는 graphics를 바꾸지 않는다. `highlightMarks`가 selected/complement style, logical offset와 child
  order를 concrete graphics에 적용하고, mark rematerialization 뒤 같은 intent를 재적용한다.
- Appearance precedence는 encoded/default mark appearance → whole-mark edit → complement dimming → selected highlight
  순서다. `bringToFront`는 top-level mark order가 아니라 collection 내부 selected child order만 바꾼다.
- Logical offset은 resolved concrete x/y, rect bounds, line endpoints 또는 path commands에 마지막 graphical
  translation으로 적용한다. Semantic encoding과 scale domain은 바꾸지 않는다.

### Gate ownership

| Gate | Test owner | Artifact | Target public call |
| --- | --- | --- | --- |
| A | `test/gates/mark-selection-points/` | `.artifacts/test/png/roadmap2/mark-selection/points-grouped-max/primitive.png` | `highlightMarks({ select: { field: "Horsepower", op: "max", groupBy: "Origin" }, ... })` |
| B | `test/charts/mark-selection-bars/` after approval | `.artifacts/test/png/roadmap2/mark-selection/bars-tallest-stack/primitive.png` | `highlightMarks({ select: { grain: "stack", channel: "y2", op: "max" }, ... })` |
| C | `test/gates/mark-selection-lines/` | `.artifacts/test/png/roadmap2/mark-selection/line-series/primitive.png` | `highlightMarks({ select: { field: "Origin", op: "eq", value: "Japan" }, ... })` |

Gate manifests own the exact expanded call chain. Before approval they contain `primitive` only; the corresponding
public program and `user-facing.png` are added only after approval.

## 검증

- `npm run test:contracts`
- `npm run contracts:catalog:check`

## 완료 조건

No public signature, item grain, state owner, precedence or Gate target remains ambiguous before implementation.
