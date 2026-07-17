# STEP 5 — Domain Removal Primitive Variants

## 진행 상태

- [ ] Axis/grid/legend/title complete cleanup target
- [ ] One independent layered mark cleanup target
- [ ] Semantic/config/graphic/selection dependency absence assertions
- [ ] Recreate-safe deterministic identity contract

## 구현

Guide removal target은 Cars histogram bars를 유지하면서 axes, grid, legend와 title을 제거한다. Mark removal
target은 Gapminder layered bar+point chart에서 point만 제거해 shared dataset, scales, coordinate, axes와 bar를
보존한다. Primitive는 canonical structural config cleanup helper만 사용한다.
