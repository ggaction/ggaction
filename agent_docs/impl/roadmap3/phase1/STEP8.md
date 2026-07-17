# STEP 8 — Public Focused Edit and Removal Actions

## 진행 상태

- [ ] 19 direct actions 구현
- [ ] 4 existing-action parameter extension 구현
- [ ] Compatible layer inference 구현
- [ ] Shortest call, invalid, ambiguous와 rematerialization tests
- [ ] Primitive/public semantic, graphic, trace와 pixel equivalence

Gate B 승인 결과를 그대로 구현한다. Aggregate facade는 실제 wrapped leaf actions를 호출하고 removal은 one
immutable transition으로 owned state만 제거한다.
