# Gate R41-P5-A — Logical Bin2D Partial Revision

## Gate state

`ready-for-review`

## Review target

Phase 5의 `editBin2DData` owner resolution, immutable revision/rebind/rematerialization/release와 repeated-create
compatibility vertical slice 전체다.

## Exact public call

```javascript
program.editBin2DData({ bins: 20 }); // current or unique logical owner

program.editBin2DData({
  target: "cells",
  source: "observations",
  x: "longitude",
  y: "latitude",
  bins: { x: 20, y: 10 },
  extent: { y: [0, 100] },
  includeEmpty: true,
  members: false,
  as: {
    x0: "x0",
    x1: "x1",
    y0: "y0",
    y1: "y1",
    count: "count"
  }
});
```

`target`은 optional logical owner selector이고 나머지 option 중 최소 하나가 필요하다. Omitted option은 current
transform provenance에서 보존한다. `bins` scalar/object와 `extent` object는 create-time vocabulary의 complete
replacement다. 따라서 explicit extent object에서 생략한 axis는 automatic으로 돌아간다. Explicit `as`는
`x0/x1/y0/y1/count`와 enabled일 때 `members`까지 complete map이어야 한다.

## Required evidence

- Explicit/current/unique owner selection and missing/ambiguous rejection
- Every source/field/transform/output edit and omitted provenance preservation
- Complete-candidate validation before first state/trace change
- Immutable revision ID, logical owner continuity, direct layer rebind and dependent rematerialization
- Safe prior revision release only when no remaining consumer references it
- Previous program, caller options, source rows, sibling datasets and unrelated consumers preserved
- Repeated-create compatibility, focused/cumulative/Browser/PNG/package evidence and remote checkpoint

## Resolution, preflight and trace

- Explicit `target`은 materialization registry의 logical owner ID만 받는다. 생략하면 `context.currentData`와 같은 current
  revision을 가진 owner, 그 다음 유일한 owner를 사용한다. Current match가 없고 owner가 둘 이상이면 ambiguity error이며
  첫 registry entry를 선택하지 않는다. Missing explicit owner와 owner 부재도 서로 구분된 오류다.
- `target` 외 최소 한 source/transform option이 필요하고 normalized complete candidate가 current request와 같으면 no-op
  error다. Omitted top-level `source`, `x`, `y`, `bins`, `extent`, `includeEmpty`, `members`, `as`는 requested provenance에서
  보존한다. `members`만 켜면 `__<owner>_members`를 추가하고 끄면 members output만 제거한다.
- Source values와 complete transform derive, current revision을 소비하는 derived dataset, revision plan과 모든 direct
  visual consumer rematerialization을 speculative immutable branch에서 먼저 검증한다. Downstream scale/field failure도
  returned program이나 caller state를 만들기 전에 오류다.
- 성공 시 speculative trace는 버리고 actual plan을 한 번 실행한다. Top-level `editBin2DData` 아래에는 one
  `createDerivedData`, one `materializeBin2DData`, consumer별 one `rebindLayerData`와 deduplicated scale/mark/guide plan,
  one `releaseDerivedData`가 실제 전환 횟수만큼만 남는다.

## Resulting state and compatibility

- New ID는 `${owner}Bin2DDataRevision${n}`이며 logical owner config의 `current`만 새 revision으로 이동한다. Every direct
  layer consumer는 same layer ID로 rebind되고 scale, mark와 guide가 새 cell cardinality/domain에서 다시 materialize된다.
  Scale, coordinate, guide, layer identity와 unrelated datasets/consumers는 유지된다.
- `releaseDerivedData`는 prior revision이 orphan일 때 제거한다. New revision이 prior를 source로 사용하는 valid bin-of-bin
  case에서는 prior가 계속 referenced이므로 보존된다. Existing derived consumer가 current revision에 매달려 있으면
  silent cascade 대신 edit 전체를 거부한다.
- Earlier program, source rows와 caller-owned nested option은 그대로다. Explicit `as` 변경이 retained consumer encoding을
  깨뜨리면 speculative rematerialization이 거부하고 original semantic/config/graphic state를 보존한다.
- Existing `createBin2DData({ id: existing, ...completeTransform })` full reauthor path와 revision ID/state 결과는 유지된다.
  Equivalent complete create와 partial edit의 semantic result가 같고 top-level intent/trace name만 다르다.
- Runtime method, strict declaration/export, Current CORE contract, `ACTION_INDEX.json`, generated catalog/reference/search/LLM
  docs, architecture provenance note와 packed Node/TypeScript/Browser consumers가 동기화되었다. Planned direct action은
  Current로 승격되어 planned inventory에서 제거되었다.

## Verification evidence

- Focused Bin2D unit/contract/Canvas/PNG package: 16/16 pass.
- Normal cumulative suite: 1,883/1,883 pass, including unit 1,276, contracts 144, charts 426 and docs 37.
- Coverage: 94.73% lines, 90.10% branches and 98.75% functions; all 68 critical floors pass.
- Generated contract/docs checkers: catalog, signatures, capabilities, actions, reference, metadata and search pass.
- Package boundary: 381 entries, 351,150 packed bytes and 1,647,612 unpacked bytes; existing entry/size ceilings pass.
- Installed package consumer: Node, extension, PNG, TypeScript, tutorials, private-export rejection and existing compatibility
  probes pass; tarball SHA-256 is `b4a11dee665e3e00c9c6a24595de2f85ca1a44289435a19bb33437ed34849826`.
- Browser suite: 47/47 pass. Packed consumer renders a 200×140 logical Canvas from the installed default entry, reports
  `cellsBin2DDataRevision1`, one rematerialized rect, exact layer rebind, accessible Canvas label and no console/page errors.
- Node PNG contract renders the same revision result at 2× with 520×440 physical dimensions and non-empty output. Mock Canvas
  verifies filled/stroked retained rect output and rematerialized continuous-color legend state.
- Executable coverage includes explicit/current/unique/missing/ambiguous owner resolution, every editable option, omission and
  members normalization, no-op/unknown/invalid calls, multi-consumer trace uniqueness, derived dependency rejection, downstream
  failure atomicity, safe prior preservation/release, repeated-create equivalence and prior/caller/source immutability.
- `git diff --check`: pass.
- Verified functional remote checkpoint: `4eed2dc44dcf4a9c26f90ed72e740af81a56aa16` on
  `origin/codex/roadmap4-1-lifecycle`.

## Approval effect

Approval은 Phase 5 owner/provenance/revision/rebind/rematerialization/release와 compatibility 결과를 고정하고 Phase 6
statistical owner revision and error-band boundary implementation을 허용한다. PR creation, npm publishing과 docs
deployment 권한은 포함하지 않는다.

## Work blocked before approval

Phase 6 statistical owner revision and error-band boundary implementation.
