# STEP 4 — Composite Owner Edit Primitive Variants

## 진행 상태

- [ ] Error bar owner edit target
- [ ] Error band와 lower/upper boundary edit target
- [ ] Regression statistical/component edit target
- [ ] Box plot statistical/component edit target
- [ ] Derived provenance와 final graphic hierarchy assertions

## 구현

Appearance-only patch는 current derived rows를 유지한다. Statistical patch는 새 deterministic rows를
사용하고 every owned component를 같은 revision에 연결한다. Generated child IDs는 primitive verification에만
사용하며 target public call chain에는 노출하지 않는다.
