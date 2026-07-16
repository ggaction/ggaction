# Roadmap 2 — Phase 9 Step 5: `selectMarks` and Point `highlightMarks`

## 목표

Approved Gate A를 `selectMarks`와 `highlightMarks` hierarchy로 정확히 재현한다.

## 진행 상태

- [x] `selectMarks` shortest/explicit calls, IDs, context and trace
- [x] Point selection resolution for predicate/set/range/rank selectors
- [x] `highlightMarks` with inline `select` and existing `selection`
- [x] Point default recipe and explicit color/opacity/shape/size/offset
- [x] `dimOthers` and `bringToFront`
- [x] Appearance precedence over field encodings only for selected items
- [x] Canvas/scale/encoding/cardinality rematerialization
- [x] Primitive/public semantic, graphic, order, Canvas and pixel equality
- [x] Point option/error/immutability coverage matrix
- [x] STEP status, conceptual commit and push

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

## 구현 결과

- Selection definition과 highlight assignment는 semantic/graphic state와 분리된 immutable materialization
  config에 저장한다. `selectMarks` alone은 concrete graphics를 바꾸지 않는다.
- Point child의 stable semantic key를 collection order와 분리했다. Base point rematerialization 뒤 stored
  selector를 재평가하고 highlight, complement dimming, selected-last order를 wrapped action으로 재적용한다.
- Approved Gate slice를 `test/gates/`에서 `test/charts/`로 승격하고 canonical public example과 exact
  primitive/public renderer-call 및 pixel equality를 연결했다.
- Current action contract, public reference/API docs, TypeScript declaration과 internal wrapped inventory를 함께
  승격했다. Bar/path/rule recipes는 Planned 상태를 유지한다.
