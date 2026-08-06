# Gate R53-P6-E — Exact One-Run B/C Paid Smoke

## Gate state

`ready-for-review`

Candidate behavior checkpoint: `ea50b0c15d9f747b6e5b8e41ded657d67868fa3a`

Gate package checkpoint: `24e52d32`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 제안

같은 direct chart task를 교정된 Condition B와 C에서 각각 정확히 한 번만 실행한다. 최대 두 run, 여섯 model call이며,
expected cost는 합계 **$0.144**, 계산상 token maximum은 **$0.312**, hard spend ceiling은 condition별 **$0.20**,
합계 **$0.40**이다.

```text
cars-scatter-origin
  → B one run
  → C one run
  → stop and review both sanitized traces
```

이 Gate 승인은 위 두 run만 승인한다. 48-run full rerun, PR, merge, publish, deploy와 release는 승인하지 않는다.

## 1. Exact smoke target

| 항목 | 고정값 |
| --- | --- |
| Task | `cars-scatter-origin` |
| Repetition | `r1` only |
| Dataset | `cars-v1` |
| Required result | Horsepower × Miles_per_Gallon scatterplot, Origin color, labeled Cartesian axes, non-empty Canvas |
| Conditions | B once, then C once |
| Maximum runs | 2 |
| Candidate commit metadata | `ea50b0c15d9f747b6e5b8e41ded657d67868fa3a` |
| Isolated output root | `.artifacts/llm-eval/corrective-smoke-ea50b0c1/` |

이 task를 고른 이유는 판별력이 가장 명확하기 때문이다.

- Frozen A baseline은 같은 task에서 2/2 first-pass/final valid였다.
- 교정 전 B와 C는 각각 0/2였고 모두 `submit_program` 없이 끝났다.
- 교정 후 mocked B/C는 같은 task에서 `search → exact read → submit_program`을 통과했다.
- Direct task라 실패 시 복잡한 chart family보다 knowledge-delivery 경로를 먼저 의심할 수 있다.

## 2. 바꾸지 않는 model과 평가 설정

- API: Responses API
- Model: `gpt-5.6-terra`
- Reasoning effort: `medium`, standard reasoning mode
- Text verbosity: `low`
- Service tier: `default`
- `store: false`
- `tool_choice: "auto"`
- Task당 model call 최대 3회
- C task당 실행된 MCP knowledge call 최대 8회
- Task timeout 180초
- Call당 output 최대 5,000 tokens
- Task당 cumulative input/output ceiling 24,000 / 8,000 tokens
- Corpus prompt, dataset, oracle와 validation threshold

2026-08-07 official model page는 `gpt-5.6-terra`가 Responses API와 function calling을 지원함을 확인한다. Official
pricing page의 Standard short-context 가격도 frozen plan과 같다.

## 3. Exact 비용과 hard stop

현재 Standard short-context 가격은 1M tokens당 input $2.00, cached input $0.20, cache write $2.50, output
$12.00이다.

| 범위 | Input/output 가정 | 비용 |
| --- | --- | ---: |
| Run당 conservative expected | 12,000 input + 4,000 output | $0.072 |
| B+C expected | 위 값 × 2 | $0.144 |
| Run당 계산상 maximum | 24,000 cache-write rate + 8,000 output | $0.156 |
| B+C 계산상 maximum | 위 값 × 2 | $0.312 |
| Condition hard cap | B $0.20 / C $0.20 | $0.40 combined |

Runner는 condition cap과 combined cap 중 남은 값이 다음 요청의 보수적 최대 비용보다 작으면 요청을 시작하지 않는다.
Regional processing, Fast mode, built-in paid tools는 사용하지 않는다. Local structured knowledge와 stdio MCP에는 별도 OpenAI
tool-call 요금이 없다.

## 4. 승인 뒤 먼저 추가할 무과금 실행 가드

기존 full-run runner의 과거 $5/$10 승인을 재사용하지 않는다. Paid call 전에 다음 smoke-only guard를 추가하고 mock test로
검증한다.

1. 별도 smoke plan이 exact task `cars-scatter-origin`, repetition 1, B/C one run과 $0.20/$0.40 cap을 소유한다.
2. Smoke runner는 task ID, repetition, candidate SHA와 output root가 하나라도 다르면 API key를 읽기 전에 거부한다.
3. 기존 결과 디렉터리를 재사용하지 않고 isolated output root만 쓴다.
4. B를 먼저 기록하고 provider error, model mismatch, hash mismatch 또는 cap error면 C를 시작하지 않는다.
5. Guard contract와 mocked zero-cost run이 통과한 체크포인트를 push한 뒤에만 실제 B/C를 순차 실행한다.

이 가드는 승인 범위를 기계적으로 좁히기 위한 것이며 model prompt나 frozen evaluation axis는 바꾸지 않는다.

## 5. Smoke 통과 조건

Full rerun Gate를 준비하려면 B와 C가 모두 다음을 만족해야 한다.

1. Resolved model이 정확히 `gpt-5.6-terra`다.
2. Provider error와 budget error가 없다.
3. Trace가 `search_ggaction → one exact action/recipe read → submit_program`을 세 model call 안에 보인다.
4. Search는 한 번, exact read는 한 번만 실행된다.
5. `submit_program` 결과가 `finalValid: true`다.
6. Trace에는 API key, provider raw response, reasoning, complete knowledge source와 submitted source가 없다.

하나라도 실패하면 full rerun을 제안하지 않고 두 trace와 실패 원인만 Gate로 올린다. Smoke 성공도 전체 성능 개선을
입증하지 않으므로 correctness/efficiency benefit claim은 계속 금지한다.

## 6. 실행 후 제출할 증거

- B/C raw result의 SHA-256과 run ID
- Sanitized trace SHA-256과 exact call sequence
- final validation evidence와 renderer artifact
- Model calls, MCP calls, tokens, time-to-valid와 actual cost
- Approved $0.40 대비 actual combined spend
- Full rerun을 제안할지 중단할지에 대한 명시적 판정

## 승인 효과

승인하면 smoke-only guard 구현·무과금 mock 검증과, 그 검증이 통과한 경우 위 B/C 각 1회 API 실행까지 해제된다.

## 승인 전 차단 범위

- API key 읽기와 external/paid model call
- 48-run B/C full rerun
- Correctness/efficiency benefit claim
- PR preparation/Ready transition, merge와 exact-main verification
- Package publish, docs deployment와 release

## 근거

- Corrective unpaid evidence: [`GATE_D.md`](./GATE_D.md)
- Frozen benchmark: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
- Existing paid-plan owner: [`../../../../test/llm/evaluation-plan.json`](../../../../test/llm/evaluation-plan.json)
- Official model: <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- Official pricing: <https://developers.openai.com/api/docs/pricing>

## 검토 요청

R53-P6-E를 승인해 smoke-only 실행 가드를 먼저 검증하고, 통과하면 `cars-scatter-origin`의 B/C 각 한 번을 합계 최대
$0.40 안에서 실행해도 되는가?
