# STEP 1 — Facet Rederivation and Policy Actions

## 진행 상태

- [ ] Parent retained unit state and current facet definition mapping
- [ ] Facet-only columns validation and snapshot rematerialization
- [ ] Complete scale/guide policy candidate preflight
- [ ] Immutable child rederive/replay and parent snapshot replacement
- [ ] Stable identity, selection/highlight, failure atomicity tests

## 실행 순서

1. Facet parent semantic/materialization state, compositionSpec definition, derived children와 parent-owned
   header/title/shared-guide ownership을 mapping한다.
2. `columns`는 facet composition에서만 positive integer로 normalize하고 current children topology로 layout을
   preflight한다. Concat은 existing rejection boundary를 유지한다.
3. Omitted scale/guide channel은 current policy에서 보존하고 complete candidate를 grammar owner로 normalize한다.
4. Parent retained unit state에서 current field/data/value identity로 모든 child를 다시 derive/replay하고 scale domains,
   marks, guides, selection/highlight를 current policy로 materialize한다.
5. Complete children, layout과 guide ownership이 유효한 speculative parent를 만든 뒤 actual snapshot을 한 번 교체한다.
   Failure는 original parent, children와 caller option을 보존한다.
