# Gate R53-P6-A — Final B/C Model, Repetitions, and Spend

## Gate state

`approved`

Approved by the user on 2026-08-06. Gate package checkpoint: `9a70f075`

## 승인 대상

1. Model `gpt-5.6-terra`, reasoning `medium` standard mode, text verbosity `low`, service tier `default`, store `false`
2. 기존 24-task corpus를 condition별 두 번씩 실행하는 B 48회와 C 48회
3. 기존 task당 최대 3 model calls, C task당 최대 8 MCP calls, 180초 timeout과 token ceiling
4. 현재 Standard short-context 가격: input $2.00, cached $0.20, cache write $2.50, output $12.00 / 1M tokens
5. Condition별 $3.456 conservative expected cost, $5 hard cap과 B+C combined $10 hard cap
6. Model mismatch, hash mismatch, provider failure 또는 spend cap 도달 시 즉시 중단하고 재승인하는 규칙

## 왜 최신 Sol이 아닌가

현재 general recommendation은 `gpt-5.6-sol`이지만 Condition A는 이미 `gpt-5.6-terra`로 측정됐다. B/C만 model을
바꾸면 documentation/MCP 효과를 분리할 수 없다. Sol을 쓰려면 A/B/C 144회를 모두 다시 승인·실행해야 한다. 이번
제안은 이미 승인된 A를 보존하고 knowledge access 차이만 비교하는 최소 비용의 재현 가능한 선택이다.

## 비용 근거

| 범위 | Input | Output | 현재 가격 계산 |
| --- | ---: | ---: | ---: |
| Task당 conservative expected | 12,000 | 4,000 | $0.024 + $0.048 = **$0.072** |
| Condition 48회 expected | 576,000 | 192,000 | **$3.456** |
| Task당 계산상 token maximum | 24,000 cache-write rate | 8,000 | $0.060 + $0.096 = **$0.156** |
| Condition 48회 계산상 maximum | 1,152,000 | 384,000 | **$7.488** |

A의 실제 token mix를 현재 가격으로 다시 계산한 참고액은 $1.354499다. Actual B/C 비용은 response usage로 각각
기록한다. Runner는 condition당 $5와 combined $10 중 먼저 도달한 hard cap에서 새 요청을 시작하지 않는다.

## 승인 효과

승인으로 evaluation plan의 가격/cap 동기화와 external paid Condition B/C 순차 실행이 해제되었다. 이 승인은
R53-P6-B, PR Ready/merge, package publish, docs deployment 또는 release를 승인하지 않는다.

## 승인 전 차단 범위

- External or paid Condition B/C model calls
- A/B/C result와 acceptance claim
- PR Ready/merge, package publish, docs deployment와 release

## 근거 문서

- Benchmark/corpus/threshold owner: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
- Condition A result: [`../phase0/CURRENT_DOCS_BASELINE.md`](../phase0/CURRENT_DOCS_BASELINE.md)
- Official pricing: <https://developers.openai.com/api/docs/pricing#text-tokens>
- Current model-role guidance: <https://developers.openai.com/api/docs/guides/upgrading-to-gpt-5p6-sol.md>
