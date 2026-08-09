# Gate R54-P6-C — Append-Only 362-Run Continuation

## Gate state

`approved`

Option A approved by the user on 2026-08-10.

Review checkpoint: `5d621d692efb3413ec8f26d326956bc9c6c4d152`.

Product candidate: `4e211ba418cd437d7c66c4fb986fcc714cf579ea`.

Evaluator checkpoint: `97029c53689e215a33376f724b41ee0734ca858d`.

Plan: `evaluation/compact-authoring-paid-comparison-v11/PLAN.json`.

Plan SHA-256: `fec1c8dce0b2adb89e8db7652d74cd59df95727545adcd1e4129c1b33b3df5a6`.

Base v10 plan SHA-256: `48d8cdebf81bcefedef96148a20836c46fb483ddae8080aef46c013a20f3d950`.

Continuation source SHA-256: `1fea9ad184df9bb2f0a80cc714e26fba542232bd7856bf3b8ebd268dddcc2381`.

Route oracle SHA-256: `8211f33c5a443649def1f72de6f92d943a260f3df89795032d498f5c87819816`.

## 현재 근거

Attempt 10은 214 / 576 cells를 완료한 뒤 한 시간 구간의 timeout/fetch failure가 세 task-runs에 연속 발생해 circuit breaker에서
중단됐다. 620 billed responses의 model/service-tier identity는 620 / 620 정확했고 Nano snapshot pinning은 실제 provider에서
검증됐다. 원본 결과, provider failures와 ledger는 [`ATTEMPT10.md`](./ATTEMPT10.md)에 불변 보존되어 있다.

R54-P6-B는 중단으로 소진됐으며 resume를 승인하지 않는다. 이 Gate는 별도 v11 plan으로 원본 214 cells를 수정하지 않고 남은
362 cells만 이어서 실행할지를 결정한다.

## 무과금 continuation 검증

| Evidence | Result |
| --- | --- |
| Source identity | Attempt 10 exact SHA, stop, 214 IDs와 run positions 일치 |
| Source ledger recomputation | calls, attempts, retries, usage, cost, reserve 모두 일치 |
| Source billed identity | 620 / 620 requested = returned |
| Circuit reset | source의 3은 보존하고 새 execution counter만 0 |
| Resume order | run 215 `final3-09-gradient-svg:r2:gpt-5.6-terra:D` |
| Synthetic continuation | 362 new + 214 preserved = 576 unique ordered cells |
| Route / canonical evaluator dry run | 96 / 96, 24 / 24 pass |
| Contract suite | 269 / 269 pass |
| Credential reads / external calls / additional spend | 0 / 0 / `$0` |

## Option A — run 215부터 append-only continuation을 한 번 실행한다 (recommended)

| Item | Exact scope |
| --- | --- |
| Preserved cells | Attempt 10 positions 1–214, rerun·수정 없음 |
| New cells | positions 215–576, 362 task-runs |
| Next cell | Gradient/SVG r2, Terra D |
| Models | Terra alias, Luna alias, Nano snapshot; 기존 설정 그대로 |
| Expected remaining responses | first-pass 827 |
| Maximum remaining successful responses | route/submission envelope 1,551 |
| Remaining global response / API attempt headroom | 1,840 / 1,898 |
| Remaining global provider retries | 64 of original 72 |
| Carried billed / uncertain / exposure | `$1.973158748` / `$1.29602` / `$3.269178748` |
| Expected additional standard / conservative cost | `$10.4712` / `$11.51832` |
| Expected cumulative exposure | 약 `$14.78750` including carried exposure |
| Cumulative rolling exposure hard cap | `$50`, reset하지 않음 |
| Credential | 승인 뒤 이전에 식별된 단일 credential file 1회 read |

현재 exposure, calls, attempts, retries와 usage를 0으로 초기화하지 않는다. 다음 request 전에 carried exposure와 worst request를
합쳐 `$50`을 넘을 수 있으면 중단한다. Provider-failed cells 6개를 재실행하거나 성공으로 바꾸지 않는다.

## Option B — continuation 없이 incomplete evidence로 closeout한다

Attempt 10의 identity repair evidence와 214 partial observations만 보존한다. Complete 576-cell condition/model comparison은 만들지
않는다.

## Stop rules와 승인 효과

기존 task-local outcomes, transient request당 1회 retry, provider-failed cells 3연속 circuit breaker, model/service identity,
usage, call/request/token/transport와 cumulative exposure stop을 그대로 유지한다. 새 실행에서 circuit breaker가 다시 발동하면 또
자동 resume하지 않는다.

Option A 승인은 exact v11 plan이 Attempt 10 source를 읽고 credential을 1회 읽어 remaining 362 cells를 한 번 실행하는 것만 연다.
원본 rerun, provider-failed cell retry, threshold·prompt·task 변경, 추가 repetition, 제품 변경, PR, merge, publish, deploy와 release는
열지 않는다.

## 승인 전 차단 범위

- Credential read
- External API call, provider retry와 additional spend
- v11 paid continuation execution
- PR, merge, publish, deploy와 release

## 공식 근거

- <https://developers.openai.com/api/docs/models/gpt-5.4-nano>
- <https://developers.openai.com/api/docs/pricing>
