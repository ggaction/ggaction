# Roadmap 2 — Phase 9 Step 5: `selectMarks` and Point `highlightMarks`

## 목표

Approved Gate A를 `selectMarks`와 `highlightMarks` hierarchy로 정확히 재현한다.

## 진행 상태

- [ ] `selectMarks` shortest/explicit calls, IDs, context and trace
- [ ] Point selection resolution for predicate/set/range/rank selectors
- [ ] `highlightMarks` with inline `select` and existing `selection`
- [ ] Point default recipe and explicit color/opacity/shape/size/offset
- [ ] `dimOthers` and `bringToFront`
- [ ] Appearance precedence over field encodings only for selected items
- [ ] Canvas/scale/encoding/cardinality rematerialization
- [ ] Primitive/public semantic, graphic, order, Canvas and pixel equality
- [ ] Point option/error/immutability coverage matrix
- [ ] STEP status, conceptual commit and push

## Action hierarchy

```text
highlightMarks
├─ selectMarks?
├─ applyPointHighlight
├─ dimUnselectedMarkItems?
└─ placeSelectedMarkItemsLast?
```

## 완료 조건

Both concise one-call highlight and reusable two-call selection flow converge on the approved Gate A result.
