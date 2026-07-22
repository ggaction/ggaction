# Gate R41-P1-A — Encoding and Appearance Teardown

## Gate state

`ready-for-review`

Phase 1 implementation과 cumulative verification이 완료되었다. Functional checkpoint `b8b968f`는
`origin/codex/roadmap4-1-lifecycle`에 push되었으며 사용자 explicit approval 전에는 Phase 2를 시작하지 않는다.

## Review target

Phase 1의 `removeEncoding`, `removePointRadius`, point/arc `stroke: false` vertical slice 전체다.

## Exact public calls

```javascript
program.removeEncoding({ channel });
program.removeEncoding({ target, channel });
program.removePointRadius();
program.removePointRadius({ target });
program.editPointMark({ target, stroke: false });
program.editArcMark({ target, stroke: false });
```

`removeEncoding.channel`은 `x`, `y`, `x2`, `y2`, `xOffset`, `yOffset`, `theta`, `radius`, `color`,
`strokeDash`, `strokeWidth`, `size`, `shape`, `group`, `opacity`, `text`의 closed 17-value vocabulary다.
`pathOrder`는 existing `removePathOrder`, Parallel dimensions는 `encodeParallelCoordinates`가 계속 소유한다.

## Resolution and atomic failure

- Explicit target은 해당 layer와 active channel이 모두 존재해야 한다.
- Omitted target은 requested channel을 가진 current mark, 그 다음 unique owner만 허용한다. Multiple owner와 no owner는
  첫 후보를 선택하지 않고 오류다.
- Unknown option/channel, missing assignment, ambiguous target과 channel-dependent stored selection은 첫 semantic
  edit 전에 오류다. Earlier program과 caller option object는 유지된다.
- `removePointRadius`도 explicit radius를 가진 current/unique point만 선택하며 missing/ambiguous assignment는 오류다.
- Point/arc `stroke: false`와 `strokeWidth` 동시 지정은 오류다. Disabled outline에 width만 지정하는 것도 오류다.

## Encoding cascade matrix

| Requested channel | Removed semantic/config companions | Additional policy |
| --- | --- | --- |
| `x` | Same-mark `x2`, `xOffset` | x guide cleanup uses the removed primary scale |
| `y` | Same-mark `y2`, `yOffset` | y guide cleanup uses the removed primary scale |
| `color` on grouped bar | Generated directional offset and its mark config | Mark becomes ungrouped or incomplete according to remaining position state |
| `color` on normalized bar | No extra channel beyond an owned grouped offset | Measure stack returns from `normalize` to `zero` |
| `group` on area | Same-field dependent `color` | Independent color is retained |
| Other accepted channel | Requested channel only | Matching owned guide/config block is still cleaned |

Named source data, scales and coordinates are never cascade-deleted. Primary axis/grid is removed only when no remaining
same-channel layer consumes the same scale. A shared consumer preserves both. Categorical combined legends are rebuilt with
remaining channels and stored layout/style; gradient/interval, size, opacity and stroke-width blocks are removed only when
their owning channel is removed.

## Resulting state and materialization

Each removal structurally deletes the semantic branch with wrapped `editSemantic({ remove: true })`, removes owned
materialization config, clears the target concrete collection/length, and invokes the mark-family materializer. A complete
mark is rebuilt from that empty baseline. An incomplete mark remains empty and later ordinary encoding can complete it with
the retained named scale. Source-dependent text and compatible highlights replay after the base mark is rebuilt.

The representative packed-Browser/PNG program removes point `size` and `color`, then disables its outline. Its final state is:

```text
semantic encoding  x, y only
retained scales    x, y, color, size
mark config        { shape: "circle", stroke: false }
point radii        [3, 3]
point fills        ["#4c78a8", "#4c78a8"]
point strokes      transparent, width 0
```

Its three top-level trace nodes are `removeEncoding`, `removeEncoding`, `editPointMark`. The two removal nodes each contain
`editSemantic`, concrete baseline clearing and `rematerializePointMark`; the mark edit contains
`rematerializePointMark`. No renderer reads semantic state.

`removePointRadius` removes only `materializationConfigs.marks[target].radius`, rebuilds the point collection at theme radius
`3`, and leaves semantic Polar `encoding.radius` untouched. Point/arc outline disable stores `stroke: false`, deletes stored
width, and emits transparent/zero-width concrete output. A later string stroke restores default width `1`.

## Compatibility and architecture impact

- The two public methods and the point/arc edit-time `false` value are additive. Existing valid calls retain their omission,
  inference and validation behavior.
- No persisted schema, package entry, renderer boundary, resource identity, source dataset, scale or coordinate ownership
  changed.
- `removeEncoding` is a domain action that composes existing semantic/graphic primitives and mark materializers; no automatic
  semantic-to-graphic compiler or generic mutation API was introduced.
- Rule rematerialization now merges stored partial config over its defaults. This prevents removal of a field-driven
  `strokeWidth` from leaving a stale/undefined width and restores the existing rule default `2`.
- The unpacked package guard moved from 1,625,000 to 1,650,000 bytes to admit the new source/docs surface. Entry and packed-size
  ceilings did not change; the verified artifact is 381 entries, 347,311 packed bytes and 1,628,433 unpacked bytes.
- Current contracts, strict declarations, `ACTION_INDEX.json`, generated catalog, architecture lifecycle note, public API docs,
  generated action/type/search/LLM references and packed Browser consumer are synchronized.

## Verification evidence

- Focused removal/point/arc/PNG run: 28/28 pass.
- Normal cumulative suite: 1,845/1,845 pass, including unit 1,244, contracts 138, charts 426 and docs 37.
- Coverage policy: global 94% lines, 89% branches and 98% functions thresholds plus all 68 critical floors pass.
- Generated contract and docs checkers: catalog, signatures, capabilities, actions, reference, metadata and search pass.
- Package boundary check: 381 entries, 347,311 packed bytes, 1,628,433 unpacked bytes.
- Installed package consumer: Node, extension, PNG, TypeScript, tutorials, private-export rejection and all compatibility probes
  pass; tarball SHA-256 is `a58792d9ce2293aed635f54591ce6da3f66abc19713cc2916c6c0dcdf6b37429`.
- Browser suite: 25/25 pass. The packed default entry renders two 160×120 points with radius `3`, default fill, outline width
  `0`, removed semantic channels, completion signal, accessible canvas label and no browser errors.
- Node PNG contract: 2× render reports 320×240 physical dimensions and non-empty output; mock Canvas records two fills and
  transparent zero-width strokes.
- `git diff --check`: pass.
- Functional remote checkpoint: `b8b968f05f7eb623e6180ec73f088883215f254c` on
  `origin/codex/roadmap4-1-lifecycle`.

## Approval effect

Approval은 Phase 1 state/trace/cascade/compatibility 결과를 고정하고 Phase 2 selection/highlight lifecycle 구현을
허용한다. PR creation, npm publishing과 docs deployment 권한은 포함하지 않는다.

## Work blocked before approval

Phase 2 selection/highlight lifecycle implementation.
