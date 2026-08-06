# Roadmap 5.3 Phase 6 — Evaluation, Integration, and Closeout

## 목표

Phase 0에서 고정한 current-doc A 기준선과 Phase 2~5에서 만든 structured knowledge(B), local MCP(C)를 같은
model, corpus, 반복 수와 판정기로 비교한다. 결과를 본 뒤 기준을 바꾸지 않으며, 통과한 경우에만 LLM-friendly 개선의
효과를 주장한다.

## 진행 상태

- [x] R53-P5-A explicit approval and Phase 6 activation
- [x] Current official model role and pricing verification
- [x] Exact B/C model, repetitions and spend proposal
- [ ] R53-P6-A explicit approval
- [ ] Paid Condition B and C runs
- [ ] Aggregate, failure analysis and acceptance decision
- [ ] Integration candidate synchronization and cumulative verification
- [ ] R53-P6-B explicit approval
- [ ] Separately authorized PR preparation and merge
- [ ] Exact merged-main verification and R53-Exit approval

## 고정 경계

- R53-P6-A 전에는 external model call을 실행하지 않는다.
- Phase 0의 task, dataset, oracle, shuffle seed, limits와 acceptance threshold를 바꾸지 않는다.
- B/C는 A와 같은 model/settings를 사용한다. Model identity가 달라지면 비교를 중단한다.
- Spend cap에 도달하면 새 요청을 시작하지 않고, 불완전 결과를 통과로 해석하지 않는다.
- PR Ready, merge, package publish, docs deploy와 release는 각각 별도 승인 대상이다.

## Gates

- [`GATE_A.md`](./GATE_A.md) — exact paid-run proposal
- [`GATE_B.md`](./GATE_B.md) — A/B/C result와 integration candidate
- [`GATE_EXIT.md`](./GATE_EXIT.md) — exact merged-main evidence와 Roadmap closeout
