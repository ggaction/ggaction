# Paid Smoke Attempt 6 — Aborted v6 Result

## Immutable identity

| Item | Value |
| --- | --- |
| Authorization | R54-P5-I Option A |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `956e969faf3c127a83850f65e5c78009c070af7d` |
| Plan | `evaluation/compact-authoring-paid-smoke-v6/PLAN.json` |
| Plan SHA-256 | `5f8a226e2146843b3fe8875289646871284b3b486c755c333d02bc6a4cf8b561` |
| Route oracle SHA-256 | `27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4` |
| Final progress | `evaluation/compact-authoring-paid-smoke-v6/results/IN_PROGRESS.json` |
| Final progress SHA-256 | `d3e7e0083196af10d24a02af03a91aac609d45780488551e456e63649f8a3deb` |
| Final result | 없음 — stop rule로 중단 |
| Credential reads | 1 |
| Automatic retries | 0 |

## Exact outcome

첫 run `final3-03-bars-png:A`의 네 번째 model response에서 function call이 0개여서
`provider-protocol-mismatch: forced submit_result, received 0 function calls` stop rule이 발동했다. 추가 task, retry 또는 plan
수정 없이 즉시 중단했다.

| Metric | Result |
| --- | ---: |
| Completed task-runs | 0 / 32 |
| Aborted run | `final3-03-bars-png:A` |
| Billed model calls | 4 |
| Input tokens | 6,850 |
| Cached input tokens | 1,668 |
| Cache-write tokens | 3,727 |
| Output tokens | 4,782 |
| Reasoning tokens | 4,496 |
| Total tokens | 11,632 |
| Spend | `$0.0699451` |

이 attempt는 A/B/C/D comparison이 아니다. 첫 A run도 완료하지 못했으므로 route success rate, superiority 또는 효율 개선을
계산하지 않는다.

## Exact trace

| Call | Forced tool | Actual result | Output / reasoning tokens |
| ---: | --- | --- | ---: |
| 1 | `search_docs` | one valid function call | 30 / 0 |
| 2 | `read_doc` | one valid function call | 47 / 19 |
| 3 | `submit_result` | one valid function call; strict evaluation failed | 705 / 498 |
| 4 | `submit_result` | zero function calls | 4,000 / 3,979 |

첫 제출은 `chart()`, `createCanvas`, `createData`와 정확한 evaluator PNG wrapper를 사용했지만 존재하지 않는
`program.bar`, `program.colorScale`, `program.legend`, `program.axes`를 호출했다. Strict evaluator는
`generated-program-error:TypeError: program.bar is not a function`으로 거부했다. 이는 public-doc one-read baseline의 실제
authoring failure이며 결과 확인 뒤 search ranking, 반환 URL, public docs 또는 제품 코드를 조정하지 않는다.

## Causal conclusion

Attempt 5의 `tool_choice: "auto"` 모순은 실제로 수리됐다. Attempt 6의 첫 세 responses는
`tool_choice: { type: "function", name }`와 exact forced function을 일치시켰다. 네 번째 response의 다른 점은
`max_output_tokens=4000`을 정확히 사용했고 그중 3,979 tokens가 reasoning이었다는 것이다.

OpenAI Responses API의 `max_output_tokens`는 visible output과 reasoning tokens를 함께 제한한다.
<https://developers.openai.com/api/reference/resources/responses/methods/create>

따라서 관측된 zero-call은 output ceiling exhaustion과 일치한다. 그러나 v6 trace가 provider `status`, `incomplete_details`,
top-level error와 output item status를 저장하지 않았으므로 이 historical response의 exact `incomplete` status는 사후에 증명할 수
없다. 이 관측성 누락 자체가 evaluator runner 결함이다.

근본 수리는 다음 경계를 분리해야 한다.

1. Billing usage를 먼저 기록한 뒤 provider `status`, `incomplete_details`, error와 output shape를 trace에 보존한다.
2. `status=completed`인데 forced call이 없으면 실제 `provider-protocol-mismatch`로 전체 run을 중단한다.
3. `status=incomplete`이고 reason이 `max_output_tokens`이면 승인된 task-local 예산 안의 모델 실패로 기록하고 그 task를 종료한다.
   이는 transport retry가 아니며 같은 task를 다시 호출하지 않는다.
4. 알려진 budget-limited task failure는 32-run 비교 전체를 중단하지 않고 다음 고정 run으로 진행한다.
5. Unknown status, unknown incomplete reason, incomplete billing과 provider identity mismatch는 계속 전체 run을 중단한다.

`IN_PROGRESS.json`은 byte-for-byte 보존한다. R54-P5-I 승인은 이 중단으로 소진됐다. 새 paid call은 fresh runner checkpoint,
plan hash와 별도 replacement Gate 승인 전에는 실행하지 않는다.
