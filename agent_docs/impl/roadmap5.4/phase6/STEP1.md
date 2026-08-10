# STEP 1 — Three-Model Expanded Comparison

## 진행 상태

- [x] 기존 16-task selection 보존
- [x] Frozen final-v3 corpus에서 8개 supported capability task 추가
- [x] 3 models × 4 conditions의 12-cell order를 48 blocks에 균형 배치
- [x] Nano pricing와 missing cache-write usage normalization 구현
- [x] 모든 model pair의 조건별 paired comparison 구현
- [x] 모든 model pair × A:B/C/D route interaction 구현
- [x] Exact plan, source hashes, call envelope와 rolling cost envelope 동결
- [x] 무과금 dry run과 repository regression 검증
- [x] R54-P6-A 준비

## Task 확장

기존 16 tasks는 Phase 5 결과와 직접 비교할 수 있도록 그대로 유지한다. 추가 8 tasks는 Attempt 8 결과 뒤 새로 작성하거나
선택하지 않고, 그보다 먼저 고정된 `compact-authoring-final-v3`의 supported corpus에서 가져왔다.

| Added task | Capability |
| --- | --- |
| `final3-04-histogram-svg` | Histogram + SVG |
| `final3-06-parallel-pdf` | Parallel coordinates + PDF |
| `final3-09-gradient-svg` | Gradient + logarithmic scale |
| `final3-11-tick-png` | Tick-based 1D distribution |
| `final3-16-window-png` | Filter + moving mean + temporal scale |
| `final3-19-jitter-png` | Jitter + opacity + legend layout |
| `final3-21-facet-png` | Facet + shared encoding/legend |
| `final3-24-interval-pdf` | Confidence interval + error bars + PDF |

최종 역할 분포는 supported 20, unsupported 2, needs-input 2다. Canvas, PNG, SVG와 PDF를 모두 포함한다.

## 균형 설계

각 `(task, repetition)` block은 Terra/Luna/Nano × A/B/C/D의 12 cells다. 24 tasks × 2 repetitions의 48 blocks에
12행 cyclic Latin square를 네 번 적용한다. 모든 cell은 block의 1~12번째 위치에 정확히 네 번 등장한다. 총 실행 수는
24 × 4 × 3 × 2 = **576 task-runs**다.

## Nano 가격·usage 경계

2026-08-10 공식 Standard short-context price는 GPT-5.4 Nano input `$0.20`, cached input `$0.02`, output `$1.25` per
million tokens이며 별도 cache-write price는 표에 없다. Runner는 실제 응답에 `cache_write_tokens`가 없으면 Nano에서만 0으로
정규화한다. 최악 input projection에는 공식 uncached input `$0.20`을 사용한다. 이를 별도 공식 write rate로 기록하지 않고
`uncached-input-fallback` basis로 보존한다. Terra/Luna의 explicit cache-write accounting은 바꾸지 않는다.

## 비용과 호출 envelope

| Boundary | Exact value |
| --- | ---: |
| Expected first-pass model responses | 1,308 |
| Maximum successful responses | 2,460 |
| Maximum provider retries | 72 |
| Maximum API request attempts | 2,532 |
| Expected standard / 10% conservative cost | `$16.6272` / `$18.28992` |
| Theoretical all-token-ceiling conservative cost | `$160.21632` |
| Rolling exposure hard cap | `$50` |

`$50`은 지출 목표가 아니다. Billed conservative cost, usage가 없는 failed request의 uncertainty reserve와 다음 request의
worst cost를 합친 exposure가 `$50`을 넘을 수 있으면 다음 request 전에 중단한다.

## 검증

| Evidence | Result |
| --- | --- |
| Route dry run | 96 / 96 pass |
| Canonical evaluator | 24 / 24 pass |
| Matrix construction | 576 / 576 unique cells, exact position balance |
| Focused v9 contracts | 6 / 6 pass |
| Normal suites | unit, contracts, charts, docs pass; gates has no active executable slice |
| Product coverage lower bound | lines 94.75%, branches 90.25%, functions 98.43%, critical floors 70 / 70 |
| Credential reads / external calls / spend | 0 / 0 / `$0` |

단일 `npm test` invocation은 현재 desktop command wrapper에서 종료 코드를 반환하지 않았다. 같은 canonical file set을 owning
suite별로 다시 실행해 모두 explicit exit 0을 확인했다. Product `src` tree와 기존 test corpus는 Phase 5 coverage checkpoint와
동일하고 새 v9 test만 추가되었으므로 기존 source coverage는 하한으로 보존된다.

자동 resume는 구현하지 않는다. In-flight request 도중 process가 끊기면 provider billing 여부를 알 수 없어 같은 task를
자동 재실행할 경우 비용과 표본을 중복시킬 수 있다. Transient request당 한 번의 bounded retry, task-local provider failure,
progress persistence와 3연속 provider failure circuit breaker는 그대로 유지한다.

## Attempt 9 중단

R54-P6-A 실행은 8 / 576 task-runs 뒤 첫 Nano response에서 `provider-response-identity-mismatch`로 중단됐다. Billed response의
usage와 cost는 장부에 반영됐지만 trace가 실제 returned model/service tier를 보존하지 않아 두 필드 중 원인을 구분할 수 없다.
결과와 원인 경계는 [`ATTEMPT9.md`](./ATTEMPT9.md)에 고정했다. Attempt 9를 resume하지 않으며 새 snapshot-pinned plan과 replacement
Gate 없이는 추가 external call을 열지 않는다.

## v10 replacement

새 state machine은 모든 billed trace에 requested/returned model과 service tier를 보존하고 두 mismatch stop을 분리한다. Nano의
비교 label은 유지하되 실제 request는 공식 snapshot `gpt-5.4-nano-2026-03-17`로 pin했다. Mock identity contracts, 96 routes,
24 canonical submissions와 265 contract tests가 모두 무과금으로 통과했다.

Replacement plan은 [`GATE_B.md`](./GATE_B.md)가 소유한다. Attempt 9의 partial cells를 재사용하지 않고 새 승인 시 같은 576 cells를
처음부터 실행한다.

## Attempt 10 중단

v10은 214 / 576 task-runs 뒤 provider-failed cells 3연속 circuit breaker로 중단됐다. 620 billed responses의 model/service-tier
identity는 모두 정확히 일치해 snapshot repair는 실제 provider에서 검증됐다. 마지막 cluster는 timeout 1건과 fetch failures 5건이며,
같은 시간 구간의 Terra A/B/C에 몰려 model과 temporal transport state를 분리할 수 없다.

원본, 비용과 causal boundary는 [`ATTEMPT10.md`](./ATTEMPT10.md)에 고정한다. R54-P6-B로 resume하지 않는다. 권장 후속안은 214
results와 전체 ledger를 carry forward하고 run position 215부터 남은 362 cells만 실행하는 별도 append-only plan이다.

## v11 continuation

v11은 Attempt 10의 exact SHA, 214 IDs/order, source ledger와 620 billed identities를 다시 계산한 뒤에만 열린다. Source의 circuit
count 3은 원본에 남기고 새 execution state만 human-reviewed reset 0으로 시작한다. Calls, attempts, retries, usage, cost, reserve와
exposure는 누적값 그대로다.

Mock continuation은 run 215부터 362 cells를 추가해 576 unique ordered cells를 복원했고 원본 object를 변경하지 않았다. 96 routes,
24 canonical submissions와 269 contract tests도 무과금으로 통과했다. Exact authorization은 [`GATE_C.md`](./GATE_C.md)가 소유한다.

## 공식 근거

- <https://developers.openai.com/api/docs/models/gpt-5.4-nano>
- <https://developers.openai.com/api/docs/pricing>
