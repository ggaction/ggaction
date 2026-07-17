# STEP 1 — Phase Contract, Inventory and Gate B Targets

## 진행 상태

- [ ] Phase 1 Planned assignment exact set 고정
- [ ] Focused action signature와 inference/error policy 확정
- [ ] Gate B visual variant manifest 작성
- [ ] Gate 전 runtime/public API 불변 contract test 추가

## 구현

`ACTION_INDEX`의 Phase 1 배정 19 direct actions, 4 extensions와 5 capabilities를 exact set으로 검증한다.
Exact proposed call chain은 phase-local manifest가 소유하며 이 문서는 의미와 순서를 설명한다.

Legend target은 generated guide ID가 아니라 owning mark target을 사용한다. Axis/grid facade는 existing leaf
edit action을 aggregate한다. Composite edit는 one preflight와 one final materialization plan을 사용한다.
Removal은 missing/ambiguous target을 오류로 처리하고 complete cleanup 뒤 recreate를 허용한다.
