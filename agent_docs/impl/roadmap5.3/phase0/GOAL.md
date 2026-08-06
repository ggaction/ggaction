# Roadmap 5.3 Phase 0 — Baseline and Measurement Contract

## 목표

문서와 package를 바꾸기 전에 “현재 LLM이 ggaction을 얼마나 잘 쓰는가”와 이후 개선을 같은 조건에서 비교할
계약을 만든다. Phase 0은 knowledge를 대량 작성하는 단계가 아니라 측정 기준, source ownership과 비용 경계를
먼저 고정하는 단계다.

## 진행 상태

- [x] Starting `main` commit, package version와 action count 확인
- [x] Roadmap 5.3 branch와 top-level Phase/Gate dependency 작성
- [x] Current docs/action/example/contract route inventory 생성
- [x] Existing metadata와 executable-example gap classification
- [x] Versioned authoring/held-out task corpus와 correctness oracle 작성
- [x] A/B/C benchmark harness contract와 raw-result schema 작성
- [x] Provider/model/settings/repetitions, 예상 최대 비용과 acceptance threshold 제안
- [x] Metadata/recipe canonical source, generated outputs와 package inclusion 제안
- [ ] Focused and cumulative documentation-contract verification
- [ ] R53-P0-A remote checkpoint commit/push
- [ ] 사용자 R53-P0-A explicit approval
- [ ] Approved configuration으로 current-doc A baseline 실행
- [ ] R53-P0-B baseline/schema review package

## 현재 확인된 시작점

| 항목 | 값 |
| --- | --- |
| Starting commit | `9414d07179c9e7c6bbfdf00b762fc35de0ff25ec` |
| Package version | `0.0.8` |
| Action inventory | 173 |
| Branch | `codex/roadmap5-3-llm-friendly` |
| MCP distribution decision | Existing package bin `ggaction-mcp` |
| MCP transport/scope | Local `stdio`, read-only |

Current inventory와 해석은 [`CURRENT_KNOWLEDGE_INVENTORY.json`](./CURRENT_KNOWLEDGE_INVENTORY.json)과
[`BASELINE.md`](./BASELINE.md)가 소유한다.

## Gate R53-P0-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.

### 승인 전 차단

- 실제 또는 유료 LLM API 호출
- Public docs route와 generated knowledge 추가
- Action metadata와 recipe bulk 작성
- Search index, MCP source, dependency와 package bin 변경
- Phase 1 이후 작업

Phase 0의 local inventory, corpus/oracle 초안과 dry-run harness는 외부 호출 없이 작성할 수 있다.
