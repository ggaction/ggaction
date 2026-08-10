# Paid Smoke Attempt 4 — Valid v4 Result

## Immutable identity

| Item | Value |
| --- | --- |
| Repair approval | R54-P5-E Option A |
| Product candidate | `4eb8ce78b705c160394e0a0e0bafc557f54008c0` |
| Plan | `evaluation/compact-authoring-paid-smoke-v4/PLAN.json` |
| Plan SHA-256 | `68006c3b61751108eb91a75a4a8eb5f4a93862a00762efa95d22340673bf7228` |
| Route oracle | `evaluation/compact-authoring-paid-smoke-v4/ROUTE_ORACLE.json` |
| Route oracle SHA-256 | `1b9e7adeb8f29d3f1f43818082ac74beff76c44c533c0d7076b70f3265ce48e8` |
| Final result | `evaluation/compact-authoring-paid-smoke-v4/results/RESULT.json` |
| Final result SHA-256 | `09bf0e82c3dcffce68dca839f9565eb65549249c9eb9ef39ecd323e494159cf7` |
| Final progress | `evaluation/compact-authoring-paid-smoke-v4/results/IN_PROGRESS.json` |
| Final progress SHA-256 | `6fb42eff29df87989402aec67f54d90ef1c008201577d1255d44700e2a7bdc80` |
| Credential reads | 1 |
| Automatic retries | 0 |

## 원인별 수정

Attempt 3의 9개 실패를 결과 확인 뒤 성공으로 재분류하지 않고 세 원인에 대응하는 별도 schema v3 candidate를 만들었다.

1. 모든 authoring packet은 domain action 앞에 `chart()`, `createCanvas({})`와
   `createData({ values })` prerequisite를 순서대로 제공한다. Benchmark 전용 wrapper나 고정 크기는 주입하지 않는다.
2. 이미 결론 난 limitation은 terminal `unsupported`에, 추가 선택이 필요한 상태는 resource URI를 가진 open
   `unresolved`에 둔다. MCP-first route는 후자에만 문서를 읽는다.
3. Public LLM docs는 한 bounded authoring page에서 bootstrap, histogram, regression, renderer와 canonical unsupported
   identity를 제공한다. Fixed 문구뿐 아니라 새 histogram/regression/renderer/limitation 표현도 같은 family route로 닫는다.

Legend 위치처럼 생성과 동시에 적용해야 하는 옵션은 별도 존재하지 않는 guide를 수정하지 않고 facade action call에 합성한다.
Direct adapter와 installed local MCP는 complete schema v3 packet을 byte-equal하게 전달한다.

## Versioned evaluation boundary

Attempt 1/2/3의 plan, progress와 result는 byte-for-byte 보존했다. v4는 같은 네 task, query, dataset과 correctness identity를
사용하고 terminal/open route semantics만 별도 oracle에 고정한다.

| Task | D route | Calls if first pass |
| --- | --- | ---: |
| Histogram | search → submit | 2 |
| Regression layers | search → submit | 2 |
| PDF + JPG | search → submit; JPG는 terminal | 2 |
| 3D + JPEG | search → explicit renderer resource read → submit | 3 |

Evaluation prompt는 function name과 caller data variable 같은 실행 context만 제공한다. `createData({ values })` 같은 ggaction
정답, canonical unsupported ID 또는 제출할 complete program은 제공하지 않는다.

## 무비용 검증

| Evidence | Result |
| --- | --- |
| Fixed A/B/C/D route dry-run | 16 / 16 pass |
| Dry-run credential reads / external calls / spend | 0 / 0 / `$0` |
| Direct/local-MCP schema v3 byte equality | pass |
| Terminal D route docs reads | 0 |
| Open-decision D route docs reads | 1 explicit resource |
| Fresh query family closure | pass |
| Package artifact | 420 entries; 423,858 packed / 2,172,178 unpacked bytes |
| Installed tarball consumer | pass; MCP cold start 446 ms |
| Browser bundles | full 222,930 / basic 112,984 / SVG 5,760 gzip bytes |
| Public docs | 45 / 45 tests; 115-page build; 320/390/768 browser widths pass |
| Contract suite before Gate package | 206 / 206 pass |
| Full repository suite | 2,100 / 2,100 pass |
| Historical Attempt 1/2/3 hash contracts | pass |

Gate package가 추가한 exact-plan hash contract와 누적 수치는 [`GATE_F.md`](./GATE_F.md)가 소유한다.

## Exact paid outcome

Runner/provider error, budget stop 또는 retry 없이 fixed 16 task-runs를 모두 완료했다. Strict pass는 13 / 16이며 실패 3건을
성공으로 재분류하지 않는다.

| Metric | Result |
| --- | ---: |
| Completed task-runs | 16 / 16 |
| Strict pass | 13 / 16 |
| Billed model calls | 37 / 48 maximum |
| Input tokens | 41,928 |
| Cached input tokens | 5,734 |
| Cache-write tokens | 19,757 |
| Output tokens | 5,258 |
| Reasoning tokens | 2,841 |
| Total tokens | 47,186 |
| Spend | `$0.1465093` |

| Condition | Pass | Calls | Input | Output | Cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| A — public docs | 1 / 4 | 12 | 15,431 | 2,222 | `$0.0548708` |
| B — compact direct | 4 / 4 | 8 | 8,173 | 1,013 | `$0.0300855` |
| C — compact MCP | 4 / 4 | 8 | 8,221 | 1,007 | `$0.0301220` |
| D — MCP-first/docs fallback | 4 / 4 | 9 | 10,103 | 1,016 | `$0.0314310` |

## 실패 3건의 분류

실패는 모두 A public-docs condition에만 있다. B/C/D compact routes는 12 / 12를 통과했다.

1. **Regression program:** 모델은 `/recipes/regression-scatterplot/`을 읽고도
   `createData({ rows })`를 제출했다. 읽은 문서 예시는 정확히 `createData({ values: cars })`이므로 current docs의 signature
   부재가 아니라 한 번의 model application failure다.
2. **PDF + JPG:** 모델은 `/llm-authoring/#complete-program-bootstrap`을 읽었지만 canonical `unsupported.jpg` 대신 `JPG`를
   제출했다. 같은 페이지에 canonical ID가 있으나 읽은 fragment가 bootstrap으로 제한되어 identity section을 직접 읽지는
   않았다. 이는 broad public-doc search/read의 bounded-route weakness다.
3. **3D + JPEG:** 모델은 `/llm-authoring/`을 읽고 `unsupported.3d`와 `unsupported.jpg`는 정확히 제출했지만 open
   `renderer.format`을 누락했다. 이는 prose에서 terminal limitation과 open decision을 함께 적용하는 데 실패한 docs-route
   application error다.

이 분류 뒤 public docs, search rank, task, oracle, evaluator 또는 threshold를 수정하지 않는다. 세 실패는 A baseline의 exact
결과로 남기며 추가 호출로 재시도하지 않는다.

## 결론

v4는 valid complete smoke다. Compact direct/local-MCP/MCP-first가 모두 4 / 4이고 direct/MCP usage도 근접해 candidate knowledge와
transport가 실제 호출에서 닫혔다는 positive signal을 제공한다. A의 1 / 4와 candidate routes의 12 / 12 차이는 full evaluation
범위를 별도 R54-P5-G에서 제안할 근거는 되지만, 한 repetition으로 efficiency 우위나 statistical superiority를 주장하지 않는다.
Complete paid evaluation, integration과 PR은 아직 승인되지 않았다.
