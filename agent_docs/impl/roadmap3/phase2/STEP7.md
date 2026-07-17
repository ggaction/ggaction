# STEP 7 — Point Materialization and Rematerialization

## 진행 상태

- [x] Coordinate-specific position policy boundary
- [x] Polar point materializer
- [x] Existing shape/color/size/opacity reuse
- [x] Canvas와 scale rematerialization plans
- [x] Primitive/runtime graphic equivalence

Polar position resolution 뒤에는 existing point graphical recipe를 재사용한다. Concrete graphic과 renderer에는
Polar-specific property 또는 dispatch를 추가하지 않는다.
