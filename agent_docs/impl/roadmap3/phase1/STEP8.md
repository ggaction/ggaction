# STEP 8 — Public Focused Edit and Removal Actions

## 진행 상태

- [x] 19 direct actions 구현
- [x] 4 existing-action parameter extension 구현
- [x] Compatible layer inference 구현
- [x] Shortest call, invalid, ambiguous와 rematerialization tests
- [x] Primitive/public semantic, graphic, trace와 pixel equivalence

Gate B 승인 결과를 그대로 구현한다. Aggregate facade는 실제 wrapped leaf actions를 호출하고 removal은 one
immutable transition으로 owned state만 제거한다.

Compatible layer inference는 omitted `data`일 때만 current eligible layer 또는 하나뿐인 compatible layer를
사용한다. Explicit `data`, ambiguity와 source-specific aggregate/bin/stack policy는 inference 경계 밖에 둔다.
