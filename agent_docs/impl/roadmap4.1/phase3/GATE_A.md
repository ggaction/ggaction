# Gate R41-P3-A — Legend Lifecycle Completion

## Gate state

`ready-for-review`

## Review target

Phase 3의 stroke-width `editLegend` dispatch와 selective `removeLegend({ channels })` vertical slice 전체다.

## Exact public calls

```javascript
program.editLegend({
  target: "lines",
  title: "Line weight",
  count: 3,
  labels: { color: "#123456", offset: 18 },
  titleStyle: { color: "#654321", fontSize: 15 }
}); // stroke-width target

program.removeLegend();
program.removeLegend({ target: "points" });
program.removeLegend({ target: "points", channels: ["size"] });
program.removeLegend({
  target: "points",
  channels: ["color", "shape"]
});
```

Stroke-width `title`은 custom non-empty string, `"auto"`, `false`를 받는다. `count`는 integer `>= 2`, `labels`와
`titleStyle`은 shared text-style leaves의 partial merge다. Current right-side placement와 32-pixel line sample은
유지하며 label `offset`은 sample 끝부터의 거리를 정한다. Position/layout, symbol, border, gradient와 item-gap edit는
첫 state change 전에 오류다. Compatible focused `editLegendLabels`, `editLegendTitle`, `editLegendSymbols({ count })`도
real wrapped `editLegend` child를 통해 같은 결과를 만든다.

## Complete-block removal matrix

| Stored block kind | Owned public channels | Selection rule |
| --- | --- | --- |
| `series` categorical | Exact stored subset of `color`, `strokeDash`, `shape` | Represented set 전체 필요 |
| `color` categorical | `color` | `color` |
| `size` | `size` | `size` |
| `gradient` | `color` | `color` |
| `interval` | `color` | `color` |
| `opacity` | `opacity` | `opacity` |
| `strokeWidth` | `strokeWidth` | `strokeWidth` |

Explicit `channels`는 위 vocabulary의 unique non-empty subset이다. Stored combined categorical block과 일부라도
겹치면 그 complete represented set을 모두 요청해야 한다. Empty, duplicate, unknown, target에 없는 block과 partial
combined request는 collateral removal이나 trace 없이 오류다.

## Resolution, state and trace

- Target은 explicit ID 또는 unique existing legend owner로 resolve한다. Multiple owner에서는 requested channel이 한
  target에만 있더라도 기존 target inference compatibility를 유지해 explicit target을 요구한다.
- Omitted `channels`는 기존 whole-target path를 그대로 사용해 target의 모든 kind에 대해 semantic branch,
  concrete graphics와 materialization config를 제거한다. 다른 target에 같은 semantic kind가 남는 edge case에서만
  retained owner를 rematerialize해 its scale/title binding을 복구한다.
- Explicit `channels`는 complete selection plan을 먼저 계산한 뒤 selected kind만 제거한다. Mark encoding, semantic 및
  resolved scale, source data와 unrelated configs/graphics는 보존한다.
- Retained legend가 있으면 wrapped `rematerializeLegend`가 categorical, size, gradient, interval, opacity와 stroke-width
  materializer를 deterministic registry order로 호출한다. 다른 target에서 같은 semantic `color` kind를 보존하는
  경우 retained owner가 최종 scale/title을 다시 기록한다.
- Categorical block만 제거하고 같은 target의 size block을 남기면 `inheritAppearance` dependency를 해제하고 size를
  standalone defaults/position에서 다시 materialize한다. Size만 제거하면 categorical layout을 size 없는 baseline으로
  다시 계산한다.
- Removed point composite categorical block은 retained size를 중복 생성하지 않고 ordinary `createLegend`로 재생성할 수
  있다. Count가 명시되어 retained size와 충돌하면 silent edit 대신 기존 `editLegend` 사용을 요구한다.
- Stroke-width edit는 config를 immutable하게 교체하고 title graphic의 remove/recreate를 reconcile한 뒤
  `rematerializeStrokeWidthLegend`를 호출한다. 그 child가 semantic scale/title, sampled symbol widths, labels와 optional
  title을 current encoded scale과 Canvas bounds에서 다시 기록한다.

## Compatibility and architecture impact

- `RemoveLegendOptions.channels`와 stroke-width kind dispatch는 additive다. Existing `removeLegend({ target? })` 결과는
  explicit all-block removal과 semantic/config/graphic state가 정확히 같고 existing valid legend calls retain their
  omission behavior.
- Existing point-composite creation은 same-target retained size block을 재사용하도록 보강했다. Conflicting target/count는
  duplicate graphics나 implicit replacement 대신 명시적 오류다.
- Complete legend block은 계속 `semanticSpec.guides`, `materializationConfigs.guides.legend`와 kind registry의 concrete
  graphic IDs가 함께 소유한다. Renderer는 `graphicSpec`만 읽으며 automatic semantic-to-graphic compiler나 generic
  removal primitive를 public API에 추가하지 않았다.
- Persisted schema, package entry, renderer boundary, source dataset, mark encoding, scale와 coordinate ownership은 바뀌지
  않았다.
- Current contract, `ACTION_INDEX.json`, generated catalog, architecture lifecycle note, declarations, public legend docs,
  generated action/search/LLM references와 packed Browser consumer가 동기화되었다.

## Verification evidence

- Focused legend lifecycle/edit/remove/PNG package: 27/27 pass.
- Normal cumulative suite: 1,864/1,864 pass, including unit 1,261, contracts 140, charts 426 and docs 37.
- Coverage: 94.71% lines, 90.03% branches and 98.74% functions; all 68 critical floors pass.
- Generated contract/docs checkers: catalog, signatures, capabilities, actions, reference, metadata and search pass.
- Package boundary: 381 entries, 349,456 packed bytes and 1,640,432 unpacked bytes; existing ceilings did not change.
- Installed package consumer: Node, extension, PNG, TypeScript, tutorials, private-export rejection and compatibility probes
  pass; tarball SHA-256 is `71af0b3c965533a02f72cbf5b336cbca721001c0d6c35fe7b0a989aeb8906b2a`.
- Browser suite: 47/47 pass. The packed consumer renders a three-sample edited stroke-width legend, verifies custom title and
  label color, then selectively removes only that block while retaining its encoding, with accessible Canvas labels and no
  browser errors.
- Node PNG contract: 2× render reports 320×240 physical dimensions and non-empty output. Mock Canvas and concrete state lock
  sampled widths `[1, 4, 7]`, label/title colors, reduced draw calls after removal and retained stroke-width encoding.
- Executable coverage includes custom/auto/hidden title, partial style/count, compatible focused facades, bounded option
  errors, every block family, combined complete/partial selection, same-target layout dependencies, cross-target shared
  semantic kind, whole-target equivalence, recreate, ambiguity, caller ownership and earlier-program immutability.
- `git diff --check`: pass.
- Verified functional remote checkpoint: `872f9a05fba9aabd576c298faba4d80ec1975848` on
  `origin/codex/roadmap4-1-lifecycle`.

## Approval effect

Approval은 Phase 3 block ownership/edit/removal/rematerialization/compatibility 결과를 고정하고 Phase 4 Cartesian axis
component removal 구현을 허용한다. PR creation, npm publishing과 docs deployment 권한은 포함하지 않는다.

## Work unblocked by approval

Phase 4 Cartesian axis component lifecycle implementation. 사용자 explicit approval 전에는 차단된다.
