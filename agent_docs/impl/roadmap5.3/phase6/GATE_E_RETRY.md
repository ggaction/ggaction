# Gate R53-P6-E-Retry — Corrected One-Run B/C Paid Smoke

## Gate state

`proposed — explicit approval required`

Candidate behavior checkpoint: `060a13f1017485f2a19579ef640a768b86a63417`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 왜 별도 승인이 필요한가

첫 Gate E 실행은 B의 function schema를 provider가 model execution 전에 거부해 token과 비용이 0이었고, C는
시작되지 않았다. 비용이 없었더라도 승인된 B 요청 한 번은 이미 사용했으므로 같은 승인을 재사용하지 않는다.

수정은 공개 검색 계약을 바꾸지 않는다. 선택적인 `limit`는 계속 선택 사항이며, B의 structured search와 C에서 실제
MCP discovery로 얻은 search tool만 OpenAI에 non-strict schema로 전달한다. 모든 property가 required인 도구는 strict
상태를 유지한다.

## Exact retry scope

| 항목 | 고정값 |
| --- | --- |
| Task | `cars-scatter-origin` |
| Repetition | `r1` only |
| Conditions | B once, then C once |
| Maximum runs | 2 |
| Candidate commit metadata | `060a13f1017485f2a19579ef640a768b86a63417` |
| New isolated output root | `.artifacts/llm-eval/corrective-smoke-retry-060a13f1/` |
| Expected combined cost | $0.144 |
| Calculated token maximum | $0.312 |
| Hard caps | B $0.20 / C $0.20 / combined $0.40 |

Model, reasoning effort, verbosity, service tier, corpus, task, oracle, validation threshold, model-call limit, MCP-call limit,
token ceiling과 180초 timeout은 원래 [`GATE_E.md`](./GATE_E.md)와 동일하다.

## 승인 뒤 실행 순서

1. 기존 smoke plan과 첫 실행 evidence를 수정하지 않는다.
2. 위 candidate SHA와 새 output root만 허용하는 별도 retry plan/guard를 추가한다.
3. Credential read 전 scope/hash/cap/output-root 검증과 mocked B→C stop behavior를 테스트한다.
4. 전체 테스트와 `knowledge:check`를 통과한 retry guard checkpoint를 commit·push한다.
5. B를 한 번 실행하고 provider/model/hash/cap/timeout 오류가 없을 때만 C를 한 번 실행한다.
6. 두 trace, validation, token, elapsed time과 actual cost를 제출하고 full rerun 진입 여부를 다시 판단한다.

## Retry 통과 조건

- B와 C의 resolved model이 정확히 `gpt-5.6-terra`다.
- Provider, budget, timeout 오류가 없다.
- 각 trace가 `search_ggaction → exact read → submit_program`을 세 model call 안에 보인다.
- Search와 exact read는 각각 한 번이며 C의 MCP call은 8회를 넘지 않는다.
- B와 C 모두 `finalValid: true`이고 renderer evidence가 non-empty다.
- Sanitized evidence에 credential, raw provider response, reasoning, 전체 knowledge source 또는 submitted source가 없다.

하나라도 실패하면 즉시 중단하고 full rerun을 제안하지 않는다. 성공하더라도 48-run 성능 개선을 입증한 것은 아니므로
correctness/efficiency benefit claim은 금지한다.

## 이 승인이 포함하지 않는 범위

- 48-run B/C full rerun
- PR Ready 전환, merge 또는 main 검증
- Package publish, docs deployment 또는 release
- Correctness/efficiency benefit claim

## 승인 효과

명시적으로 승인하면 위 retry plan/guard의 무과금 구현·검증과, guard checkpoint push 뒤 B/C 각 한 번의 API 실행을
합계 최대 $0.40 범위에서 허용한다.
