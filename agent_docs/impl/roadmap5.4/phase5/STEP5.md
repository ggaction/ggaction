# STEP 5 — Provider-Resilient Dual-Model Comparison

## 진행 상태

- [x] Attempt 7 provider request failure를 MCP·모델·strict evaluator failure와 분리
- [x] request당 1회, 전체 32회의 bounded provider retry 구현
- [x] 실제 재요청을 보낼 때만 retry ledger를 증가시키는 회계 구현
- [x] `Retry-After`를 존중하되 30초를 넘으면 기다리지 않는 task-local failure 구현
- [x] billing usage 없는 failed request의 conservative uncertainty reserve 구현
- [x] 3회 연속 provider-failed task-runs circuit breaker 구현
- [x] Terra/Luna와 A/B/C/D를 함께 counterbalance하는 256-cell matrix 구현
- [x] 모델별·경로별·반복별·상호작용 비교와 exact failure 집계 구현
- [x] 16-task route oracle와 strict evaluator 무과금 검증
- [x] exact v8 plan과 evaluator checkpoint 고정
- [x] R54-P5-L review package 준비

## 근본 수리

Attempt 7은 local MCP에 도달해 3 / 3 성공한 뒤, 이후 A public-doc task의 provider request-processing error 한 번 때문에
32-cell matrix 전체가 중단됐다. 즉 직접 원인은 MCP가 아니라 runner가 provider transport failure를 experiment-wide integrity
failure와 같은 것으로 취급한 상태 경계였다.

v8은 response를 받지 못한 transient request failure만 같은 exact request로 한 번 재시도한다. 재시도도 실패하면 그 task-run을
`provider-request-failure`로 남기고 다음 cell을 계속한다. 세 task-runs가 연속으로 provider failure로 끝날 때만 outage circuit
breaker가 전체 run을 중단한다. 인증·권한·quota·billing·invalid request처럼 사용자의 조치가 필요한 failure는 재시도하지 않고
즉시 중단한다.

재시도 회계는 실제 request 직전에만 증가한다. 첫 failed request의 과금 여부를 알 수 없으므로 해당 request의 conservative
worst cost를 uncertainty reserve로 유지하며, 다음 request 전 hard-cap 계산에도 포함한다. `Retry-After`가 30초를 넘으면 긴 대기를
강행하지 않고 해당 task-run을 실패로 기록한다.

## 확장된 비교 설계

| Factor | Fixed scope |
| --- | --- |
| Tasks | 16: supported 12, unsupported 2, needs-input 2 |
| Render targets | Canvas, PNG, SVG, PDF |
| Knowledge conditions | A public docs, B direct resolver, C local MCP, D MCP + bounded fallback |
| Models | `gpt-5.6-terra`, `gpt-5.6-luna` |
| Repetitions | 2 |
| Total task-runs | 16 × 4 × 2 × 2 = 256 |

각 `(task, repetition)` block에는 8개 `model × condition` cell이 있다. 8행 cyclic Latin square를 32 blocks에 네 번
적용해 모든 cell이 block 안의 1~8번째 위치에 정확히 네 번 등장한다. 따라서 특정 모델이나 지식 경로가 항상 앞서 실행되는
시간 순서 편향을 피한다.

결과는 다음을 함께 비교한다.

- 각 모델 안의 A/B/C/D와 direct-vs-MCP B:C
- 각 조건 안의 Terra:Luna
- `compact route - public docs` 개선 폭의 Terra:Luna difference-in-differences
- 두 repetitions의 pass, token, cost, latency 안정성
- provider/model/protocol/tool/evaluator failure의 exact counts
- billed standard/conservative cost, uncertainty reserve와 total exposure

두 번의 반복은 실행 변동을 관측하기 위한 최소 반복이다. statistical superiority를 주장하기 위한 표본은 아니다.

## 고정 실행 envelope

| Boundary | Exact limit |
| --- | ---: |
| Submission attempts | task-run당 3 |
| Expected first-pass responses | 584 |
| Maximum successful responses | 1,096 |
| Provider retries | request당 1, 전체 32 |
| Maximum API request attempts | 1,128 |
| Knowledge / submission output | response당 2,000 / 8,000 tokens |
| Input / output | task-run당 120,000 / 28,000 tokens |
| Transport | call당 512 KiB, task-run당 3 MiB |
| Request timeout | 180초 |
| Maximum retry delay | 30초 |
| Consecutive provider failures | 3 task-runs |
| Rolling exposure hard cap | `$30` |

Expected standard cost는 `$10.1376`, 10% uplift conservative expected cost는 `$11.15136`이다. 모든 task token ceiling을
동시에 소진하는 이론상 envelope는 standard `$89.5488`, conservative `$98.50368`이지만 승인 범위가 아니다. Runner는
`billed conservative cost + uncertainty reserve + next request worst cost`가 `$30`을 넘을 수 있으면 다음 request를 보내기 전에
중단한다.

## 동결된 증거

| Evidence | Result |
| --- | --- |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `39d35cefe750c513703e99cb3e088fc7065c401c` |
| Plan SHA-256 | `498cbbd01c3618cc5fc39cd57fe40a55c589a0f01f319e08fd1cfca19bd773a2` |
| Route oracle SHA-256 | `dc241f8b717ee2d80a81762e23e870a1fdf57215f15bd3a30e4292dc39dca6a1` |
| Focused contracts | 33 / 33 pass |
| Dry run | routes 64 / 64, canonical evaluator 16 / 16, matrix 256 / 256 |
| Full repository suite | 2,151 / 2,151 pass |
| Coverage | lines 94.75%, branches 90.25%, functions 98.43%, critical floors 70 / 70 |
| Credential reads / external calls / spend | 0 / 0 / `$0` |

Product source trees, compact knowledge, MCP server, public docs, tasks, datasets, renderer wrapper와 strict evaluator 의미는 변경하지
않았다. Attempt 7 결과도 수정하거나 성공으로 재분류하지 않았다.

