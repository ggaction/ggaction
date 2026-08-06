# Current-Docs LLM Baseline (Condition A)

## 한눈에 보는 결과

Starting commit `9414d07179c9e7c6bbfdf00b762fc35de0ff25ec`의 현재 public docs만 제공한 상태에서 `gpt-5.6-terra`로
24개 task를 두 번씩 총 48회 실행했다. 모델은 task당 최대 세 번 호출할 수 있었고, 생성 프로그램은 실제
dataset과 package로 실행한 뒤 요청된 Canvas/SVG/PNG/PDF output을 통과해야 정답으로 처리했다.

| 항목 | 결과 |
| --- | ---: |
| First-pass correctness | 17/48 (35.42%) |
| Final correctness | 17/48 (35.42%) |
| Authoring final correctness | 12/24 (50%) |
| Held-out final correctness | 5/24 (20.83%) |
| Successful-run tokens | 12,682 median / 16,811 p95 |
| Successful-run model calls | 3 median / 3 p95 |
| Successful-run time-to-valid | 9,536 ms median / 15,419 ms p95 |
| Total tokens | 643,846 |
| Total model calls | 144 |
| Actual estimated cost | $1.6942 |

## 실패 분포

- `invalid-program`: 27
- `missing-action`: 2
- `runtime-error`: 2

`invalid-program`은 task당 세 번의 model call 안에 `submit_program`을 호출하지 못한 경우다. 실행 오류와 required
domain action 우회는 별도 category로 유지했다. 실패와 timeout은 correctness denominator에서 제외하지 않았다.

## 해석

- 현재 `llms.txt`는 정확한 docs로 가는 route를 제공하지만, 복합 task에서는 model이 세 호출을 문서 탐색에 모두
  사용하고 프로그램을 제출하지 못하는 경우가 가장 컸다.
- 성공한 task에서도 model-call median은 3으로 제한 상한과 같았다. Roadmap 5.3은
  단순히 정답률만 높이는 것이 아니라 이 탐색 호출과 token/time을 줄여야 한다.
- Renderer parity 두 반복은 Canvas/SVG/PNG/PDF를 모두 통과해 multi-renderer docs 자체는 현재도 강한 route임을
  보여준다.
- 이 결과는 미리 고정한 A/B/C acceptance rule의 A 기준선이며, threshold는 결과를 본 뒤 바꾸지 않는다.

Machine-readable aggregate와 48개 sanitized run record는
[`CURRENT_DOCS_BASELINE.json`](./CURRENT_DOCS_BASELINE.json)이 소유한다. API key, raw response body와 generated source는
포함하지 않는다.
