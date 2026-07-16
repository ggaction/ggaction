# Roadmap 2 — Phase 9 Step 10: `filterMarks` Migration

## 목표

Current `filterMark` behavior를 plural `filterMarks`와 shared selector grammar로 이전하고 singular API를 제거한다.

## 진행 상태

- [x] Runtime registration and trace op renamed to `filterMarks`
- [x] Type declaration, package surface, current contract and reference renamed
- [x] Existing membership/comparison/range behavior migrated exactly
- [x] Rank/count/group/tie and channel/item-grain filtering added
- [x] Point derived-data/rebind and downstream regression behavior preserved
- [x] Bar/path native-grain filtering and rematerialization
- [x] All examples, tutorials, recipes, tests and variant call chains migrated
- [x] Contract test proves `filterMark` is absent everywhere current
- [x] Full invalid/ambiguity/immutability/rematerialization coverage
- [x] STEP status, conceptual commit and push

## 완료 조건

Every old valid filter flow works through `filterMarks`, and no compatibility alias or stale public text remains.
