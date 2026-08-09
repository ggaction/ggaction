# STEP 4 — Comprehensive Response-Aware Comparison Repair

## 진행 상태

- [x] Attempt 6 ledger와 generated-program failure를 불변 증거로 보존
- [x] Responses API의 output/reasoning token boundary를 공식 계약과 교차검증
- [x] provider status와 incomplete details를 보존하는 state machine v2 구현
- [x] model task failure와 experiment-integrity stop을 분리
- [x] 모든 조건에 동일한 3회 submission 기회를 부여
- [x] 8 tasks × A/B/C/D를 Latin-square 순서로 counterbalance
- [x] 조건별·모든 쌍별·B:C direct-vs-MCP 비교 지표 구현
- [x] comprehensive v7 evaluator checkpoint 고정 — `ee47a8c8`
- [x] focused contracts 18 / 18
- [x] dry-run routes 32 / 32, canonical evaluator 8 / 8
- [x] full repository suite 2,136 / 2,136
- [x] coverage — lines 94.74%, branches 90.26%, functions 98.43%, critical floors 70 / 70
- [x] R54-P5-J review package 고정 — `9abd6e31`

## Attempt 6에서 실제로 멈춘 이유

Attempt 6의 첫 세 calls는 exact forced function을 정상 반환했다. 네 번째 submission call만 4,000 output tokens를 모두
사용했고 그중 3,979 tokens가 reasoning이었다. Function call을 만들기 전에 response가 `incomplete/max_output_tokens`로
끝났지만, v6는 provider status를 trace에 보존하지 않았다. 그 결과 이 정상적으로 분류 가능한 model failure를 evaluator 자체가
망가진 것처럼 취급하고 나머지 31 task-runs까지 중단했다.

Responses API의 `max_output_tokens`는 visible output과 reasoning을 함께 제한한다. Forced tool choice는 완료된 response가 호출할
tool을 제한하지만, reasoning이 ceiling을 먼저 소진한 incomplete response에 function call을 만들어 주지는 않는다.

따라서 관측된 직접 원인은 MCP가 아니다. Attempt 6은 첫 A public-doc 조건에서 중단되어 C MCP 조건까지 도달하지도 않았다.
MCP의 정확성·효율은 새 비교를 실제로 끝낸 뒤 B direct resolver와 C MCP 결과로 판단해야 한다.

## 제한을 푼 방식

### 동일한 authoring 기회

각 A/B/C/D task-run은 strict evaluator에 program을 최대 3회 제출할 수 있다. 이전 실패 피드백을 다음 제출 prompt에 넣으므로
첫 제출 성능과 수리 후 최종 성능을 함께 측정한다.

지식 전달 단계 수는 route의 본질이므로 억지로 같게 만들지 않는다.

- A public docs: search + read + 최대 3 submissions = 최대 5 model calls
- B direct resolver: search + 최대 3 submissions = 최대 4 model calls
- C local MCP: search + 최대 3 submissions = 최대 4 model calls
- D MCP fallback: search + 필요한 task만 one bounded read + 최대 3 submissions = 최대 4 또는 5 model calls

따라서 조건별 총 calls 차이도 측정 대상이다. 공정성의 기준은 지식 route를 숨기는 것이 아니라 모든 조건이 같은 수의 program
제출 기회를 갖는 것이다.

### 현실적인 token·transport envelope

- Knowledge response: 최대 2,000 output tokens
- Submission response: 최대 8,000 output tokens
- Task-run 누적: input 80,000, output 28,000 tokens
- Request body: call당 512 KiB, task-run당 2 MiB
- 전체: first-pass 예상 74 calls, 절대 최대 138 calls

Submission ceiling을 늘려 reasoning이 function call보다 먼저 잘리는 위험을 낮췄다. 이 수치들은 목표치가 아니라 runaway를 막는
안전 상한이다.

## 끝까지 비교하는 상태 경계

Known model outcome은 해당 task-run의 실패로 기록하고 다음 matrix entry를 계속 실행한다.

- `incomplete/max_output_tokens`
- 그 밖의 bounded incomplete 또는 failed response
- completed response의 zero/multiple/wrong forced-function call
- malformed function arguments 또는 strict evaluator failure
- local knowledge-tool failure

반대로 실험 결과를 신뢰할 수 없거나 승인 범위를 넘는 경우만 전체 run을 중단한다.

- candidate, evaluator, plan, source hash, model 또는 service-tier drift
- incomplete billing usage
- queued/in-progress/missing/unknown synchronous provider status
- request, task token, total call 또는 conservative cost envelope 위반
- transport/API failure

매 response의 과금 usage를 먼저 장부에 반영한 뒤 판정한다. Trace에는 provider status, bounded incomplete reason, sanitized output
item shape, model/tool/evaluator latency를 저장하지만 prompt, reasoning text, credential과 원본 function arguments는 저장하지 않는다.

## 순서 편향과 비교 지표

각 task 안의 조건 순서는 다음 Latin square를 반복한다.

1. A → B → C → D
2. B → C → D → A
3. C → D → A → B
4. D → A → B → C

이렇게 하면 모든 조건이 첫째·둘째·셋째·넷째 위치에 같은 횟수 등장한다. 한 repetition이므로 시간 변화와 provider variance를
완전히 제거하거나 statistical superiority를 주장하지는 않는다.

결과에는 다음을 조건별로 집계하고 A:B, A:C, A:D, B:C, B:D, C:D 모든 paired delta를 계산한다.

- final pass rate와 first-submission pass rate
- model calls와 submission attempts
- search/read/tool-call 수와 tool-result bytes
- input, cached, cache-write, output, reasoning, total tokens
- standard cost와 10% uplift를 적용한 conservative cost
- elapsed time, valid result까지의 시간, model/tool/evaluator latency
- exact failure counts

B:C에는 byte-equal compact packet을 돌려주는 direct resolver와 local MCP의 차이를 별도로 표시한다. 이 값이 MCP transport와
process 경계의 실제 overhead를 가장 직접적으로 보여준다.

## 비교 불변성

- Product candidate와 `src`, `types`, `knowledge`, `docs`, `package.json` trees는 Attempt 6과 동일하다.
- A의 search ranking, model-selected URL과 one-read boundary를 수정하지 않았다.
- B/C/D compact packet, MCP resources, task, dataset, renderer wrapper와 strict evaluator를 수정하지 않았다.
- Attempt 6을 성공으로 재분류하지 않는다.
- R54-P5-J 승인 전 credential read, external call과 추가 spend는 차단한다.
