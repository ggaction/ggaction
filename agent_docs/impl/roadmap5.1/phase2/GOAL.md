# Roadmap 5.1 Phase 2 — Top/Bottom Legend Lanes and Lifecycle

## 목표

Top/bottom edge의 여러 legend block을 horizontal collision에 따라 row로 packing한다. 같은 row의 title
baseline, graphical-element start와 12-pixel title-to-element gap을 통일하고 create/edit/remove, scale와 Canvas
replay가 authoring order와 무관하게 같은 final `graphicSpec`으로 수렴하도록 한다.

## 진행 상태

- [x] R51-P1-A 승인 — 2026-08-03
- [x] Pure horizontal-edge row packing 구현
- [x] Shared title baseline, element start와 12-pixel gap
- [x] Top continuous legend label placement normalization
- [x] Same-target와 independent-target deterministic ordering
- [x] Create/edit/remove/scale/Canvas order convergence
- [x] Atomic margin/Canvas overflow
- [x] Actual-data top/bottom visual Gate와 four-renderer parity
- [x] Full normal/coverage/docs/package verification
- [x] R51-P2-A replacement remote checkpoint
- [ ] R51-P2-A 사용자 approval

## Gate R51-P2-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.

### 승인 전 차단

- Phase 3 closeout와 Roadmap 완료 선언
- PR, merge, release, publish와 documentation deployment
