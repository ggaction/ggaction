# STEP 8 — Public Facet and Composition Materialization

## 진행 상태

- [x] Facet composition stored state
- [x] Parent nested Canvas snapshot
- [x] Public `facet` action hierarchy
- [x] Package types와 boundary
- [x] Primitive/public exact graphic parity

Public `facet`은 current unit program을 base로 child derivation을 orchestrate하고 Phase 6 snapshot/layout protocol을
재사용한다. Parent renderer는 `children`이나 facet semantics를 읽지 않는다.
