# Phase 5 — Step 4: Immutable Data Filtering

## 목표

Source dataset을 수정하지 않고 named derived dataset을 만드는 `filterData`를 구현한다.

## 진행 상태

- [ ] Derived dataset semantic paths와 validation
- [ ] `createDerivedData` wrapped action
- [ ] `materializeFilteredData` wrapped action
- [ ] `filterData({ id, source?, field, oneOf })`
- [ ] Current dataset inference와 ambiguity errors
- [ ] Source/derived values immutability
- [ ] Shortest valid call, trace, invalid-state tests
- [ ] Data action public documentation
- [ ] Primitive/action progression regression
- [ ] Commit과 push

## Action hierarchy

```text
filterData
├─ createDerivedData
└─ materializeFilteredData
```

Derived dataset은 source ID, filter transform, materialized values를 저장한다. Source
dataset values는 교체하지 않는다.
