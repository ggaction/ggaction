# STEP 1 — Phase Contract and Gate Targets

## 진행 상태

- [x] Channel-level scale syntax 확정
- [x] Derived replay boundary 확정
- [x] Density requested/resolved provenance 방향 확정
- [x] Outer-axis semantics 확정
- [x] Gate I-A와 Gate I-B target 분리

Phase 8은 새 action을 추가하지 않고 `facet({ scales, guides })`를 확장한다. 대표 visual target은
Gapminder cluster regression facet이며, Gate I-A는 scale/derived behavior, Gate I-B는 guide composition을
독립적으로 승인한다.

Implementation은 hard Gate 전에 public types, runtime options 또는 Current contract를 변경하지 않는다.
