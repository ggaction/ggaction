# Gate R54-P6-B — Snapshot-Pinned Replacement Comparison

## Gate state

`approved`

Option A approved by the user on 2026-08-10.

Review checkpoint: `8807dced7c195cd1e5411509a8f30ed91a37f170`.

Product candidate: `4e211ba418cd437d7c66c4fb986fcc714cf579ea`.

Evaluator checkpoint: `cd65fd8e91481fafddfff90a2a432d32d9821022`.

Plan: `evaluation/compact-authoring-paid-comparison-v10/PLAN.json`.

Plan SHA-256: `48d8cdebf81bcefedef96148a20836c46fb483ddae8080aef46c013a20f3d950`.

Route oracle SHA-256: `8211f33c5a443649def1f72de6f92d943a260f3df89795032d498f5c87819816`.

## 왜 새 승인이 필요한가

R54-P6-A는 Attempt 9의 credential read와 external execution으로 소진됐다. 그 실행은 8 / 576 task-runs 뒤 first Nano response의
identity mismatch stop rule에서 중단됐고 자동 retry/resume하지 않았다. Billed conservative exposure `$0.090882825`는
[`ATTEMPT9.md`](./ATTEMPT9.md)에 별도 보존되어 있으며 이번 예산에 되돌려 쓰지 않는다.

v10은 partial result를 이어 붙이지 않는다. 동일한 24 tasks × A/B/C/D × 3 models × 2 repetitions의 **새 576-run matrix를
처음부터** 실행한다.

## 수리된 원인 경계

| Attempt 9 gap | v10 repair |
| --- | --- |
| Nano mutable alias를 요청 | 공식 current snapshot `gpt-5.4-nano-2026-03-17`을 request ID로 pin |
| Request/response model을 한 문자열 비교로만 처리 | requested/returned model을 response trace에 각각 보존 |
| Model과 service-tier mismatch를 한 오류로 합침 | 두 fatal stop label을 분리 |
| 실패 trace에서 실제 identity가 사라짐 | billed usage와 cost를 먼저 반영한 뒤 sanitized identity까지 progress에 저장 |
| 재현 가능한 원인별 mock이 없음 | snapshot success, model mismatch, service-tier mismatch 계약 검증 추가 |

Terra/Luna request ID, task, prompt, evaluator, route oracle, condition 의미, 순서, repetitions, retry policy와 비용 상한은 바꾸지
않았다. Nano의 비교 label은 `gpt-5.4-nano`로 유지하고 provider request만 snapshot으로 고정한다.

## 무과금 증거

| Evidence | Result |
| --- | --- |
| Provider identity mock contracts | snapshot success + model mismatch + service-tier mismatch pass |
| Identity failure accounting | billed usage, cost와 returned identity가 stop 전 progress에 보존됨 |
| Route dry run | 96 / 96 pass |
| Canonical strict evaluator | 24 / 24 pass |
| Full matrix construction | 576 / 576 pass |
| Contract suite | 265 / 265 pass |
| Credential reads / external calls / additional spend | 0 / 0 / `$0` |

## Option A — exact v10 replacement를 한 번 실행한다 (recommended)

| Item | Exact scope |
| --- | --- |
| Models | Terra alias, Luna alias, Nano snapshot; medium reasoning, low verbosity, default tier |
| Matrix | 24 fixed tasks × A/B/C/D × 3 models × 2 repetitions = 576 task-runs |
| Order | Attempt 9와 동일한 48 blocks의 12-cell cyclic Latin square |
| Expected first-pass responses | 1,308 |
| Maximum successful responses / API attempts | 2,460 / 2,532 |
| Provider retry | transient request당 1회, 전체 72회, delay 최대 30초 |
| Provider circuit breaker | provider-failed task-runs 3회 연속 |
| Response ceilings | knowledge 2,000; submission 8,000 output tokens |
| Expected standard / conservative cost | `$16.6272` / `$18.28992` |
| New rolling exposure hard cap | `$50` |
| Credential | 승인 뒤 이전에 식별된 단일 credential file 1회 read |

`$50`은 지출 목표가 아니다. Billed conservative cost, usage가 없는 failed request의 uncertainty reserve와 다음 request의 worst
cost 합이 `$50`을 넘을 수 있으면 다음 request 전에 중단한다. Attempt 9의 `$0.090882825`는 별도 과거 지출이며 새 cap에 포함해
상쇄하거나 재분류하지 않는다.

## Option B — 추가 유료 실행 없이 중단한다

Attempt 9와 무과금 수리 증거만 보존한다. Nano를 포함한 complete condition/model comparison은 만들지 않는다.

## Stop rules와 승인 효과

R54-P6-A와 동일한 task-local outcome, provider retry, circuit breaker, token/transport/call/request/exposure 경계를 유지한다.
추가로 returned model 또는 service tier가 요청 identity와 다르면 actual identity와 billed usage를 보존하고 전체 run을 즉시 중단한다.

Option A 승인은 위 exact candidate/evaluator/plan/oracle에 대한 credential 1회 read, v10 576 task-runs의 한 번 실행과 새 `$50`
rolling exposure만 연다. 중단 뒤 resume/retry, task·threshold·prompt 변경, 추가 repetition, 제품 변경, PR, merge, publish, deploy와
release는 열지 않는다.

## 승인 전 차단 범위

- Credential read
- External API call, provider retry와 additional spend
- v10 paid comparison execution
- PR, merge, publish, deploy와 release

## 공식 근거

- <https://developers.openai.com/api/docs/models/gpt-5.4-nano>
- <https://developers.openai.com/api/docs/pricing>
