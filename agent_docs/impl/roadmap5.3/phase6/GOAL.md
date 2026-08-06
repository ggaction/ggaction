# Roadmap 5.3 Phase 6 — Evaluation, Integration, and Closeout

## 목표

Phase 0에서 고정한 current-doc A 기준선과 Phase 2~5에서 만든 structured knowledge(B), local MCP(C)를 같은
model, corpus, 반복 수와 판정기로 비교한다. 결과를 본 뒤 기준을 바꾸지 않으며, 통과한 경우에만 LLM-friendly 개선의
효과를 주장한다.

## 진행 상태

- [x] R53-P5-A explicit approval and Phase 6 activation
- [x] Current official model role and pricing verification
- [x] Exact B/C model, repetitions and spend proposal
- [x] R53-P6-A explicit approval
- [x] Paid Condition B and C runs
- [x] Aggregate, failure analysis and acceptance decision
- [x] Failed-candidate evidence and public benefit-claim boundary
- [x] Cumulative product/package verification
- [x] R53-P6-B remote checkpoint
- [x] R53-P6-B explicit approval of failed evidence and non-integration
- [x] Root-cause analysis across condition isolation, retrieval, payload, MCP surface and tool loop
- [x] Corrective knowledge-delivery contract prepared for review
- [x] R53-P6-C corrective contract approval
- [x] Generated knowledge/search v2 and evaluation-adapter correction
- [x] R53-P6-D complete unpaid corrective evidence approval
- [x] R53-P6-E exact one-run B/C paid smoke approval
- [x] Smoke-only guard and first paid-smoke attempt stopped safely before C
- [x] Zero-cost provider-schema failure analysis and compatible schema correction
- [x] R53-P6-E-Retry explicit approval
- [x] Corrected retry guard, paid B/C smoke and result review
- [x] Exact retrieval success and self-contained recipe payload failure isolated
- [x] R53-P6-F executable-recipe correction approval
- [x] Self-contained recipe implementation and complete unpaid evidence
- [x] R53-P6-F completion approval
- [x] R53-P6-G executable-recipe paid-smoke approval
- [x] Guarded B/C smoke and result review
- [ ] Separately authorized full B/C paid rerun and result decision
- [ ] Separately authorized PR preparation and merge
- [ ] Exact merged-main verification and R53-Exit approval

## 고정 경계

- R53-P6-A 전에는 external model call을 실행하지 않는다.
- Phase 0의 task, dataset, oracle, shuffle seed, limits와 acceptance threshold를 바꾸지 않는다.
- B/C는 A와 같은 model/settings를 사용한다. Model identity가 달라지면 비교를 중단한다.
- Spend cap에 도달하면 새 요청을 시작하지 않고, 불완전 결과를 통과로 해석하지 않는다.
- Acceptance를 통과하지 못한 candidate는 PR/merge 대상으로 제안하거나 LLM benefit을 주장하지 않는다.
- PR Ready, merge, package publish, docs deploy와 release는 각각 별도 승인 대상이다.

## Gates

- [`GATE_A.md`](./GATE_A.md) — exact paid-run proposal
- [`GATE_B.md`](./GATE_B.md) — A/B/C result와 integration candidate
- [`GATE_C.md`](./GATE_C.md) — corrective knowledge delivery와 evaluation isolation contract
- [`GATE_D.md`](./GATE_D.md) — complete unpaid corrective evidence와 paid-smoke 진입 판단
- [`GATE_E.md`](./GATE_E.md) — exact one-run B/C paid smoke와 spend ceiling
- [`GATE_E_RETRY.md`](./GATE_E_RETRY.md) — provider-schema correction 뒤 별도 B/C smoke 재시도
- [`GATE_F.md`](./GATE_F.md) — self-contained executable recipe correction과 무과금 증거
- [`GATE_G.md`](./GATE_G.md) — executable recipe의 exact B/C paid smoke와 $0.20 hard cap
- [`GATE_EXIT.md`](./GATE_EXIT.md) — exact merged-main evidence와 Roadmap closeout
