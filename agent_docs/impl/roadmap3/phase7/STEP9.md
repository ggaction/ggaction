# STEP 9 — Header Edit, Title Promotion and Layout Edit

## 진행 상태

- [x] `editFacetHeaders` validation과 rematerialization
- [x] Existing title parent promotion
- [x] Facet 뒤 title create/edit ownership
- [x] `editCompositionLayout` facet compatibility
- [x] Reversed authoring-order convergence

Header edit은 child semantics를 바꾸지 않는다. Title과 header는 parent resource이며 layout edit 뒤에도 child
program identity와 facet value order를 보존한다.

Canonical example은 base cell의 작은 top margin과 title이 충돌하지 않도록 `facet` 뒤 `createTitle`을 호출한다.
Facet 전에 이미 유효하게 만들어진 title은 authoring-order compatibility를 위해 parent로 promote한다.
