# Roadmap 5.4 Phase 4 — Fresh Unpaid Evaluation

## 목표

Roadmap 5.3과 Phase 2 design fixture를 acceptance evidence에서 완전히 분리한 새 corpus를 동결한다. Development,
validation과 held-out split을 순서대로 검증하고, strict oracle·payload·package·installed MCP gate를 모두 통과한 경우에만
Phase 5의 작은 paid smoke 범위와 최대 비용을 제안한다.

## 진행 상태

- [ ] Fresh tasks 48개: development 18 / validation 15 / held-out 15
- [ ] Simple 23 / complex 25와 supported/unsupported constraint coverage 동결
- [ ] Dataset identity, task file, oracle policy와 SHA-256 manifest 동결
- [ ] Phase 2 design query overlap 0; Roadmap 5.3 corpus read/reuse 0
- [ ] Development split unpaid strict validation
- [ ] Candidate commit lock 뒤 validation split one-pass validation
- [ ] Validation 통과 뒤 held-out split one-pass final validation
- [ ] Closure, exact action/option, payload, fallback와 compile gates 통과
- [ ] Package/MCP/browser regression budgets 재검증
- [ ] Credential reads, external model calls와 spend 0 / 0 / $0
- [ ] Exact paid-smoke proposal and hard cost cap
- [ ] R54-P4-A explicit approval

## Predeclared unpaid acceptance

- Exact expected constraints/action IDs/required option keys/unresolved IDs: 100%
- Recognized constraint silent partial: 0
- Resolved-task docs fallback: 0
- Unresolved-task expected bounded fallback: 100%
- Generated call TypeScript errors: 0
- Task packet maximum ≤ 6,144 bytes; corpus median ≤ 4,096 bytes
- Package and browser ceilings: Phase 0 values unchanged

## Gate R54-P4-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다. 승인 전에는 credential read, external model call 또는
비용 지출을 시작하지 않는다.
