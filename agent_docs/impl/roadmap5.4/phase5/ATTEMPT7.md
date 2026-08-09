# Paid Comparison Attempt 7 — Aborted v7 Result

## Immutable identity

| Item | Value |
| --- | --- |
| Authorization | R54-P5-J Option A |
| Authorization checkpoint | `1d1f9cf6fd68639430156468068bfd45aac8ff5d` |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `ee47a8c81d04e95f03590d482cc8d5c48f8e71ea` |
| Plan | `evaluation/compact-authoring-paid-smoke-v7/PLAN.json` |
| Plan SHA-256 | `029927744c89a732c4a940fe869c9f3b31cf4cac4015b478dde25d58833d1e77` |
| Route oracle SHA-256 | `27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4` |
| Final progress | `evaluation/compact-authoring-paid-smoke-v7/results/IN_PROGRESS.json` |
| Final progress SHA-256 | `cd91ee44c93724a7425ce63a0ef38c14acde3008ac4bfbeafb0649566320ab73` |
| Final result | 없음 — approved stop rule로 중단 |
| Credential reads | 1 |
| Automatic retries | 0 |

## Exact outcome

Run position 11인 `final3-12-rule-canvas:A`의 두 번째 submission request를 처리하던 provider가 request-processing error를
반환했다. Message는 retry 또는 support 문의를 안내했고 request ID `req_5a6677549548442a80829e1e8db8cb9c`를 제공했다.
R54-P5-J는 transport/API automatic retry를 0으로 고정했으므로 추가 호출 없이 즉시 중단했다.

| Metric | Result |
| --- | ---: |
| Completed task-runs | 10 / 32 |
| Passed completed task-runs | 9 / 10 |
| Aborted run | `final3-12-rule-canvas:A` |
| Billed model responses | 29 |
| Provider-failed request | 1 additional request, billing usage 없음 |
| Input tokens | 46,714 |
| Cached input tokens | 7,634 |
| Cache-write tokens | 27,159 |
| Output tokens | 14,901 |
| Reasoning tokens | 11,172 |
| Total tokens | 61,615 |
| Standard spend | `$0.2720783` |
| Conservative spend | `$0.29928613` |

`IN_PROGRESS.json`은 byte-for-byte 보존한다. Provider-failed request에는 billing usage가 없으므로 장부의 29 model calls와
cost에 포함하지 않는다. 실제 HTTP request attempt는 completed 29회와 failed 1회를 합쳐 30회다.

## Runner behavior conclusion

v7의 task-local continuation은 실제로 작동했다. 첫 A bars task가
`model-output-budget-exhausted:max_output_tokens`로 실패했지만 matrix는 중단하지 않았고 다음 9 task-runs를 완료했다.
또한 strict evaluator 첫 실패 뒤 두 번째 submission으로 성공한 task-runs도 완료했다.

이번 전체 중단은 MCP, knowledge tool, strict evaluator 또는 model response-status 분류에서 발생하지 않았다. Active A task는
public-doc search, document read와 첫 submission/evaluation까지 정상 완료했고, 다음 provider request 자체가 결과와 billing usage를
반환하지 못했다. Runner는 승인된 `transport/API failure = global stop` 규칙을 정확히 수행했다.

따라서 현재 남은 근본 문제는 비교 로직이 아니라 **단 한 번의 일시적 provider failure도 허용하지 않는 실행 정책**이다.
32-run experiment를 끝까지 수행하려는 목표와 automatic retry 0 규칙이 충돌한다.

## Incomplete observations

아래 값은 10개 completed task-runs의 관측일 뿐이며 full A/B/C/D comparison이 아니다. Condition마다 task 수와 task identity가
다르므로 전체 pass rate나 우월성으로 일반화하지 않는다.

| Condition | Completed | Passed | First-submission passed | Calls | Conservative cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| A — public docs | 2 | 1 | 0 | 8 | `$0.15483545` |
| B — direct resolver | 2 | 2 | 2 | 4 | `$0.02671515` |
| C — local MCP | 3 | 3 | 2 | 7 | `$0.04843916` |
| D — MCP + bounded fallback | 3 | 3 | 2 | 7 | `$0.05005682` |

확실히 말할 수 있는 범위는 다음뿐이다.

1. Local MCP는 세 task-runs 모두 search와 submission을 정상 수행했고 모두 strict evaluator를 통과했다.
2. B:C가 둘 다 완료된 bars와 violin 두 paired tasks에서는 양쪽 모두 2 / 2 통과했다.
3. 이 두 pairs에서 C의 local knowledge-tool latency는 B보다 평균 약 207 ms 높았고, end-to-end time-to-valid는 평균 약
   345 ms 높았다. 이는 local MCP process/stdio 경계의 작은 실제 overhead와 일치하지만 표본이 2개뿐이다.
4. C의 conservative cost는 B보다 pair당 평균 약 `$0.0009185` 낮았다. 이 작은 차이는 model output variance의 영향을 받으므로
   MCP가 더 저렴하다는 결론으로 사용하지 않는다.
5. A bars는 첫 제출에서 존재하지 않는 `program.createMark`를 사용한 뒤 두 번째 response가 8,000 output tokens를 소진해
   실패했다. A violin은 첫 제출 실패 후 두 번째 제출에 성공했다.

## Required next decision

Attempt 7은 완전한 비교가 아니며 R54-P5-J authorization은 이 중단으로 소진됐다. 새 external call 전에는 다음 정책을 결정하고
fresh runner checkpoint, plan hash와 replacement Gate를 고정해야 한다.

권장 방향은 provider가 billing usage 없는 retryable processing error를 반환한 경우에만 같은 request를 최대 1회 재시도하는
것이다. Model incomplete, protocol noncompliance, evaluator failure는 기존처럼 자동 재시도하지 않는다. Retry 자체도 별도 request로
기록하고 global call/cost/transport 상한에 포함해야 한다. 중단된 partial matrix를 이어 붙일지, 새 32-run을 처음부터 실행할지도
재실행 전 명시적으로 결정해야 한다.
