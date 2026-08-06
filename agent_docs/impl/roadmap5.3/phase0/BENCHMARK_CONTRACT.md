# Roadmap 5.3 LLM Benchmark Contract

## 한눈에 보는 제안

현재 문서(A)를 `gpt-5.6-terra`로 24개 과제에 두 번씩, 총 48회 평가한다. 과제 하나는 최초 작성과 최대 두 번의
수정을 포함할 수 있다. 모델이 만든 JavaScript를 실제 package로 실행하고 지정된 validation과 renderer를 통과해야
정답이다. 단순히 action 이름이 답안에 들어갔는지만으로 성공 처리하지 않는다.

이 문서는 사용자 승인 전 제안이다. Machine-readable 설정은
[`test/llm/evaluation-plan.json`](../../../../test/llm/evaluation-plan.json), 과제와 oracle은
[`test/llm/tasks.json`](../../../../test/llm/tasks.json), raw result schema는
[`test/llm/result.schema.json`](../../../../test/llm/result.schema.json)이 소유한다.

## 모델과 실행 설정

| 항목 | 고정값 |
| --- | --- |
| Provider/API | OpenAI Responses API |
| Model | `gpt-5.6-terra` |
| Reasoning | `medium`, standard mode |
| Text verbosity | `low` |
| Service tier | `default` |
| Stored response | `false` |
| Repetitions | Task별 2회 |
| Runs | Condition별 24 × 2 = 48 |
| Model calls | Task별 최대 3회 |
| MCP calls | Task별 최대 8회; A/B에서는 0 |
| Timeout | Task별 180초 |
| Order | Seed `roadmap5.3-eval-v1`로 결정론적 shuffle |

공식 model guidance는 Terra를 intelligence/cost 균형형으로 설명하고 `medium` reasoning을 balanced starting
point로 권장한다. Temperature는 이 reasoning-model 계약의 고정축으로 사용하지 않는다.

- <https://developers.openai.com/api/docs/guides/latest-model>
- <https://developers.openai.com/api/docs/models/gpt-5.6-terra>

## Condition isolation

- **A — current docs:** Starting commit `9414d07179c9e7c6bbfdf00b762fc35de0ff25ec`의 `docs/llms.txt`에서
  시작해 거기서 연결된 현재 public docs만 bounded local reader로 읽는다.
- **B — structured knowledge:** 같은 package와 reader에 generated structured action metadata와 task recipes만
  추가한다.
- **C — local MCP:** 같은 package를 사용하되 knowledge 탐색은 local read-only `ggaction-mcp` resources/tools만
  사용한다.

세 condition은 같은 system envelope, task prompt, dataset, model 설정, token/call/time limit와 oracle을 사용한다.
Held-out task에는 prompt만 제공하며 oracle과 reference solution은 model context에 넣지 않는다. A를 의도적으로
약하게 만들기 위해 현재의 `llms.txt` route를 막지 않는다.

## 과제와 정답 판정

Corpus는 12개 authoring task와 12개 held-out task로 구성된다. 5개 versioned repository dataset의 SHA-256과
사용 field를 고정했고, 12개 이상의 chart category, 3개 repair task와 Canvas/SVG/PNG/PDF parity를 포함한다.

최종 program은 다음을 모두 만족해야 성공이다.

1. Oracle의 required action 또는 허용된 alternative action set을 사용한다.
2. Ordinary authoring task에서 extension primitive shortcut을 사용하지 않는다.
3. Repository package로 import하고 runtime error 없이 실행된다.
4. Task별 semantic/graphic validation이 모두 통과한다.
5. 요청된 renderer output과 package route가 실제로 생성된다.

실패는 `invalid-program`, `forbidden-primitive`, `missing-action`, `runtime-error`, `validation-failed`,
`renderer-failed`, `package-failed`, `timeout`, `provider-error`, `budget-exceeded` 중 하나로 기록한다. 실패와 timeout도
correctness denominator에서 빼지 않는다.

## 측정값

Raw result는 first-pass/final correctness와 함께 input, cached input, cache-write, output, reasoning과 total token,
model/MCP call 수, repair round, time-to-valid와 실제 추정 비용을 기록한다. Generated program, SHA-256, validation
log와 renderer artifact 경로도 남긴다.

Aggregate는 split/condition별 success rate, median과 p95를 보고한다. Token, calls와 time은 성공한 chart 기준과
전체 failure/timeout 분포를 함께 보여준다. `completionTokens`는 reasoning token을 포함하며, reasoning token을 별도
필드로도 기록한다.

## 비용 경계

2026-08-06 model-specific page의 더 높은 요율을 보수적으로 사용한다. 1M token당 uncached input $2.50, cached
input $0.25, cache write $3.125, output $15.00이다. General pricing table과 차이가 있어 낮은 요율을 비용 상한 계산에
사용하지 않는다.

| 범위 | Input | Output | 계산 |
| --- | ---: | ---: | ---: |
| Task당 예상 | 12,000 | 4,000 | $0.030 + $0.060 = **$0.090** |
| A 48회 예상 | 576,000 | 192,000 | **$4.32** |
| Task당 계산상 최대 | 24,000 cache-write rate | 8,000 | $0.075 + $0.120 = **$0.195** |
| A 48회 계산상 최대 | 1,152,000 | 384,000 | **$9.36** |

R53-P0-A 승인 요청 spend cap은 **$10.00**이다. Runner는 누적 input 24,000/output 8,000 token, task별 3 calls와
전체 $10.00 중 먼저 도달한 경계에서 새 요청을 시작하지 않는다. B/C 실행은 이번 승인에 포함되지 않으며 각각
별도 승인이 필요하다.

## 미리 고정하는 성공 기준

C는 다음 correctness guard를 모두 통과해야 한다.

- Final correctness가 A보다 2 percentage points 넘게 낮아지지 않는다.
- A first-pass correctness가 90% 미만이면 C는 최소 10 percentage points 개선한다.
- A가 이미 90% 이상이면 C first-pass correctness는 2 percentage points 넘게 낮아지지 않는다.

그리고 성공한 chart의 median 기준으로 다음 세 efficiency threshold 중 최소 두 개를 통과해야 한다.

- Total tokens 20% 이상 감소
- Model calls 20% 이상 감소
- Time-to-valid 15% 이상 감소

통과하지 못한 나머지 efficiency metric도 A보다 5% 넘게 나빠지면 안 된다. B는 원인 분리를 위한 중간 condition이며,
C final correctness도 B보다 2 percentage points 넘게 낮아지면 안 된다. Authoring과 held-out을 모두 공개하되 최종
판정은 held-out 결과를 우선하고 전체 결과도 함께 보고한다.

## Knowledge source ownership 제안

Exact behavior의 canonical owner는 계속 `agent_docs/contract/current/`와 `ACTION_INDEX.json`, public signature의
owner는 types와 기존 signature generator다. 새 knowledge source는 이 사실을 복사해 새 계약으로 만들지 않는다.

- `knowledge/actions/*.json`: English `summary`, `useWhen`, `avoidWhen`, composition, example와 relation의 canonical
  narrative source. Current action domain 단위로 나눈다.
- `knowledge/recipes/*.json`: Task intent, prerequisites, steps, alternatives, pitfalls와 executable example linkage의
  canonical recipe source.
- `knowledge/index.json`: 위 source에 ACTION_INDEX, signatures와 validation evidence를 join한 generated artifact.
- Public action/recipe docs, `llms.txt`/`llms-full.txt`, search index와 local MCP는 같은 generated index를 소비한다.
- Existing `ggaction` package가 `knowledge/`와 Node-only `ggaction-mcp` bin을 포함한다. Browser entry는 knowledge나
  MCP dependency를 import하지 않는다.

이 경계는 narrative 중복을 막으면서 exact contract와 type truth를 현재 owner에 남긴다. MCP 구현 시 package
boundary가 실제로 바뀌므로 `SECOND_ARCHITECTURE.md`, package artifact와 browser bundle isolation을 함께 검증한다.

## 재현성 예외

API response의 resolved model identity와 실행 시각을 raw result에 기록한다. A/B/C 사이 resolved model이 달라지거나
21일보다 오래 벌어지면 결과를 직접 비교하지 않고 A 재실행 비용을 새로 승인받는다. 승인 후 model, reasoning,
repetition, corpus, price 또는 acceptance rule을 바꾸려면 Gate를 다시 연다.
