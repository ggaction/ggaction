# Roadmap 5.3 A/B/C LLM Comparison

## 결론

현재 candidate는 사전 승인한 acceptance threshold를 **통과하지 못했다**. Condition B와 C 모두 48회 중 프로그램을
한 번도 제출하지 못해 final correctness가 0%였다. 따라서 이 결과로 LLM-friendly correctness 또는 efficiency
개선을 주장하거나 현재 branch를 integration candidate로 승인하면 안 된다.

## 결과

| 항목 | A — Current docs | B — Structured knowledge | C — Local MCP |
| --- | ---: | ---: | ---: |
| Runs | 48 | 48 | 48 |
| First-pass correctness | 35.42% | 0% | 0% |
| Final correctness | 35.42% | 0% | 0% |
| Held-out final correctness | 20.83% | 0% | 0% |
| Successful-run token median | 12,682 | n/a | n/a |
| Successful-run model-call median | 3 | n/a | n/a |
| Successful-run time median | 9,536 ms | n/a | n/a |
| Total tokens | 643,846 | 389,011 | 308,896 |
| Model calls | 144 | 144 | 144 |
| MCP calls | 0 | 0 | 380 |
| Recorded cost | $1.694203 | $0.795406 | $0.729342 |

B/C paid spend는 합계 **$1.524748**로 승인된 $10 combined cap 안에 있다. A 비용은 당시
승인된 가격표로 기록된 historical baseline이며 B/C와 직접적인 acceptance metric으로 사용하지 않는다.

## 사전 기준 판정

- Primary held-out final correctness: A 20.83% → C 0%, failed
- Primary held-out first-pass correctness: A 20.83% → C 0%, failed
- Overall final correctness: A 35.42% → C 0%, failed
- C versus B final regression guard: 0 percentage points, passed
- Successful-chart efficiency: C successful chart가 0개라 세 metric 모두 unavailable, failed
- Final decision: **FAILED**

## 실패 해석

- B와 C의 96개 run은 모두 model call 상한 3회를 사용했지만 submit_program을 한 번도 호출하지 않아
  invalid-program으로 분류됐다.
- C는 local MCP를 실제로 사용했고 task당 최대 8회의 실행된 MCP call을 기록했다. Runner와 model provider 중단은
  없었지만 bounded model loop 안에서 탐색을 끝내고 chart 제출로 전환하지 못했다.
- 따라서 현재 evidence는 knowledge의 존재나 MCP 설치 성공과 실제 chart-authoring 성능이 다르다는 것을 보여준다.
  다음 candidate는 benchmark threshold를 바꾸지 말고, bounded retrieval 결과가 더 적은 model turn 안에 직접
  실행 가능한 chart program으로 이어지도록 knowledge delivery를 수정한 뒤 새 비용 승인을 받아 재평가해야 한다.

## 재현성과 계측 기록

- B raw SHA-256: 1d51853f4a9bb46bbe2e3bdd7f98657dbd373253ed31d557b839ce98e1a3ea9e
- C raw SHA-256: 4d15a158233a39d6d2c8a291d3e00d3c3828c0231aa166cedaa8efe3f9757a02
- Resolved model: gpt-5.6-terra
- Knowledge commit: 6cc38d2c88cbb077515a4708dad48091524abeb5
- C 첫 smoke run에서 차단된 tool attempt까지 call로 세는 계측 문제를 발견했다. 실제 실행된 MCP call만 세도록
  a2ae9c72에서 수정하고 해당 raw record의 mcpCalls만 9에서 8로 교정했다. Model output, outcome, token과 cost는
  변경하지 않았다.

Machine-readable result와 sanitized task-level records는 [LLM_COMPARISON.json](./LLM_COMPARISON.json)이 소유한다.
API key, raw response body와 generated source는 포함하지 않는다.
