# Roadmap 2 — Phase 9 Step 9: Path and Rule Integration

## 목표

Approved Gate C를 public flow로 구현하고 line/area/rule selection/highlight를 같은 dispatcher에 통합한다.

## 진행 상태

- [ ] Line series field selection and default/explicit highlight recipe
- [ ] Existing `editLineMark` behavior remains whole-resource and compatible
- [ ] Area series selection with fill/stroke/opacity overrides
- [ ] Rule item selection with stroke/width/dash overrides
- [ ] Unsupported multi-valued path channel reduction errors
- [ ] Path/rule logical offsets and command/endpoint translation
- [ ] Curve, group, scale and Canvas rematerialization stability
- [ ] Primitive/public exact Gate C equivalence
- [ ] Area/rule focused mechanical coverage
- [ ] STEP status, conceptual commit and push

## 완료 조건

Point, bar, path and rule recipes use one selection protocol while retaining type-specific property validation.
