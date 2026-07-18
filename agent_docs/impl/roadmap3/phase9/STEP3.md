# STEP 3 — Shared Offset Grammar and `encodeYOffset`

## 진행 상태

- [x] Channel-aware offset vocabulary and compatibility policy
- [x] Shared offset padding and range grammar
- [x] yOffset scale definition and resolution
- [x] Wrapped `encodeYOffset` action and exact trace
- [x] Explicit, inferred, reversed, padded and invalid coverage

`xOffset`과 `yOffset`은 하나의 pure offset policy를 사용한다. Channel definition이 parent category channel,
range orientation, bandwidth와 concrete placement를 결정한다. Public action은 semantic assignment, scale
resolution과 connected bar rematerialization을 wrapped actions로 조합한다.
