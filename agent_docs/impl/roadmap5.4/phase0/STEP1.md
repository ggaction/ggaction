# Phase 0 Step 1 — Lock Compact Delivery Contract

## 진행 상태

- [x] Product baseline and failed-candidate boundary recorded
- [x] Default payload and package budgets proposed
- [x] Compact card and multi-intent task packet shape proposed
- [x] Same-package stop rule and package-boundary fallback proposed
- [x] Fresh corpus and staged paid evaluation separation proposed
- [x] R54-P0-A review package verified — contract suite 167 / 167 pass
- [x] Review target committed for remote push — `110245b9335082946dd039ee6f81325d3ef65ae5`
- [ ] User approval

## 작업

[`BASELINE.md`](./BASELINE.md)의 product/evidence identity를 고정하고 [`GATE_A.md`](./GATE_A.md)의 recommended
decisions를 검토한다. Approval 전에는 roadmap documentation 외의 implementation file을 만들거나 Roadmap 5.3
artifact를 가져오지 않는다.

## 완료 조건

- Roadmap/index/history/navigation consistency tests pass.
- Gate package가 exact clean-main baseline, budgets, public boundary와 blocked work를 self-contained하게 설명한다.
- Verified commit이 remote `codex/roadmap5-4-compact-knowledge`에 push된다.
- 사용자가 R54-P0-A를 명시적으로 승인하기 전 Phase 1로 이동하지 않는다.
