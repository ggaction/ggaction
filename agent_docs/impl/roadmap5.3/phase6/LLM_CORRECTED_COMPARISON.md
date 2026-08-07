# Roadmap 5.3 Corrected A/B/C LLM Comparison

## 결론

**FAILED.** 사전 고정한 acceptance threshold를 통과하지 못했다. 이 결과로 integration candidate 또는 LLM-friendly benefit을 주장하면 안 된다.

## 결과

| 항목 | A — Current docs | B — Structured knowledge | C — Local MCP |
| --- | ---: | ---: | ---: |
| Runs | 48 | 48 | 48 |
| First-pass correctness | 35.42% | 4.17% | 4.17% |
| Final correctness | 35.42% | 4.17% | 4.17% |
| Held-out first-pass correctness | 20.83% | 0% | 0% |
| Held-out final correctness | 20.83% | 0% | 0% |
| Successful-run token median | 12,682 | 6,406 | 5,470 |
| Successful-run model-call median | 3 | 3 | 3 |
| Successful-run time median | 9,536 ms | 6,398 ms | 6,131 ms |
| Total tokens | 643,846 | 362,050 | 306,752 |
| Model calls | 144 | 144 | 144 |
| MCP calls | 0 | 0 | 144 |
| Recorded cost | $1.694203 | $0.764902 | $0.898656 |

B/C paid spend는 합계 **$1.663558** / 승인된 $6.00다.
A 비용은 historical baseline이며 B/C spend에 합산하지 않는다.

## 사전 기준 판정

- Held-out final correctness: failed
- Held-out first-pass correctness: failed
- Overall final correctness: failed
- Overall first-pass correctness: failed
- C versus B final-correctness guard: passed
- Successful-chart token reduction: 56.87%, passed
- Successful-chart model-call reduction: 0%, failed
- Successful-chart time-to-valid reduction: 35.71%, passed
- Efficiency thresholds passed: 2 / 2
- Final decision: **FAILED**

## Failure distribution

- B: {"invalid-program":19,"runtime-error":27}
- C: {"runtime-error":46}

## 재현성과 증거

- Candidate commit: `e88fbea9761ddc46268c400be1af280e838b71a2`
- Resolved model B/C: `gpt-5.6-terra` / `gpt-5.6-terra`
- B raw SHA-256: `091c139bdc2c0ed31d5c8b1e1848fb3895adac9a0c724dc6b72a4a7fbd151ffd`
- C raw SHA-256: `97e35c048a177d7124311e8ec88afe64880d034dae89092012e4ce8841be52a8`
- Output root: `.artifacts/llm-eval/executable-recipe-full-e88fbea9`

Machine-readable aggregate와 sanitized task records는 [LLM_CORRECTED_COMPARISON.json](./LLM_CORRECTED_COMPARISON.json)이
소유한다. API key, raw provider response, reasoning text와 complete submitted source는 포함하지 않는다.
