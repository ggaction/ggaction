# Roadmap 2 — Phase 9 Step 7: Bar Selection, `editBarMark`, and Highlight

## 목표

Approved Gate B를 bar item resolver, whole-mark `editBarMark`와 bar highlight recipe로 구현한다.

## 진행 상태

- [x] Histogram, aggregate, grouped, stacked and ranged final-cell item resolvers
- [x] `editBarMark` full signature and shortest call
- [x] Fill/opacity/stroke/strokeWidth persistence and stroke removal
- [x] Encoded-color conflict and immutable invalid edits
- [x] Bar default/explicit highlight, dimming and front order
- [x] Channel `min | max`, count/ties and empty selection
- [x] Canvas, scale, bin, grouping and stack rematerialization
- [x] Primitive/public exact Gate B equivalence
- [x] Every bar grain mechanical coverage
- [x] STEP status, conceptual commit and push

## 구현 결과

- Bar item은 semantic endpoint `x/y/x2/y2`와 concrete `x/y/width/height`를 구분하고,
  stack grain은 모든 attached rect ID와 union bounds를 보존한다.
- `editBarMark`는 whole-mark appearance를 `barAppearance`에 저장하고, selected-item
  highlight는 독립적인 assignment로 마지막에 적용된다.
- Approved item/stack primitive와 public `highlightMarks` program은 semantic state, graphic
  state, drawing order, Canvas calls과 decoded pixels가 정확히 일치한다.

## 완료 조건

Tallest-stack highlighting and whole-bar editing share canonical bar appearance/materialization without raw paths.
