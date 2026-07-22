# Gate R41-P7-A — Distribution Owner Role Revisions

## Gate state

`approved`

사용자가 2026-07-22에 Gate package `3e13a764`와 functional checkpoints `125fe017`, `2fe415f2`의 Phase 7
결과를 명시적으로 승인했다. Phase 8 facet columns, scale policy and guide policy editing이 해제되었다.

## Review target

Phase 7의 box plot과 gradient plot data/x/y partial revision, immutable derived sibling replacement, orientation 및
scale/guide/selection handoff vertical slice 전체다.

## Exact public calls

```javascript
program.editBoxPlot({ data: "observations", y: { field: "group", fieldType: "nominal" },
  x: { field: "value", fieldType: "quantitative" } });

program.editGradientPlot({ data: "observations", x: { field: "group", fieldType: "nominal" },
  y: { field: "value", fieldType: "quantitative" } });
```

`data`, `x`, `y`는 각각 optional이고 supplied channel은 create-time position channel vocabulary의 complete
replacement다. Omitted option은 current owner provenance를 보존한다. Normalized complete candidate는 정확히 한
categorical role과 한 quantitative role을 가져야 한다. Role candidate가 current provenance와 같으면 derived revision을
만들지 않으며, 같은 call에 supplied된 기존 statistical/appearance edit만 ordinary lifecycle로 적용한다.

## Resolution, preflight and trace

- Explicit/current/unique owner resolution을 재사용하고 owner config에서 source, category, measure, orientation,
  component IDs와 current derived IDs를 읽는다. Supplied `data`는 exact existing dataset이어야 하며 supplied/retained
  fields는 그 dataset에서 complete role로 유효해야 한다. Missing/ambiguous owner, unknown data, two categorical roles,
  two quantitative roles와 incomplete role은 첫 returned state change 전에 실패한다.
- Category scale ID와 measure scale ID는 semantic role을 따라간다. Orientation이 바뀌면 기존 compatible scale IDs를
  x/y channel 사이에서 handoff하고 resolved scale, axis scale/title/tick-label mode와 continuous measure grid direction을
  다시 materialize한다. Old channel/scale에 unrelated consumer가 남아 안전한 handoff가 불가능하면 거부한다.
- Box revision ID는 `${owner}SummaryDataRevision${n}`와 applicable `${owner}OutlierDataRevision${n}`이다.
  `createBoxSummaryData`/`createBoxOutlierData` 뒤 body, whisker, lower/upper cap, median과 optional outlier를 명시적으로
  `rebindLayerData`한다. Direct Cartesian position/range authoring으로 transient incomplete composite를 피하고 body,
  whisker, median, optional outlier를 rematerialize한 뒤 prior orphan summary/outlier를 `releaseDerivedData`한다.
- Gradient revision ID는 `${owner}ProfileDataRevision${n}`이다. `createGradientProfileData`, body/optional center
  `rebindLayerData`, position/scale/guide handoff, body/center materialization, density legend recreation과 old profile
  `releaseDerivedData` 순서다. Structured gradient paint는 current profile intensity domain에서 다시 만들어진다.
- Stored selection/highlight는 clean materialized body에서 current final category item으로 replay한다. Role edit 뒤에도
  selector가 uniquely meaningful하면 유지하고, removed outlier/center ownership은 selection/highlight context와 함께
  정리하며, stale field selector는 전체 edit를 atomically 거부한다.
- Complete edit는 speculative immutable branch에서 derivation, scale/guide handoff, component and highlight replay까지
  먼저 실행한다. 실패 branch는 버리고 validated actual branch만 반환하므로 earlier program, caller options/source rows,
  unrelated dataset/layer/scale와 retained shared revision은 보존된다.

## Resulting state and compatibility

- Representative box source edit는 `distributionSummaryDataRevision1`, orientation handoff는
  `distributionSummaryDataRevision2`를 만든다. `distribution`, whisker/caps, median과 outlier IDs는 유지되며 horizontal
  result에서 measure는 x, category는 y가 되고 category/measure scale IDs도 각 semantic role을 유지한 채 channel만
  바뀐다.
- Representative gradient source/field edit는 `distributionProfileDataRevision1`, orientation handoff는
  `distributionProfileDataRevision2`를 만든다. Body와 optional center ID, coordinate, density/statistical intent,
  width/gradient/center appearance가 유지되고 axis/grid/density legend는 new roles에서 concrete하게 다시 만들어진다.
- Existing whisker/factor/width/outlier/box/median appearance edits와 density/width/gradient/center edits는 그대로
  동작한다. Equivalent data/x/y calls do not churn derived data. Optional outlier/center removal/recreation과 later Canvas,
  scale and highlight rematerialization에서도 stale components나 old data binding이 복원되지 않는다.
- Runtime, strict declarations, Current `COMPOSITE_MARKS.md`/`GRADIENT_PLOTS.md`, `ACTION_INDEX.json`, generated
  catalog/reference/search/LLM docs와 public box/gradient API pages를 동기화했다.
  `distribution-owner-role-revisions`는 Planned inventory에서 제거되었다.
- 새 chart, gallery variant, renderer, persisted schema, package entry point나 public primitive는 추가하지 않았다.
  Distribution role-scale handoff ownership을 명시하기 위해 current architecture materialization lifecycle만 갱신했다.

## Required evidence

- Owner/source resolution, complete categorical/quantitative role candidate와 ambiguity errors
- Every data/x/y partial edit, omission preservation and vertical/horizontal orientation handoff
- Immutable box summary/outlier or gradient profile revision and exact consumer rebind/release trace
- Stable owner/component/coordinate IDs and retained statistics/appearance
- Scale/axis/grid/legend transition plus selection/highlight final-item replay
- Downstream failure atomicity and previous program/source/caller/unrelated resource preservation
- Existing valid edit compatibility and focused/cumulative/Browser/PNG/package evidence

## Verification evidence

- Box create/edit focused suite 23/23, gradient edit/consumer suite 17/17, distribution exact Current contract 2/2,
  source/basic-facade boundary 13/13, relevant Current contract batch 28/28 and docs suite 37/37 pass.
- Normal cumulative suite: 1,904/1,904 pass. Coverage is 94.70% lines, 90.07% branches and 98.44% functions; all 68
  critical floors pass.
- Node render suite: 124/124 pass; generated 123 approved variants and zero active-review variants. Both approved and empty
  review galleries pass Playwright loading verification. No Phase 7 chart/gallery variant was added.
- Shared Playwright Browser suite: 47/47 pass, including packed default entry, all public logical Canvas sizes, high pixel
  density and no console/page errors.
- Exact Gate contract renders horizontal revised box and vertical revised gradient through mock Canvas and Node PNG at 2×
  (520×400 each), both non-empty.
- Generated contract/docs freshness checkers pass. Agent-doc navigation is 7/7 and `git diff --check` passes.
- Package boundary: 383 entries, 360,277 packed bytes and 1,702,782 unpacked bytes; bounded entry, 400KB packed and
  1,710,000-byte unpacked ceilings pass.
- Installed package consumer passes Node, extension, PNG, TypeScript, tutorial, private-export and all compatibility probes.
  Tarball SHA-256 is `151eebfcc2ddf58e4be9803672b9ee2c0851c718291c5fc4db0675fd39f96cd4`.
- Verified functional remote checkpoints: `125fe017` (runtime/contracts/docs) and `2fe415f2` (bounded package artifact) on
  `origin/codex/roadmap4-1-lifecycle`.

## Approval effect

Approval은 Phase 7 distribution owner role revision 결과를 고정하고 Phase 8 facet columns, scale policy and guide
policy editing을 허용한다. PR creation, npm publishing과 docs deployment 권한은 포함하지 않는다.

## Work blocked before approval

Phase 8 facet columns, scale policy and guide policy editing.
