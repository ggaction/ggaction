# Roadmap 5.4 Phase 0 — Baseline and Contract

## 목표

Compact knowledge를 구현하기 전에 scientific isolation, payload/package budget, public MCP surface와 평가 기준을
고정한다. 쉽게 말하면 “얼마나 작아야 하는가”, “한 번의 lookup이 무엇을 답해야 하는가”, “어떤 package 비용까지
허용하는가”를 먼저 승인받는 단계다.

## 진행 상태

- [x] Clean `main` commit, package `0.0.8`와 173-action baseline 확인
- [x] Roadmap 5.3 correctness/efficiency/package negative result 요약
- [x] Frozen corpus와 새 development/validation/held-out corpus isolation 정의
- [x] Compact authoring card와 task packet recommended contract 작성
- [x] Response, package와 installed boundary recommended budget 작성
- [x] Local stdio MCP, one-tool surface와 docs fallback policy 작성
- [x] Offline and staged paid evaluation policy 작성
- [x] Agent-documentation verification — contract suite 167 / 167 pass
- [x] Remote Gate review target — `110245b9335082946dd039ee6f81325d3ef65ae5`
- [x] R54-P0-A explicit approval — 2026-08-08

## Gate R54-P0-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.

### 승인 전 차단

- Knowledge/action-card generator와 source files
- Intent taxonomy, resolver, task packet과 search implementation
- MCP executable, SDK dependency와 package files
- Public LLM docs와 generated knowledge
- Evaluation corpus, credential read와 external model call
