# Roadmap 5.1 Phase 0 — Exact Contract and Visual Target

## 목표

Same-edge multi-legend의 block identity, order, alignment, gap, overflow와 rematerialization contract를 확정하고
current/target concrete comparison을 R51-P0-V로 검토한다.

## 진행 상태

- [x] Current combined categorical/size 22-pixel offset 재현
- [x] Independent gradient/opacity와 categorical/size/opacity overlap 재현
- [x] Shared lane ownership, deterministic order와 non-goal 제안
- [x] Two before/after primitive variants와 independent coordinates
- [x] Canvas/SVG/PNG/PDF review artifacts와 focused verification
- [x] R51-P0-V remote checkpoint
- [ ] 사용자 visual approval

## Gate R51-P0-V

Canonical review record는 [`GATE_V.md`](./GATE_V.md)가 소유한다.

### 승인 전 차단

- Runtime legend layout/materialization source 변경
- Current contracts, architecture와 public docs의 implemented 상태 변경
- Stable chart oracle와 approved artifacts 교체
