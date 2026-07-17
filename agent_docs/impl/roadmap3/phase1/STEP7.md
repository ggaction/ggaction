# STEP 7 — Internal Rematerialization Naming and Edit Policy

## 진행 상태

- [x] Internal legend edit-like operations를 `rematerialize*`로 정리
- [x] Focused target resolution과 closed option validation 공유
- [x] Composite one-preflight/one-plan policy 구현
- [x] Behavior-preserving regression suite 통과

Gate B 이후 진행한다. Public action과 이름이 충돌하는 internal operation만 rename하며 unrelated refactor는
하지 않는다.

Composite facade는 전체 patch를 먼저 검증한 뒤 owned leaf action을 호출하며, 마지막에 하나의 ordered
rematerialization plan으로 semantic state와 concrete graphics를 수렴시킨다.
