# Attempt 9 — Aborted Terra/Luna/Nano Expanded Comparison

## 결론

Attempt 9는 valid complete comparison이 아니다. Exact v9 matrix를 새로 시작해 8 / 576 task-runs를 완료한 뒤 첫 Nano cell의
첫 model response에서 provider response identity stop rule이 발동했다. 추가 request, retry 또는 resume 없이 즉시 중단했다.

완료된 8개 cells는 Terra/Luna의 동일한 첫 task 일부일 뿐이고 Nano는 한 cell도 완료하지 못했다. 따라서 이 partial result로
model size, A/B/C/D condition, pass rate, latency 또는 cost 우위를 계산하거나 주장하지 않는다.

## 불변 증거

| Evidence | Exact value |
| --- | --- |
| Authorization | R54-P6-A Option A |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `fb6044c4f7ba55a11bbc9e97991ceb3d4f815c7f` |
| Plan SHA-256 | `86eeb648ab0c91a04148e472d100ad19ca06e7d993e6c3d1353862e8319bdc55` |
| Route oracle SHA-256 | `8211f33c5a443649def1f72de6f92d943a260f3df89795032d498f5c87819816` |
| Progress | [`IN_PROGRESS.json`](../../../../evaluation/compact-authoring-paid-comparison-v9/results/IN_PROGRESS.json) |
| Progress SHA-256 | `8b2eb99eb9006b8de8cb9c3f9a9cc991c1aeba01c57c5df274094ff434ca449e` |
| Run time | 2026-08-09 16:15:18Z–16:16:49Z |
| Credential reads | 1 |
| Provider retries | 0 |

`IN_PROGRESS.json`은 byte-for-byte 보존한다. Credential-like string, credential path, prompt/reasoning text와 encrypted reasoning
content가 없음을 확인했다. `RESULT.json`은 생성되지 않았다.

## Exact stop outcome

| Metric | Result |
| --- | ---: |
| Completed task-runs | 8 / 576 |
| Aborted run | `final3-01-scatter-svg:r1:gpt-5.4-nano:A` |
| Billed model responses / API attempts | 23 / 23 |
| Provider retries | 0 |
| Input / output / total tokens | 40,171 / 7,528 / 47,699 |
| Cached input / cache-write tokens | 8,960 / 21,736 |
| Reasoning tokens | 4,190 |
| Standard billed cost | `$0.08262075` |
| Conservative billed exposure | `$0.090882825` |
| Uncertain reserve | `$0` |

Abort response 자체는 complete billing usage를 반환했다. Nano response 1회의 보수적 비용 `$0.000379775`도 ledger에 포함되어 있다.

## 확인된 harness 결함

State machine v3는 요청한 model alias와 `service_tier`가 provider response의 두 문자열과 모두 정확히 같아야 한다는 단일 조건을
사용했다. 그런데 실패 trace는 response의 실제 `model`과 `service_tier`를 보존하지 않았다. 따라서 stop rule은 drift를 감지했지만
어느 필드가 어떤 값으로 달랐는지를 사후에 판별할 증거를 지웠다.

공식 GPT-5.4 Nano model page는 alias `gpt-5.4-nano`와 current snapshot
`gpt-5.4-nano-2026-03-17`을 함께 제공한다. Exact reproducibility가 목적인 benchmark가 mutable alias를 요청하고 snapshot resolution까지
문자열 동일성으로 검사한 것은 서로 충돌하는 설계다. Responses schema의 `model`은 string이지만 alias response가 언제나 요청 문자열을
그대로 반환한다는 보장은 현재 공식 문서에서 확인하지 못했다.

따라서 이번 중단은 Nano 품질, MCP, knowledge packet 또는 strict evaluator failure가 아니다. Provider response identity를 관찰·고정하는
benchmark harness가 충분히 진단 가능하지 않았던 pre-measurement failure다.

## Required repair boundary

다음 external run은 Attempt 9를 이어 붙이지 않고 별도 plan identity로 576 cells를 처음부터 실행해야 한다. 그 전에 다음을 모두
무과금으로 고정한다.

1. Nano request를 공식 current snapshot ID로 pin한다.
2. Requested/returned model과 service tier를 모든 billed response trace에 sanitized metadata로 보존한다.
3. Model mismatch와 service-tier mismatch를 서로 다른 fatal label로 분리한다.
4. Identity failure response도 usage와 cost를 먼저 장부에 반영하고 progress에 남긴다.
5. Alias/snapshot과 service-tier cases를 mock contract로 검증한다.
6. 새 evaluator checkpoint, plan hash와 replacement Gate 승인을 받는다.

R54-P6-A authorization은 이번 중단으로 소진됐다. 승인 없이 credential을 다시 읽거나 paid call을 재시도하지 않는다.

## 공식 근거

- <https://developers.openai.com/api/docs/models/gpt-5.4-nano>
- <https://developers.openai.com/api/docs/pricing>
