# Roadmap 2 — Phase 9 Step 10: `filterMarks` Migration

## 목표

Current `filterMark` behavior를 plural `filterMarks`와 shared selector grammar로 이전하고 singular API를 제거한다.

## 진행 상태

- [ ] Runtime registration and trace op renamed to `filterMarks`
- [ ] Type declaration, package surface, current contract and reference renamed
- [ ] Existing membership/comparison/range behavior migrated exactly
- [ ] Rank/count/group/tie and channel/item-grain filtering added
- [ ] Point derived-data/rebind and downstream regression behavior preserved
- [ ] Bar/path native-grain filtering and rematerialization
- [ ] All examples, tutorials, recipes, tests and variant call chains migrated
- [ ] Contract test proves `filterMark` is absent everywhere current
- [ ] Full invalid/ambiguity/immutability/rematerialization coverage
- [ ] STEP status, conceptual commit and push

## 완료 조건

Every old valid filter flow works through `filterMarks`, and no compatibility alias or stale public text remains.
