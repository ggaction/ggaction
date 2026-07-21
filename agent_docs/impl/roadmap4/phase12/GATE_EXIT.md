# P12-Exit — Collision-aware Label Layout closeout

## 상태

- Gate: `P12-Exit`
- 상태: `approved`
- 승인: `2026-07-21` 사용자 명시 승인
- Production checkpoint: `b3198a3` (`implement collision-aware label layout`)
- Stable chart checkpoint: `d8f5b08` (`graduate label layout chart slice`)
- Current contract checkpoint: `264bff9` (`close label layout public contract`)
- Public registry checkpoint: `3b6bc01` (`register label layout example`)
- Remote: `origin/main`
- 승인 결과: Phase 12 종료. 사용자 요청에 따라 Phase 13은 `planned` 상태로 유지하고 열지 않음.

## 종료 대상 public surface

```typescript
layoutLabels({
  target?,
  axis?: "x" | "y" | "both",
  padding?,
  maxDisplacement?,
  bounds?: "plot" | "canvas",
  leader?: false | {
    stroke?, strokeWidth?, strokeDash?, opacity?
  }
} = {}): ChartProgram;

removeLabelLayout({ target? } = {}): ChartProgram;
```

- Defaults are `axis: "both"`, `padding: 3`, `maxDisplacement: 48`, `bounds: "plot"`, and `leader: false`.
- Target omission uses the current complete text mark, otherwise one unique complete text mark. Ambiguity and incomplete
  targets fail atomically.
- Repeated assignment replaces the complete policy from semantic base text. Removal restores current base positions and
  removes every target-owned leader.
- The surface is additive. Existing text programs do not move unless `layoutLabels()` is called.

Canonical runnable program: `examples/gapminder-country-labels/program.js`.

## Final ownership and lifecycle

```text
layoutLabels
└─ materializeLabelLayout
   ├─ rematerializeTextMark(replayLayout = false)
   ├─ deterministic layout/labels grammar
   ├─ editGraphics(final text x/y)
   ├─ create/editGraphics(optional ordinary line leaders)
   └─ store requested policy and latest resolution summary

ordinary text/source/data/scale/Canvas rematerialization
└─ rematerializeTextMark
   └─ materializeLabelLayout(rematerializeBase = false) exactly once
```

- Semantic text, encodings and persisted source relation remain unchanged.
- `materializationConfigs.labelLayouts[target]` owns graphical intent and the latest deterministic resolution summary.
- `graphicSpec` stores only final backend-neutral text and line geometry. Browser Canvas and Node PNG renderers have no
  label-layout branch.
- `src/layout/labels.js` owns deterministic candidate enumeration, text bounds, overlap scoring and leader endpoints.
- Source anchors come only from the stored text-source relation. The action never searches for an arbitrary nearby mark.
- Impossible bounded placement records stable `overlap`/`bounds` warnings with deterministic best effort; it does not
  silently claim success or alter margins/font size.
- Text edit, encoding reassignment, source filtering, scale/Canvas changes and owning mark removal replay or clean up the
  same owner without accumulating displacement or stale leaders.

## Stable visual evidence

- Stable owner: `test/charts/gapminder-country-labels/`
- Artifact: `.artifacts/test/png/charts/label-layout/gapminder-country-labels/collision-aware/`
- Logical/physical size: `760×520` / `1520×1040`
- Primitive/public PNG SHA-256:
  `c0741e4e44cf3ea95c29e568b01e08d04e78c185ff09969d410ad847ca77d1e5`
- 18 labels; initial overlap `4` pairs → final `0`; 4 displaced labels; 3 leaders; maximum displacement about
  `15.2971px`.
- Primitive/public semantic state, complete graphic tree, draw order, mock Canvas calls and decoded pixels are exact.
- Active review gallery is empty after graduation.

## Public contract and compatibility

- Runtime methods, strict declarations, root named types, Current action inventory and generated catalog use the same
  option vocabulary.
- Mark API, annotation recipe, action reference, supported-feature page, generated LLM documentation and canonical example
  are synchronized. Documentation was built and tested but not deployed.
- Package artifact remains within the approved size ceiling and the installed package consumer passes. No dependency,
  export-map, renderer primitive or existing semantic schema was added for this feature.

## 누적 검증 증거

| 검증 | 결과 |
| --- | --- |
| Full normal suite | `1,825/1,825` pass |
| Coverage | lines `94.59%`, branches `89.89%`, functions `98.66%`; critical floors `68/68` pass |
| Browser Canvas/package example suite | `47/47` pass |
| Full Node PNG render suite | `124/124` pass |
| Approved artifact gallery | `123` variants verified |
| Active-review gallery | `0` variants verified |
| Documentation source/generator suite | `35/35` pass |
| Built docs | `110` pages; links/assets/search/LLM targets pass |
| Docs browser | desktop search and every page at `320px`, `390px`, `768px` pass |
| Package artifact | `380` entries; `344,277` packed / `1,613,722` unpacked bytes |
| Installed-package consumer | Node/extension/PNG/runtime/TypeScript/tutorial/browser/private-export checks pass |
| Packed tarball SHA-256 | `cc1fa8d26a5d2faae845f62c3e78c5a12262b60c5c3183adce0f162214788329` |

Chromium/localhost, npm dependency installation and built-doc browser checks were run outside the restricted macOS
sandbox after the corresponding sandbox-only attempts were blocked. Documentation used repository-pinned
`mise ruby@3.2.6` and the locked bundle.

## 승인 요청 범위

1. `layoutLabels()` / `removeLabelLayout()`의 final public contract와 compatibility
2. graphical-only state owner, deterministic grammar와 base-first exactly-once replay
3. stable Gapminder primitive/public exact visual parity와 artifact graduation
4. Current inventory, architecture, package boundary와 public/generated documentation 동기화
5. 위 누적 검증을 Phase 12 종료 증거로 채택하는 것

P12-Exit 승인으로 Phase 12를 `completed`로 닫았다. Phase 13 설계와 Gate 계획은 별도 사용자 요청 전까지
시작하지 않는다.
