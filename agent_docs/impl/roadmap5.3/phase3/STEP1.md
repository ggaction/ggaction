# STEP 1 — Inventory and Author Task Recipes

## 진행 상태

- [ ] Existing `docs/recipes`, canonical examples and Phase 2 action examples inventory
- [ ] Distinct task taxonomy and initial action-role matrix
- [ ] Canonical recipe source authoring with runnable examples
- [ ] Focused executable examples only for real uncovered workflows
- [ ] Recipe schema, prose quality, action existence/order and example-trace validation

## 실행 순서

1. Existing public recipe pages와 example exports가 실제로 증명하는 top-level/wrapped action trace를 추출한다.
2. Basic chart, transform/statistics, composition, guide/layout, appearance/selection, lifecycle repair와 extension workflow로
   task를 묶고 같은 결과를 만드는 중복 recipe는 합친다.
3. 각 recipe에 minimal ordered flow를 적고 secondary styling이나 변형은 alternatives에 둔다.
4. 기존 완성 program이 없는 workflow만 focused registry에 작은 실행 가능한 program을 추가한다.
5. Validator가 title/intent boilerplate, unknown action, 중복 step ID, 깨진 docs/example, 실행 실패와 primary trace 누락을
   거부하게 한다.

## 완료 기준

- 모든 recipe가 import 가능한 complete program과 primary trace evidence를 가진다.
- Recipe별 primary action과 supporting/lifecycle action의 역할이 실제 step 순서와 일치한다.
- 같은 action을 같은 recipe에서 상충하는 역할로 중복 사용하지 않는다.
- Public API, action behavior와 package boundary 변경이 없다.
