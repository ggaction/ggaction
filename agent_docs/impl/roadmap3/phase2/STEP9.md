# STEP 9 — Interaction, Revision and Compatibility Matrix

## 진행 상태

- [ ] Canvas size/margin revision
- [ ] Scale domain/range/reverse revision
- [ ] Data and mark filtering
- [ ] Selection/highlight and appearance encodings
- [ ] Unsupported Polar guides explicit error

Auto radial range는 Canvas에 맞춰 다시 resolve한다. Explicit radial range는 보존하며 새 bounds를 벗어나면
state를 바꾸기 전에 명확한 error를 낸다.
