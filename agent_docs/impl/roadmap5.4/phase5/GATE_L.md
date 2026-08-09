# Gate R54-P5-L — Provider-Resilient Terra/Luna Paid Comparison

## Gate state

`planned`

Review checkpoint: `pending`.

Product candidate: `4e211ba418cd437d7c66c4fb986fcc714cf579ea`.

Evaluator checkpoint: `39d35cefe750c513703e99cb3e088fc7065c401c`.

Plan: `evaluation/compact-authoring-paid-comparison-v8/PLAN.json`.

Plan SHA-256: `498cbbd01c3618cc5fc39cd57fe40a55c589a0f01f319e08fd1cfca19bd773a2`.

Route oracle SHA-256: `dc241f8b717ee2d80a81762e23e870a1fdf57215f15bd3a30e4292dc39dca6a1`.

## 현재 근거

Attempt 7은 10 / 32 task-runs와 local MCP 3 / 3 성공 뒤 한 번의 provider request-processing error로 중단됐다. v8은 transient
provider failure를 bounded retry와 task-local result로 분리하고, billing uncertainty reserve와 3-task circuit breaker를
추가했다. Terra/Luna, A/B/C/D, 두 repetitions를 같은 256-cell matrix에서 비교한다.

| Unpaid evidence | Result |
| --- | --- |
| Provider retry, reserve, retry-delay ceiling, circuit breaker | pass |
| 8-cell cyclic Latin-square balance | 모든 model-condition cell이 각 ordinal에 4회 |
| Route dry run | 64 / 64 pass |
| Canonical strict evaluator | 16 / 16 pass |
| Full matrix construction | 256 / 256 pass |
| Focused contracts | 33 / 33 pass |
| Full repository suite | 2,151 / 2,151 pass |
| Coverage | lines 94.75%, branches 90.25%, functions 98.43%, critical floors 70 / 70 |
| Credential reads / external calls / additional spend after Attempt 7 | 0 / 0 / `$0` |

## 결정 대상

### A — exact v8 Terra/Luna paid comparison을 한 번 실행한다 (recommended)

| Item | Exact scope |
| --- | --- |
| Models | `gpt-5.6-terra`, `gpt-5.6-luna`; medium reasoning, low verbosity, default tier |
| Matrix | 16 fixed tasks × A/B/C/D × 2 models × 2 repetitions = 256 task-runs |
| Order | 32 blocks의 8-cell cyclic Latin square |
| Submission opportunity | 각 task-run 최대 3회 |
| Expected first-pass responses | 584 |
| Maximum successful responses | 1,096 |
| Maximum API attempts | 1,128: successful responses 1,096 + provider retries 32 |
| Provider retry | transient request당 1회, 전체 32회, delay 최대 30초 |
| Provider circuit breaker | provider-failed task-runs 3회 연속 |
| Response ceilings | knowledge 2,000; submission 8,000 output tokens |
| Task ceilings | input 120,000; output 28,000 tokens; transport 3 MiB |
| Per-call boundary | request 512 KiB; timeout 180초 |
| Expected standard / conservative cost | `$10.1376` / `$11.15136` |
| Rolling exposure hard cap | `$30` |
| Credential | 이전에 식별된 단일 credential file, 승인 뒤 1회 read |

`$30`은 실제 billed conservative cost만 보는 cap이 아니다. Usage를 받지 못한 failed request의 uncertainty reserve와 다음
request의 worst cost까지 더한 exposure가 cap을 넘을 수 있으면 request 전에 중단한다. 이론상 전체 token ceiling 비용
`$98.50368`은 runaway 방지 계산일 뿐 실행 승인이 아니며, rolling `$30` cap이 먼저 적용된다.

### B — 추가 유료 검증 없이 non-integration으로 종료한다

Attempt 7과 v8 무과금 수리를 보존하고 paid route comparison을 더 진행하지 않는다. Terra/Luna 및 public docs/direct/MCP/fallback
경로의 실제 성능·비용·호출 수·시간 차이에 관해서는 결론을 내리지 않는다.

## 고정 비교와 기록 경계

- A public docs, B byte-equal direct packet, C local MCP packet, D explicit bounded fallback 의미를 바꾸지 않는다.
- Product candidate, knowledge, MCP server, public docs, task corpus, datasets와 renderer/evaluator 의미를 바꾸지 않는다.
- 각 모델의 A/B/C/D, 각 조건의 Terra:Luna, B:C, route-by-model interaction과 repetition stability를 모두 기록한다.
- First-pass와 final pass, submissions, calls, tokens, bytes, 비용, 시간과 exact failure counts를 모두 기록한다.
- Known model/protocol/tool/evaluator/provider outcome은 성공으로 재분류하지 않는다.
- Abort를 포함한 결과와 ledger를 새 immutable attempt로 보존한다. 승인 없이 자동 재실행하지 않는다.

## Stop rules

다음은 task-local provider failure 또는 known model/tool/evaluator outcome으로 남기고 허용된 matrix를 계속한다.

- transient request가 승인된 한 번의 retry 뒤에도 실패
- bounded incomplete/failed model response 또는 forced-function protocol noncompliance
- knowledge-tool failure 또는 strict evaluator failure

다음은 전체 run을 즉시 중단한다.

- provider-failed task-runs 3회 연속 또는 전체 provider retries 32회 소진
- 인증, 권한, quota, billing, invalid request 등 non-retryable provider failure
- product/evaluator/plan/oracle/source tree/model/service-tier drift
- incomplete billing usage 또는 unknown synchronous provider status
- request, transport, task token, total response/request 또는 rolling exposure envelope 위반

## 공식 가격·재시도 근거

- <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- <https://developers.openai.com/api/docs/models/gpt-5.6-luna>
- <https://developers.openai.com/api/docs/pricing>
- <https://developers.openai.com/api/docs/guides/rate-limits#retrying-with-exponential-backoff>

## Approval effect

Option A 승인은 위 exact candidate/evaluator/plan/oracle에 대한 credential 1회 read, 256 task-runs의 한 번 실행과 최대 `$30`
rolling exposure만 연다. 중단 뒤 retry, task·threshold·prompt 변경, 추가 repetition, 제품 변경, PR, merge, publish, deploy와 release는
열지 않는다.

## 승인 전 차단 범위

- Credential read
- External API call, provider retry와 additional spend
- v8 paid comparison execution
- PR, merge, publish, deploy와 release

