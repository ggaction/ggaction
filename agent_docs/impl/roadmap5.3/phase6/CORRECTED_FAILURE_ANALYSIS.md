# Corrected Full-Evaluation Failure Analysis

## 판정

Candidate `e88fbea9761ddc46268c400be1af280e838b71a2`는 frozen acceptance threshold를 통과하지 못했다.
Self-contained `scatterplot` recipe 교정은 B와 C 모두 두 반복에서 재현됐지만, 다른 23개 task에는 일반화되지 않았다.

| 항목 | A | B | C |
| --- | ---: | ---: | ---: |
| Final correctness | 35.42% | 4.17% | 4.17% |
| Held-out final correctness | 20.83% | 0% | 0% |
| Successful runs | 17/48 | 2/48 | 2/48 |
| Failure distribution | 31 failures | 19 invalid + 27 runtime | 46 runtime |

Primary held-out correctness, overall correctness와 first-pass gain이 모두 실패했다. C는 성공한 두 scatterplot만 놓고
token 56.87%와 time-to-valid 35.71% 감소를 보였고 efficiency threshold 2/3을 통과했지만, correctness guard를
통과하지 못했으므로 최종 판정은 `FAILED`다.

## 정상 동작한 경계

- B와 C 모두 48개 unique run을 exact deterministic order로 완료했다.
- Resolved model은 전부 `gpt-5.6-terra`였고 provider, timeout, budget failure는 0이었다.
- B는 model call 144회, C는 model call 144회와 MCP call 144회를 기록했다.
- C의 모든 run은 `search_ggaction → read_mcp_resource → submit_program`으로 세 호출 안에 제출했다.
- B/C 모두 `cars-scatter-origin-r1`과 `r2`에서 first-pass/final validation과 Canvas rendering을 통과했다.
- Actual spend는 B $0.7649018, C $0.8986558, 합계 $1.6635576 / approved $6였다.

따라서 이번 실패는 model identity, provider transport, local MCP protocol, spend guard 또는 evaluator infrastructure
문제가 아니다.

## 제출 전 병목 — Condition B

B는 48회 중 29회만 `submit_program`에 도달했다. 나머지 19회는 frozen 3-call envelope 안에서 세 번째 호출을 추가
검색이나 read에 사용했다.

| B call flow | Runs |
| --- | ---: |
| search → read → submit | 29 |
| search → read → search/read/docs | 19 |

Structured search 결과가 존재해도 model이 첫 read를 실행 가능한 완결 답으로 판단하지 못하면 제출 turn이 남지 않는다.
이는 B의 retrieval result가 항상 primary executable recipe로 수렴하도록 route와 payload를 더 명확히 해야 함을 뜻한다.

## 제출 뒤 병목 — Runtime API hallucination

B/C runtime error 73건 중 66건, 전체 실패 92건 중 66건은 존재하지 않는 renderer function을 import한 경우다.

| Runtime error family | B | C | 합계 |
| --- | ---: | ---: | ---: |
| `renderCanvas` / `renderToCanvas` import | 25 | 38 | 63 |
| `renderPDF` import | 1 | 2 | 3 |
| `Chart` constructor import | 0 | 2 | 2 |
| Invalid facade options or actions | 1 | 4 | 5 |
| Runtime errors total | 27 | 46 | 73 |

가장 많은 오류는 `ggaction` 또는 `ggaction/basic`에서 `renderCanvas`를 import한 제출이다. Renderer-parity task는
`ggaction/pdf`의 존재하지 않는 `renderPDF`를 사용했다. 나머지는 `createScatterPlot({ opacity })`,
`createBoxPlot({ color })`와 존재하지 않는 `createSelection` 같은 option/action shape 오류다.

## Knowledge payload audit

Generated knowledge의 33개 recipe를 검사한 결과:

- 정확한 `import { chart, render } from "ggaction"` 포함: **1 / 33**
- 실제 `render(program, context)` Canvas invocation 포함: **1 / 33**
- 두 항목을 모두 가진 recipe: `scatterplot` 하나

Gate F에서 교정한 유일한 recipe가 전체 평가에서 유일하게 성공한 task와 정확히 일치한다. 이는 다음 인과 설명을
강하게 지지한다.

1. Search와 MCP는 recipe를 찾고 읽는 데 성공한다.
2. `scatterplot`은 complete runtime wrapper를 제공해 executable submission으로 이어진다.
3. 나머지 recipe는 domain action chain은 제공하지만 package import와 renderer invocation을 완결하지 않는다.
4. Model은 빈 부분을 추측해 존재하지 않는 renderer API를 반복적으로 생성한다.

## Condition B와 C의 차이

C는 모든 run에서 정확히 하나의 MCP resource를 읽고 제출해 B의 19개 no-submission을 제거했다. 이는 local MCP resource
route가 structured tool loop보다 제출 전환에는 더 안정적이라는 증거다. 그러나 C의 46개 제출이 모두 runtime error로
끝났기 때문에 transport 개선만으로 correctness는 높아지지 않았다.

C는 B보다 전체 token을 55,298개 적게 사용했지만 비용은 $0.133754 더 높았다. Output/reasoning과 cache-write mix가
달랐기 때문이다. 비용 차이는 correctness benefit으로 해석하지 않는다.

## 다음 권고

현재 branch를 integration candidate로 승인하거나 LLM-friendly benefit을 주장하지 않는다. PR/merge도 계속 차단한다.

다음 correction을 원하면 별도 Gate에서 다음 범위를 먼저 무과금으로 검증해야 한다.

1. 32개 incomplete recipe 모두에 package entry, exact import, build function과 renderer invocation을 canonical source에서
   생성한다.
2. Canvas뿐 아니라 SVG/PNG/PDF task가 읽는 recipe에 renderer별 정확한 import와 invocation을 포함한다.
3. Facade option과 lifecycle action shape를 runnable variant로 제공하고 generated payload와 public recipe를 동기화한다.
4. Frozen 24-task corpus의 각 task를 대표하는 deterministic executable recipe program을 offline evaluator로 24/24
   통과시킨다.
5. B search가 action leaf보다 primary task recipe로 수렴하는지 offline trace fixture로 검증한다.
6. 위 무과금 evidence가 통과한 뒤에만 새 candidate와 작은 paid smoke를 다시 제안한다.

Acceptance threshold, model, corpus, 3-call envelope 또는 evaluator를 완화해서 결과를 통과시키지는 않는다.
