# Roadmap 2 — Phase 9 Step 1: Contract and Migration Audit

## 목표

Selector, selection storage, highlighting and `filterMark` migration boundaries를 구현 전에 고정한다.

## 진행 상태

- [ ] Current filterData/filterMark behavior, examples, types, docs and trace inventory
- [ ] Point/bar/line/area/rule materialization grain and stable child identity audit
- [ ] `filterMarks`, `selectMarks`, `highlightMarks`, `editBarMark` exact signatures
- [ ] Selection/highlight lifecycle, IDs, context and replacement/conflict rules
- [ ] Appearance precedence, dimming, front order and offset rematerialization rules
- [ ] Three Gate manifests, artifact paths and exact future call chains
- [ ] Contract tests updated to reject inventory/API drift
- [ ] STEP status, conceptual commit and push

## 핵심 결정

- `filterMark` is removed, not aliased.
- `filterMarks` changes semantic item membership; `selectMarks` alone changes no graphics.
- Selection intent is persisted outside transient context; highlight intent is graphical configuration.
- Aggregate preflight validates target, selector and complete style before creating any child state.
- Multi-valued line/area channels require explicit future reduction and are rejected in Phase 9.

## 완료 조건

No public signature, item grain, state owner, precedence or Gate target remains ambiguous before implementation.
