# Gate R54-P5-J — Comprehensive v7 Paid Comparison

## Gate state

`approved`

Option A approved by the user on 2026-08-09.

Product candidate: `4e211ba418cd437d7c66c4fb986fcc714cf579ea`.

Evaluator checkpoint: `ee47a8c81d04e95f03590d482cc8d5c48f8e71ea`.

Plan: `evaluation/compact-authoring-paid-smoke-v7/PLAN.json`.

Plan SHA-256: `029927744c89a732c4a940fe869c9f3b31cf4cac4015b478dde25d58833d1e77`.

Inherited route oracle SHA-256: `27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4`.

Review checkpoint: `9abd6e31d7e940f851dd4c481ec82a6418542610`.

## 현재 근거

Attempt 6은 첫 A task의 네 번째 call에서 `incomplete/max_output_tokens`가 발생해 C MCP 조건까지 도달하지 못했다. 그러므로
그 중단을 MCP failure로 해석할 근거는 없다. v7은 알려진 model/protocol failure를 task-local outcome으로 기록하고 나머지
matrix를 계속해 A/B/C/D를 총체적으로 비교한다.

| Unpaid evidence | Result |
| --- | --- |
| Equal 3-submission opportunity and phase-specific ceilings | pass |
| B/C byte-equal knowledge contract | pass |
| Response status, billing-first ledger and task-local continuation | pass |
| Latin-square condition counterbalance | pass |
| All six paired comparisons and B:C MCP overhead summary | pass |
| Focused contracts | 18 / 18 pass |
| v7 route dry-run | 32 / 32 pass |
| Canonical strict evaluator | 8 / 8 pass |
| Full repository suite | 2,136 / 2,136 pass |
| Coverage | lines 94.74%, branches 90.26%, functions 98.43%, critical floors 70 / 70 |
| Credential reads / external calls / additional spend after Attempt 6 | 0 / 0 / `$0` |

## 결정 대상

### A — Comprehensive v7 paid comparison을 한 번 실행한다 (recommended)

| Item | Exact scope |
| --- | --- |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `ee47a8c81d04e95f03590d482cc8d5c48f8e71ea` |
| Plan | SHA-256 `029927744c89a732c4a940fe869c9f3b31cf4cac4015b478dde25d58833d1e77` |
| Route oracle | inherited v5 SHA-256 `27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4` |
| Model | `gpt-5.6-terra`, medium reasoning, low verbosity, default tier |
| Matrix | 8 fixed tasks × A/B/C/D × 1 repetition = 32 task-runs |
| Order | task별 Latin-square counterbalance |
| Submission opportunity | 각 task-run 최대 3회 |
| Expected calls when first submission passes | 74 |
| Absolute maximum calls | A 최대 5, B/C 최대 4, D 최대 4 또는 5; 전체 138 |
| Expected standard / conservative cost | `$2.304` / `$2.5344` |
| Calculated standard / conservative maximum | `$17.152` / `$18.8672` |
| Hard global stop | conservative ledger `< $19`; 다음 request가 cap을 넘길 수 있으면 호출 전 중단 |
| Response ceilings | knowledge 2,000; submission 8,000 output tokens |
| Task token ceilings | input 80,000; output 28,000 |
| Transport ceilings | 512 KiB/call; 2 MiB/task-run |
| Credential | previously identified single credential file, approval 뒤 1회 read |
| Automatic retry | transport/API 0; incomplete/protocol failure 0 |

최대 3 submissions는 자동 retry가 아니라 같은 실험 안에서 strict evaluator feedback을 받은 authoring attempts다. 첫 제출
성공률과 세 번 안의 최종 성공률을 모두 기록한다.

### B — 추가 유료 검증 없이 non-integration으로 종료한다

Attempt 6과 v7 unpaid repair를 보존하고 paid route comparison을 더 진행하지 않는다. MCP/direct/public-doc route의 실제 모델
성능과 overhead에 관해서는 결론을 내리지 않는다.

## 고정 비교 경계

- A public-doc baseline의 search ranking, 반환 URL, public docs와 one-read boundary는 수정하지 않았다.
- B direct resolver와 C local MCP는 byte-equal compact packet을 반환한다.
- D는 같은 packet에 task oracle이 지정한 경우만 one bounded fallback resource read를 더한다.
- Product candidate, 8 tasks, dataset, role, expected action plan, renderer wrapper와 strict evaluator는 이전 candidate와 동일하다.
- Known model/protocol/tool failure는 성공으로 재분류하지 않고 exact failure count에 남긴다.
- 한 repetition의 비교이므로 descriptive paired result만 보고 statistical superiority는 주장하지 않는다.

## 수집할 비교 결과

조건 A/B/C/D 각각과 모든 paired condition에 대해 다음을 계산한다.

- final pass rate, first-submission pass rate와 exact failure counts
- model calls, submission attempts, search/read/tool calls와 returned bytes
- input/cache-write/cached/output/reasoning/total tokens
- standard/conservative cost
- elapsed, time-to-valid, model/tool/evaluator latency
- B:C direct-vs-MCP local knowledge-tool latency와 나머지 paired delta

## 비용과 stop rules

2026-08-09 확인한 standard short-context 가격은 input `$2.00`, cached input `$0.20`, cache write `$2.50`, output `$12.00`
/ 1M tokens이다. 모든 pre-request cap과 결과 장부에는 regional processing 가능성을 반영한 1.1 multiplier를 적용한다.

- Expected standard: 32 × (input 12,000 + output 4,000) = `$2.304`
- Expected conservative: `$2.304 × 1.1 = $2.5344`
- Calculated standard maximum: 32 × (input 80,000 at cache-write rate + output 28,000) = `$17.152`
- Calculated conservative maximum: `$17.152 × 1.1 = $18.8672`
- Hard conservative cap: `$19`

Candidate, evaluator, plan, oracle, source hash, product tree, model 또는 service tier가 다르면 credential read 전에 중단한다.
Incomplete billing, unknown synchronous provider status, envelope 위반 또는 transport/API failure는 장부를 저장하고 전체 run을
중단한다. Known incomplete/failed/protocol/tool/evaluator outcome은 해당 task-run만 실패시키고 다음 entry를 계속한다.

## Approval effect

Option A 승인은 exact candidate/evaluator/plan에 대한 credential 1회 read, 32 task-runs의 단일 실행과 최대 `$19`
conservative spend만 연다. 추가 repetition, statistical evaluation, 제품 변경, PR, merge, publish, deploy와 release는 열지 않는다.

## 승인 전 차단 범위

- Credential read
- External model call과 additional spend
- v7 paid comparison execution
- 추가 repetition과 complete paid evaluation
- PR, merge, publish, deploy와 release
