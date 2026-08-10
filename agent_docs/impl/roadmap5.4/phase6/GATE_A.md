# Gate R54-P6-A — Expanded Terra/Luna/Nano Paid Comparison

## Gate state

`approved`

Option A approved by the user on 2026-08-10.

Authorization consumed by Attempt 9. The run stopped at 8 / 576 task-runs without retry or resume. This Gate does not authorize another
credential read or external call; see [`ATTEMPT9.md`](./ATTEMPT9.md).

Review checkpoint: `6cfaa3254eb5a3aff95aca303f4ef07dea2ab7d5`.

Product candidate: `4e211ba418cd437d7c66c4fb986fcc714cf579ea`.

Evaluator checkpoint: `fb6044c4f7ba55a11bbc9e97991ceb3d4f815c7f`.

Plan: `evaluation/compact-authoring-paid-comparison-v9/PLAN.json`.

Plan SHA-256: `86eeb648ab0c91a04148e472d100ad19ca06e7d993e6c3d1353862e8319bdc55`.

Route oracle SHA-256: `8211f33c5a443649def1f72de6f92d943a260f3df89795032d498f5c87819816`.

## 현재 근거

Phase 5 Attempt 8은 Terra와 Luna가 전체 100 / 128로 같은 final pass를 내고, compact routes에서는 Luna 95 / 96,
Terra 93 / 96임을 보였다. 이번 Gate는 결과를 다시 분류하지 않고 GPT-5.4 Nano와 8개 추가 capability tasks를 포함해
compact knowledge가 더 작은 모델의 하한을 얼마나 낮추는지 확인한다.

| Unpaid evidence | Result |
| --- | --- |
| 12-cell cyclic Latin-square balance | 모든 model-condition cell이 ordinal 1–12에 정확히 4회 |
| Route dry run | 96 / 96 pass |
| Canonical strict evaluator | 24 / 24 pass |
| Full matrix construction | 576 / 576 pass |
| Focused v9 contracts | 6 / 6 pass |
| Canonical normal suite partitions | unit/contracts/charts/docs explicit exit 0; no active gate tests |
| Product coverage lower bound | lines 94.75%, branches 90.25%, functions 98.43%, critical floors 70 / 70 |
| Credential reads / external calls / spend | 0 / 0 / `$0` |

## 결정 대상

### A — exact v9 expanded comparison을 한 번 실행한다 (recommended)

| Item | Exact scope |
| --- | --- |
| Models | `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.4-nano`; medium reasoning, low verbosity, default tier |
| Matrix | 24 fixed tasks × A/B/C/D × 3 models × 2 repetitions = 576 task-runs |
| Order | 48 blocks의 12-cell cyclic Latin square |
| Submission opportunity | task-run당 최대 3회 |
| Expected first-pass responses | 1,308 |
| Maximum successful responses | 2,460 |
| Maximum API attempts | 2,532: successful responses 2,460 + provider retries 72 |
| Provider retry | transient request당 1회, 전체 72회, delay 최대 30초 |
| Provider circuit breaker | provider-failed task-runs 3회 연속 |
| Response ceilings | knowledge 2,000; submission 8,000 output tokens |
| Task ceilings | input 120,000; output 28,000 tokens; transport 3 MiB |
| Expected standard / conservative cost | `$16.6272` / `$18.28992` |
| Rolling exposure hard cap | `$50` |
| Credential | 이전에 식별된 단일 credential file, 승인 뒤 1회 read |

Runner는 billed conservative cost, uncertainty reserve와 다음 request worst cost의 합이 `$50`을 넘을 수 있으면 요청 전에
중단한다. 이론상 전체 token ceiling `$160.21632`은 runaway 검증값이며 승인된 지출이 아니다.

### B — 추가 유료 검증 없이 Phase 5 결론으로 closeout한다

Terra/Luna 결과와 v9 무과금 evaluator를 보존하고 Nano external comparison은 실행하지 않는다. 더 작은 모델의 조건별
correctness, calls, tokens, latency와 cost에 관해서는 결론을 내리지 않는다.

## 고정 비교와 기록 경계

- 기존 16 tasks와 추가 8 tasks, datasets, role, renderer와 strict evaluator를 바꾸지 않는다.
- A public docs, B direct packet, C local MCP, D explicit fallback 의미를 바꾸지 않는다.
- 각 모델의 A/B/C/D, 각 조건의 세 model pairs, B:C와 모든 model-pair route interaction을 기록한다.
- First-pass/final pass, submissions, calls, tokens, bytes, cost, time와 exact failure counts를 기록한다.
- Abort를 포함한 결과와 ledger를 immutable attempt로 보존하고 승인 없이 자동 resume하지 않는다.

## Stop rules

다음은 task-local outcome으로 남기고 matrix를 계속한다.

- transient request가 승인된 한 번의 retry 뒤에도 실패
- bounded incomplete/failed response 또는 forced-function protocol noncompliance
- knowledge-tool 또는 strict evaluator failure

다음은 전체 run을 즉시 중단한다.

- provider-failed task-runs 3회 연속 또는 provider retry 72회 소진
- authentication, permission, quota, billing 또는 invalid-request failure
- product/evaluator/plan/oracle/source/model/service-tier drift
- incomplete billing usage 또는 unknown synchronous provider status
- request, transport, task token, total response/request 또는 rolling exposure envelope 위반

## Approval effect

Option A 승인은 위 exact candidate/evaluator/plan/oracle에 대한 credential 1회 read, 576 task-runs의 한 번 실행과 최대 `$50`
rolling exposure만 연다. 중단 뒤 resume/retry, task·threshold·prompt 변경, 추가 repetition, 제품 변경, PR, merge, publish,
deploy와 release는 열지 않는다.

## 승인 전 차단 범위

- Credential read
- External API call, provider retry와 additional spend
- v9 paid comparison execution
- PR, merge, publish, deploy와 release

## 공식 근거

- <https://developers.openai.com/api/docs/models/gpt-5.4-nano>
- <https://developers.openai.com/api/docs/pricing>
