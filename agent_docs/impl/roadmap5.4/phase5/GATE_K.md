# Gate R54-P5-K — Provider-Resilient Dual-Model Comparison Design

## Gate state

`approved`

Approved by the user on 2026-08-09.

Decision checkpoint: `e29e1396a3e2ac99e09ac83f39f96ddf37d41ec2`.

## 승인된 목표

Attempt 7에서 확인된 `한 번의 provider request failure = 전체 matrix 중단` 정책을 수리하고, Terra만 사용한 8-task smoke를
Terra/Luna의 더 큰 factor comparison으로 확장한다. Product candidate, compact knowledge, MCP behavior, public docs와 strict
evaluator 의미는 변경하지 않는다.

## 고정 실험 크기

| Factor | Scope |
| --- | --- |
| Tasks | 16 |
| Knowledge conditions | A public docs, B direct resolver, C local MCP, D MCP + bounded fallback |
| Models | `gpt-5.6-terra`, `gpt-5.6-luna` |
| Repetitions | 2 |
| Total task-runs | 16 × 4 × 2 × 2 = 256 |
| Submission opportunities | 각 task-run 최대 3 |
| Expected first-pass model responses | 584 |
| Maximum successful model responses | 1,096 |
| Maximum provider retries | request당 1, 전체 32 |
| Maximum API request attempts | 1,128 |

16 tasks는 기존 v7의 8개를 모두 보존하고 8개를 추가한다.

| Stratum | Tasks |
| --- | --- |
| Simple | `final3-01-scatter-svg`, `final3-02-line-pdf`, `final3-07-box-canvas`, `final3-13-arc-pdf` |
| Complex | `final3-03-bars-png`, `final3-05-heatmap-png`, `final3-08-violin-canvas`, `final3-12-rule-canvas`, `final3-15-regression-svg`, `final3-18-raw-bars-canvas`, `final3-22-composition-svg`, `final3-23-labels-png` |
| Policy | `final3-27-geo`, `final3-28-animation` |
| Decision | `final3-37-rule-endpoint`, `final3-38-scale-consumer` |

이 표본은 Canvas/PNG/SVG/PDF, supported/unsupported/needs-input, simple/complex, direct MCP와 explicit fallback을 모두 포함한다.

## Provider failure 정책

### Retryable request failure

Response와 billing usage를 받기 전에 발생한 다음 failure만 같은 exact request를 최대 1회 재시도한다.

- HTTP `408`, `409`, `429`, `500`, `502`, `503`, `504`
- Network failure 또는 timeout

`Retry-After`가 있으면 이를 최소 대기로 사용하고, 없으면 짧은 bounded exponential backoff와 jitter를 사용한다. Quota,
billing, authentication, permission, invalid request와 그 밖의 action-required error는 재시도하지 않고 experiment-integrity stop으로
처리한다.

### Task-local continuation과 circuit breaker

- Retryable request가 두 번 모두 실패하면 해당 task-run을 `provider-request-failure`로 기록하고 다음 matrix entry를 실행한다.
- Provider request failure로 끝난 task-runs가 3개 연속이면 provider outage로 판단하고 전체 run을 중단한다.
- 어느 task-run이든 provider request failure가 아닌 결과를 반환하면 consecutive counter를 0으로 되돌린다.
- Model incomplete, model protocol noncompliance, knowledge-tool failure와 strict evaluator failure는 provider retry 대상이 아니다.
- 전체 provider retries가 32를 소진하면 experiment-integrity stop을 발동한다.

### Billing uncertainty reserve

Billing usage 없이 실패한 API request도 실제 청구 가능성을 0으로 가정하지 않는다. 각 failed attempt 직전 계산한 conservative
worst-request cost를 `uncertainCostReserveUsd`에 누적하고 해제하지 않는다.

Hard-cap 판정은 다음 exposure를 사용한다.

`billed conservative cost + uncertain cost reserve + next request worst cost`

결과는 billed standard cost, billed conservative cost, uncertainty reserve와 total exposure를 분리해서 보여준다.

## 순서와 비교 설계

각 `(task, repetition)` block에는 8개 `model × condition` cells가 있다. 32 blocks에 8-row cyclic Latin square를 네 번
적용해 모든 cell이 block 내 1~8번째 위치에 정확히 네 번 등장하게 한다. Terra/Luna와 A/B/C/D 어느 쪽도 항상 먼저 실행되지
않는다.

집계 단위는 `(task, repetition)`이다.

- 모델별 A/B/C/D pass, first-pass, correction, token, cost와 latency
- 조건별 Terra:Luna paired difference
- 각 모델의 B:C direct-vs-MCP overhead
- `compact route - public docs` 개선 폭의 Terra:Luna difference-in-differences
- exact model/protocol/tool/evaluator/provider failure counts
- billed cost와 uncertainty exposure

두 repetitions는 variance를 관측하기 위한 최소 반복이며 statistical superiority를 보장하지 않는다.

## 가격과 잠정 실행 envelope

2026-08-09 공식 Standard short-context 가격은 다음과 같다.

| Model | Input | Cached | Cache write | Output |
| --- | ---: | ---: | ---: | ---: |
| `gpt-5.6-terra` | `$2.00` | `$0.20` | `$2.50` | `$12.00` |
| `gpt-5.6-luna` | `$0.20` | `$0.02` | `$0.25` | `$1.20` |

기존 first-pass token projection을 적용하면 standard expected cost는 `$10.1376`, 10% uplift conservative expected cost는
`$11.15136`이다. Hard cap 제안은 `$30`이다. Exact candidate/evaluator/plan hash와 pre-request maximum 계산은 구현·무과금
검증 뒤 R54-P5-L에서 별도로 승인받는다.

## 공식 근거

- <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- <https://developers.openai.com/api/docs/models/gpt-5.6-luna>
- <https://developers.openai.com/api/docs/pricing>
- <https://developers.openai.com/api/docs/guides/rate-limits#retrying-with-exponential-backoff>

## 이 Gate가 열지 않는 것

- Credential read
- External API call, provider retry 또는 additional spend
- Paid comparison execution
- Product, knowledge, MCP server 또는 public docs 변경
- PR, merge, publish, deploy와 release
