# Gate R41-P4-A — Cartesian Axis Component Lifecycle

## Gate state

`ready-for-review`

## Review target

Phase 4의 `editXAxis`/`editYAxis` nested component removal과 aggregate atomicity vertical slice 전체다.

## Exact public calls

```javascript
program.editXAxis({ line: false });
program.editXAxis({ ticks: false });
program.editXAxis({ labels: false });
program.editXAxis({ ticksAndLabels: false });
program.editXAxis({ title: false });

program.editYAxis({
  line: false,
  ticksAndLabels: false,
  title: false
});
```

Nested component omission은 preserve, object는 existing edit/create semantics, `false`는 existing component removal이다.
`ticksAndLabels` group은 `ticks`/`labels` leaf와 같은 call에서 함께 지정할 수 없다. Aggregate는 complete proposed
operation을 preflight하고 failure에서 partial state나 partial trace를 남기지 않는다.

## Required evidence

- X/Y axis별 line, ticks, labels, ticks-and-labels와 title removal
- Retained semantic/config/graphic components and exact last-component cleanup
- Mixed edit/removal, direct missing removal, group/leaf conflict and ambiguity behavior
- Ordinary create/edit path recreation and no stale resurrection after Canvas/scale revision
- Scale, coordinate, mark encoding, source data, previous program and caller option preservation
- Focused/cumulative/Browser/PNG/package verification and remote checkpoint

## Resolution, preflight and trace

- Cartesian identity는 public method가 x 또는 y channel을 명시하므로 target 후보를 추론하거나 첫 scale/coordinate를
  선택하지 않는다. Existing channel axis component만 대상이며 scale/coordinate rebinding은 이 facade의 option이 아니다.
- `line`, `ticks`, `labels`, `ticksAndLabels`, `title` omission은 component state를 보존하고 object는 existing wrapped
  leaf edit를 호출하며 `false`는 existing component를 요구한다. `ticksAndLabels: false`는 ticks와 labels 둘 다
  existing이어야 하고 둘 중 하나라도 없으면 아무 component도 제거하지 않는다.
- `ticksAndLabels`와 standalone `ticks`/`labels`는 object/`false` 여부와 무관하게 한 call에서 mutually exclusive다.
  Unknown option, non-object/non-false value, missing edit/removal leaf와 invalid later appearance/layout은 complete plan의
  speculative immutable execution에서 먼저 실패한다.
- Successful call은 speculative trace를 버리고 actual plan을 한 번 실행하므로 returned top-level `editXAxis` 또는
  `editYAxis` 아래에 실제 leaf edit와 removal primitive가 한 번만 남는다. `position`은 explicit component뿐 아니라
  제거되지 않은 모든 existing component에 적용되어 partial edge placement를 만들지 않는다.
- Line/ticks/labels removal은 matching concrete graphic과 materialization config를 제거한다. Title removal은 semantic
  title leaf도 `editSemantic({ remove: true })`로 정리한다. Last component 뒤에는 existing wrapped `removeXAxis` 또는
  `removeYAxis`가 scale/coordinate binding을 포함한 empty axis semantic/config branch를 완전히 제거한다.

## Resulting state and compatibility

- Partial removal은 retained component config/geometry, semantic axis scale/coordinate, source datasets, mark encodings,
  resolved scales와 opposite axis를 보존한다. Previous program과 caller-owned nested options는 그대로다.
- Component-specific `createXAxisLine/Ticks/Labels/Title`와 y counterpart가 removed leaf를 복원한다.
  `create*AxisTicksAndLabels`는 removed group을, `createXAxis`/`createYAxis`는 fully removed axis를 ordinary path로 복원한다.
- Canvas와 scale dependency planner는 config/graphic presence만 계획하므로 removed leaf를 다시 호출하지 않는다.
  Retained components는 edited Canvas bounds와 reversed scale에서 다시 계산되고 removed leaf는 semantic inference만으로
  되살아나지 않는다.
- Existing valid object edits와 omission behavior는 유지한다. `position`과 partial object를 함께 썼을 때 omitted retained
  component도 same edge로 이동하도록 current documented aggregate contract와 runtime을 일치시켰다.
- `EditAxisOptions`만 additive `false | ExistingEditOptions` union으로 넓혔다. New direct action, persisted schema,
  renderer behavior, generic mutation API, scale/data/coordinate removal과 Polar guide behavior는 추가하거나 바꾸지 않았다.
- Current axis contract, `ACTION_INDEX.json`, generated catalog, architecture lifecycle note, declarations, public axis docs,
  generated action/search/LLM references와 packed Node/TypeScript/Browser consumers가 동기화되었다. Planned
  `cartesian-axis-component-removal` capability는 Current behavior로 승격되어 planned inventory에서 제거되었다.

## Verification evidence

- Focused axis lifecycle/aggregate/removal/Canvas/PNG package: 19/19 pass.
- Normal cumulative suite: 1,873/1,873 pass, including unit 1,268, contracts 142, charts 426 and docs 37.
- Coverage: 94.73% lines, 90.07% branches and 98.74% functions; all 68 critical floors pass.
- Generated contract/docs checkers: catalog, signatures, capabilities, actions, reference, metadata and search pass.
- Package boundary: 381 entries, 350,184 packed bytes and 1,643,295 unpacked bytes; existing ceilings did not change.
- Installed package consumer: Node, extension, PNG, TypeScript, tutorials, private-export rejection and existing compatibility
  probes pass; tarball SHA-256 is `20ae7f9bf3268f031d0f53c8a49a23279e3b43013f98fbd3130b0cb337cbfee0`.
- Browser suite: 47/47 pass. The packed consumer renders a 240×180 logical Canvas with x ticks/labels and y line/title removed,
  retained x line/title and y ticks/labels, accessible Canvas label and no console/page errors.
- Node PNG contract: 2× render reports 480×360 physical dimensions and non-empty output. Mock Canvas verifies retained line/text
  drawing while exact concrete state excludes the four selected graphics.
- Executable coverage includes every x/y leaf and group removal/recreate, complete cleanup/recreate, mixed position/removal,
  missing and group/leaf failures, invalid later-leaf atomicity, Canvas/scale replay, trace uniqueness, prior-state and caller-input
  immutability.
- `git diff --check`: pass.
- Verified functional remote checkpoint: `52b26d8766442e421abd4f3b6c65899220265a6d` on
  `origin/codex/roadmap4-1-lifecycle`.

## Approval effect

Approval은 Phase 4 component ownership/removal/reconciliation/atomicity/compatibility 결과를 고정하고 Phase 5
`editBin2DData` partial revision facade 구현을 허용한다. PR creation, npm publishing과 docs deployment 권한은
포함하지 않는다.

## Work blocked before approval

Phase 5 `editBin2DData` partial revision facade implementation.
