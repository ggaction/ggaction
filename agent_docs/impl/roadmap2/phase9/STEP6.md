# Roadmap 2 — Phase 9 Step 6: Tallest Histogram Stack Primitive

## 목표

같은 histogram에서 maximum semantic `y2`를 item grain과 stack grain으로 각각 선택한 raw primitive 두 개를
비교하고 Gate B에서 승인받는다.

## 진행 상태

- [x] Independent bin totals and unique tallest-stack key
- [x] Unique topmost segment key from item-grain maximum `y2`
- [x] Proof that selection uses semantic upper endpoint `y2`, not segment count or concrete pixel height
- [x] Candidate fill/stroke/opacity and selected-stack-last order
- [x] Remaining bars, grids, axes and title unchanged
- [x] Primitive program, reference values, manifest and future call chain
- [x] Browser and `primitive.png` checks
- [x] Gate B user confirmation
- [x] STEP status, conceptual commit and push

## Gate B

Confirm that the item example emphasizes only one topmost rect and the stack example emphasizes the complete tallest
stack without changing bin boundaries, segment counts, scales or neighboring stacks.

### Gate B candidate

- Semantic target: `bars/stack/1`, complete Displacement `[100, 150)` stack, total `104`
  (`USA 40 + Europe 36 + Japan 28`).
- Selection basis: stack channel `y2 = 104` with `y = 0`; no selector reads a segment count or concrete pixel height.
- Appearance: all three member rects use gold `#facc15`, dark `#713f12` 2.5px stroke, opacity `1`, and the complete
  selected stack is placed last.
- Comparison target: `bars/histogram/5`, Japan segment in the same `[100, 150)` bin, semantic endpoints
  `y = 76`, `y2 = 104`, segment count `28`. The omitted grain defaults to `"item"`, so only this rect is emphasized.
- Unselected rect properties, grids, axes, legend and title remain byte-for-byte structurally unchanged.
- A separately rematerialized Canvas height preserves the semantic key/count/interval while changing rect `y` and
  `height`.
- Artifact: `.artifacts/test/png/roadmap2/mark-selection/bars-tallest-stack/primitive.png`.
- Comparison artifact: `.artifacts/test/png/roadmap2/mark-selection/bars-topmost-segment/primitive.png`.
- Approved slice: `test/charts/mark-selection-bars/`; its manifest stores the exact public
  `highlightMarks({ select: { grain: "stack", channel: "y2", op: "max" }, ... })` chain without a user-facing program.

## 완료 조건

The target stack remains semantically identical under a Canvas-only resize while its concrete union geometry rematerializes.

## 승인 결과

2026-07-16 user confirmation approved both comparison primitives: item-grain maximum `y2` highlights only
`bars/histogram/5`, while stack-grain maximum `y2` highlights all three attachments of `bars/stack/1`.
