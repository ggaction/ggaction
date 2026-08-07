# Gate R53-P6-M — Complete Task-Closed Recipe Evidence

## Gate state

`approved`

Approved by the user on 2026-08-07 through the instruction to continue to the next paid Gate.

Implementation checkpoint: `622286f9501bd76b89e0a4e8a694c5f3b603f098`

Implementation tree: `061c1bdd3607928d74e19d80c2674662f1e0f83d`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 결과

Gate L의 task-closed correction을 완료했다. 이번에는 사람이 따로 작성한 정답 프로그램이 아니라, 모델에게 실제 전달되는
generated recipe source를 실행해 얻은 action과 runtime function만으로 frozen task 24개가 닫히는지 검증했다.

```text
exact delivered recipe payload
  → 33 / 33 executable
  → frozen task closure 24 / 24
  → dependency 0~1개, 위반 0
  → mocked B/C box + composition first submission valid
  → offline chart 24 / 24 + renderer parity
  → package / installed MCP / browser / full-suite safety checks
  → external model call 0, additional cost $0
```

이 evidence는 payload가 frozen task의 필요한 public flow를 전달하고 evaluator가 이를 실행할 수 있다는 무과금 증거다. 실제
model의 correctness, token, call count 또는 time-to-valid 개선은 아직 주장하지 않는다.

## 구현 결과

### 1. Task-closed primary recipe

Gate K에서 직접 실패한 두 payload를 다음처럼 교정했다.

- Box plot은 `createBoxPlot({ color })`가 아니라 facade 뒤의
  `encodeColor({ target: "boxPlot", ... })`를 실행하고, redundant legend를 끄는 경계를 설명한다.
- Composition은 stable child ID, `hconcat`, `editCompositionLayout`, `replaceCompositionChild`를 source에서 실제로
  실행한다. Rose child는 별도 `rose-chart` dependency의
  `createArcMark → encodeTheta → encodeR → encodeColor` flow로 전달하며 `createRoseChart`가 없음을 명시한다.

24-task payload audit에서 추가로 드러난 regression annotation, histogram/error-bar title, grouped-bar filter/order,
multi-legend color/opacity, time-unit/window, rug x-axis와 Horizon filter의 누락도 executable source에 보강했다. Public API,
knowledge schema, `ChartProgram`과 renderer는 바꾸지 않았다.

### 2. Frozen delivery closure matrix

`test/llm/recipe-delivery-matrix.json`은 24개 task 각각에 primary recipe, dependency 0~1개와 known trap을 고정한다. Test는
generated source를 실제 실행해 얻은 nested trace의 action union과 exact import/renderer guidance의 runtime function union을
사용한다.

- Required actions: **24 / 24 closed**
- Alternative action sets: **all satisfied**
- Required runtime functions: **24 / 24 closed**
- Forbidden public primitive calls: **0**
- Known box/composition trap warning: **2 / 2 present**
- Primary task query and independent paraphrase: **24 / 24 top 1**
- Dependency count: task당 **0~1**, 위반 **0**
- Composition dependency `rose-chart`: one-search result 안에서 routable
- Task ID, dataset name와 oracle validation name을 production ranking에 넣은 항목: **0**

이 검증은 별도 hand-authored final program에 recipe ID만 붙이는 방식을 closure evidence로 세지 않는다.

### 3. Bounded read와 mocked B/C flow

Condition B, Condition C와 installed local MCP는 다음 규칙을 동일하게 전달한다.

1. Search는 한 번만 실행한다.
2. Primary action/recipe 하나를 exact read한다.
3. Composite task가 다른 chart family를 명확히 요구할 때만 dependency recipe 최대 하나를 같은 model response에서 읽는다.
4. 추가 search/read 없이 complete program을 제출한다.

Mocked Responses flow 결과:

| Task | Condition B | Condition C | Model calls | First submission |
| --- | --- | --- | ---: | --- |
| `cars-box-plot` | search + one recipe read | search + one MCP recipe read | 2 | valid |
| `composed-dashboard` | search + two parallel recipe reads | search + two parallel MCP reads | 2 | valid |

네 flow 모두 final valid이고 repair round는 0이다. Maximum model-call ceiling 3과 C MCP-call ceiling 8은 그대로다. Local
MCP는 read-only이며 network, file, code execution 또는 renderer capability를 추가하지 않았다.

### 4. Executable와 visual evidence

- Generated recipe exact source: **33 / 33 executable Canvas render**
- Frozen offline task program: **24 / 24 final valid**
- Authoring: **12 / 12**
- Held-out: **12 / 12**
- Browser isolation: **53 / 53**
- Canvas / SVG / PNG 2x / vector PDF renderer parity: passed

Authoring, held-out와 four-renderer contact sheet를 직접 확인했다. 모든 panel이 non-empty이고, regression line/label,
box/violin/outlier, multi-legend, composition replacement와 네 renderer의 geometry가 식별 가능하며 서로 겹치지 않는다.

## Cumulative verification

### Passed

- Focused recipe/evaluation/search/MCP/offline contracts: **35 / 35**
- `knowledge:check`
- `recipes:check`: **33 / 33**
- `docs:actions:check`
- `docs:reference:check`
- `docs:signatures:check`
- `docs:capabilities:check`
- `docs:metadata:check`
- `docs:search:check`
- `examples:index:check`
- `package:check`
- Installed package consumer: Node, extension, TypeScript, browser bundle, SVG, PNG, PDF와 private-export checks passed
- Installed local MCP package/source discovery and payload parity: passed
- Browser isolation: **53 / 53**
- External model calls: **0**
- Additional model spend: **$0**

### Full-suite safety guards

현재 `npm test`는 **2,115 / 2,129 passed, 14 rejected**다. 14개는 product/runtime/recipe 실패가 아니라 이전에 승인된
paid candidate의 고정 knowledge SHA가 현재 candidate와 달라서 credential read 전에 거부한 historical safety guard다.

- `test/contracts/llm-full-evaluation.test.js`: 6개
- `test/contracts/llm-paid-smoke.test.js`: 1개
- `test/contracts/llm-systematic-smoke.test.js`: 7개
- Rejection owner: `knowledgeSha256 changed`

Historical Gate G/H/K plan hash를 현재 candidate로 바꾸지 않았다. 새 candidate용 paid retry는 별도 Gate N 승인 전에는
실행할 수 없다. 그 14개를 제외한 새 product, delivery, package와 browser failure는 **0**이다.

## Evidence digests

| Evidence | SHA-256 |
| --- | --- |
| `knowledge/index.json` | `9dc09e3faabed04eb36aaa6121072d9860e027e680b6d13d7bdd854f1684a9df` |
| `knowledge/search-index.json` | `2aa288d2c805a02d3c9f675fc5e8a8f7bbe203dff8af7f5b72ddae45cab352d4` |
| `docs/llms-recipes.json` | `221a4bda37bd960800068f289051969855045c9bbe30b549cec995b027ae1cb3` |
| Delivered recipe closure manifest | `78f8a430ec1bd179a5e7134fb6e278f4b4954ff51ca97d3130dd703885d7d17e` |
| Offline task manifest | `14335d1b859517051d4f348d6ffd48ac1592f9e89ac4ccedb3764ca3bedf3077` |
| Authoring contact sheet | `54d8ea3f58b9ff2171fb3ec84f6f9bd6e4fff3936d48579236fd8dee5110cd23` |
| Held-out contact sheet | `0ba4909952aa6377aa3ad72014a033c8b384b12d5b0d3860e15e891db00d2060` |
| Renderer parity contact sheet | `aaa6ec84114c5c2bbe5f1f8dbb194388f74f71927c19e25ed57a706b57dfb85c` |

## 승인 효과와 남은 경계

사용자의 지시에 따라 이번 무과금 Gate M evidence와 correction 완료를 승인 상태로 기록했다. 다음에는 동일한 세 frozen
task의 새 candidate paid retry를 Gate N으로 제안할 수 있다.

계속 차단된다.

- External/paid model call과 credential read
- Frozen 24-task full B/C evaluation
- Correctness/efficiency benefit claim
- Historical paid-plan hash 변경
- PR preparation, Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 근거

- Approved correction contract: [`GATE_L.md`](./GATE_L.md)
- Failed smoke and exact task scope: [`GATE_K.md`](./GATE_K.md)
- Failure analysis: [`SYSTEMATIC_SMOKE_ANALYSIS.md`](./SYSTEMATIC_SMOKE_ANALYSIS.md)
- Frozen benchmark contract: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
