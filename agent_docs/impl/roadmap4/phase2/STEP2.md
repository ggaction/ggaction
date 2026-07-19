# Step 2 — Shared facade infrastructure

## 진행 상태

- [x] P2-A 승인 결과를 Planned contract와 ACTION_INDEX에 반영
- [x] `src/actions/charts/` registrar와 shared option normalization
- [x] deterministic data/id/coordinate resolution
- [x] whole-call preflight와 atomic failure tests
- [x] shared TypeScript option aliases
- [x] Roadmap 4 Phase 2 Gate artifact 경로

## 작업

Shared layer는 field shorthand를 canonical child args로 바꾸고 data/id를 안전하게 resolve한다. Mark나 scale
정책은 해석하지 않으며 child-owned validator/resolver를 preflight에 재사용한다. 이 단계에서 아직 완성 chart
facade를 public registration하지 않는다.
