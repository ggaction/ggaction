# Roadmap 5.1 Phase 1 — Right/Left Shared Legend Lane

## 목표

Right/left edge의 모든 active legend block을 하나의 lane owner가 배치하도록 구현한다. Approved Phase 0의
title-start, symbol-center, label-start columns와 24 logical-pixel inter-block gap을 runtime `graphicSpec`으로
만들고 create/edit/remove/Canvas/scale rematerialization이 같은 결과로 수렴하게 한다.

## 진행 상태

- [x] R51-P0-V exact visual target 승인 — 2026-08-03
- [x] Pure side-lane block measurement/order/placement 구현
- [x] Categorical, size, gradient, interval, opacity와 stroke-width intrinsic block integration
- [x] Combined same-target와 independent-target deterministic order
- [x] Right/left common columns, 24-pixel gap와 atomic margin overflow
- [x] Create/edit/remove/Canvas/scale convergence tests
- [x] Approved Gate comparison과 runtime exact parity
- [x] Full normal/render/package verification
- [x] R51-P1-A remote checkpoint
- [ ] R51-P1-A 사용자 approval

## Gate R51-P1-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.

### 승인 전 차단

- Top/bottom multi-block lane implementation
- Phase 2 lifecycle expansion
- Current contract/architecture의 implemented-state promotion beyond Phase 1
- PR, merge, release, publish와 documentation deployment
