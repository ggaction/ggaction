# Gate R53-P6-I — Systematic Executable Recipe Correction

## Gate state

`approved`

Gate package checkpoint: `9f73bd7d`

Approved by the user on 2026-08-07.

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 결정

Gate H의 실패는 search나 local MCP transport가 아니라, 33개 generated recipe 중 `scatterplot` 하나만 package import부터
Canvas rendering까지 완결된 데서 발생했다. 이번 correction은 나머지 32개 recipe를 같은 executable 수준으로 올리고,
frozen 24-task corpus 전체를 외부 model 호출 없이 먼저 검증한다.

```text
32 incomplete recipes
  → declared input만 남긴 complete JavaScript source
  → exact public imports, supported options와 final renderer call
  → generated knowledge / deterministic search / local MCP 동기화
  → frozen 24 tasks의 recipe-backed offline programs 24/24
  → rendered 24-task gallery와 cumulative checks
  → Gate J review
```

이 Gate는 무과금 correction 계획만 승인한다. Paid smoke, full evaluation, PR, merge, publish, deploy와 release는 별도
승인 없이는 실행하지 않는다.

## 고정된 문제 범위

현재 `docs/llms-recipes.json` audit에서 exact `chart, render` import와 실제 `render(program, context)`를 모두 가진 recipe는
`scatterplot` 1/33이다. 다음 32개가 incomplete다.

- Chart/task recipes: `annotations`, `bar-chart`, `box-plot`, `composition`, `density-area`, `error-band`, `error-bar`,
  `facet`, `gradient-plot`, `heatmap`, `histogram`, `horizon`, `line-chart`, `parallel-coordinates`, `path-ordering`,
  `regression-scatterplot`, `rose-chart`, `tick-distribution`, `time-series-derivation`, `violin-plot`
- Lifecycle/focused recipes: `cartesian-guide-lifecycle`, `category-ordering`, `derived-data-workflows`, `grid-lifecycle`,
  `legend-title-lifecycle`, `mark-lifecycle`, `polar-guide-lifecycle`, `ranged-and-specialized-encodings`,
  `resource-and-facet-policies`, `selection-lifecycle`, `statistical-owner-revisions`
- Extension recipe: `extension-domain-action`

Frozen corpus의 24개 task 중 `scatterplot`을 포함한 22개 distinct primary recipe route를 사용한다. Task와 직접 연결되지
않은 나머지 focused recipe도 incomplete 상태로 남기지 않고 동일 contract로 교정한다.

## 승인할 구현 계약

### 1. Self-contained의 정확한 의미

각 generated `exampleSource`는 recipe의 `inputs`에 선언된 데이터와 option, 그리고 문서에서 명시한 host element만 외부
입력으로 받을 수 있다. 다음 항목을 추측하게 두지 않는다.

- package entry와 exact named imports
- immutable `ChartProgram`을 만드는 전체 action chain
- 필요한 dataset, mark, scale, guide, selection과 composition의 explicit ID
- supported option shape와 action order
- 최종 Browser Canvas context 획득, missing-context error와 `render(program, context)` 호출

Lifecycle recipe는 이미 만들어진 `program`을 가정하지 않고 필요한 시작 상태부터 생성한다. Extension recipe도 wrapped
domain action 정의, 설치, 실행과 최종 rendering까지 한 source에서 보여준다. 큰 dataset을 코드에 복제하지 않고 recipe가
선언한 `values` 같은 입력은 runner와 사용자가 제공한다.

### 2. Renderer contract

- 모든 33개 recipe는 정확한 Browser Canvas route를 가진다.
- `renderer-parity` task가 읽는 route에는 동일 immutable program을 재사용하는 네 renderer의 실제 package API를 제공한다:
  `render` from `ggaction`, `renderToSVG` from `ggaction/svg`, `renderToPNG` from `ggaction/png`, `renderToPDF` from
  `ggaction/pdf`.
- PNG의 `pixelRatio: 2`, one-page vector PDF와 logical dimension equality를 existing evaluator로 검증한다.
- 존재하지 않는 `renderCanvas`, `renderToCanvas`, `renderPDF`, `Chart` constructor를 generated source와 route에서 금지한다.

Runtime renderer implementation이나 package export는 바꾸지 않는다.

### 3. Canonical source와 생성물

- Public docs의 recipe/focused JavaScript source가 사람이 읽는 canonical executable example을 계속 소유한다.
- `knowledge/recipes/*.json`은 intent, steps, declared inputs와 provenance를 소유한다.
- `scripts/recipe-knowledge.js`는 canonical source에서 `exampleSource`를 생성하고 completeness와 executable contract를
  검증한다. 같은 wrapper를 generated JSON에 손으로 복사하지 않는다.
- `knowledge/index.json`, `knowledge/search-index.json`, `docs/llms-actions.json`, `docs/llms-recipes.json`, public LLM docs와
  MCP exact-read payload를 한 번에 재생성한다.
- Existing knowledge schema v2와 recipe source schema v1은 유지한다. Public library API, persisted `ChartProgram` shape와
  core architecture를 변경하지 않는다.

### 4. Exact option과 lifecycle variants

Gate H에서 관측한 잘못된 사용을 직접 차단한다.

- `createScatterPlot({ opacity })` 대신 지원되는 appearance action/option을 사용한다.
- `createBoxPlot({ color })` 대신 지원되는 color encoding flow를 사용한다.
- 존재하지 않는 `createSelection` 대신 current selection lifecycle action을 정확한 ID와 selector로 사용한다.
- 여러 compatible resource가 생기는 recipe는 첫 항목 추론에 기대지 않고 public ID를 명시한다.
- 생성 source의 top-level trace가 recipe의 primary/lifecycle step과 일치하는지 검증한다.

### 5. Task-intent retrieval

Condition B가 첫 read를 action leaf에 소모하지 않도록 일반적인 chart/task intent query에서는 primary task recipe가 가장 먼저
나오게 한다. Exact action-name query는 해당 action이 계속 top 1이다.

- Frozen 24 query: expected primary recipe top 1
- Frozen prompt를 복사하지 않은 task-intent paraphrase: expected primary recipe top 1
- Exact action/recipe name: matching record top 1
- Deterministic tie-break, result/byte/query-term limit과 read-only MCP parity 유지

Task ID, dataset 이름, oracle validation 이름을 production ranking rule에 넣지 않는다. Intent, chart family, action/recipe
backlink와 일반화 가능한 synonym만 사용한다.

## 구현 순서

1. **Executable contract와 inventory guard** — 33/33 completeness 기준, 금지된 renderer/API 이름, declared-input 경계와
   32개 incomplete baseline을 기계적으로 고정한다.
2. **Task-relevant recipes** — frozen 24 tasks가 사용하는 incomplete primary route를 먼저 교정하고 task별 exact source를
   실행한다.
3. **나머지 focused/extension recipes** — lifecycle 시작 상태, explicit ID와 final render를 포함해 33/33을 완성한다.
4. **Retrieval correction** — task-intent에서는 recipe-first, exact action query에서는 action-first가 되게 search evidence를
   보강한다.
5. **Generated/MCP synchronization** — public docs, generated knowledge, search index와 local MCP exact read가 같은 source를
   반환하게 한다.
6. **Complete unpaid verification** — 24-task offline evaluator, 33-recipe execution, rendered gallery, focused/full/package/docs/
   installed-MCP/browser-isolation checks를 실행한다.

각 conceptual change는 검증 뒤 별도 commit으로 push한다. 구현 중 public API, source schema 또는 architecture 변경이
필요해지면 진행을 멈추고 별도 결정을 요청한다.

## Gate J 완료 증거

Gate I 승인 뒤 구현 결과는 별도 **R53-P6-J**에서 다음 증거와 함께 검토한다.

- Generated recipe completeness: **33/33**
- Exact generated source execution: **33/33**
- Frozen recipe-backed offline task result: **24/24 final valid**
- Authoring 12개와 held-out 12개 rendered result를 확인할 수 있는 contact sheet 및 개별 artifact
- Renderer parity: Canvas, SVG, PNG pixelRatio 2와 one-page vector PDF 모두 통과
- Frozen 24 + paraphrase retrieval의 recipe-first 결과와 exact-name regression 결과
- Generated docs/knowledge hash synchronization, local MCP exact-read parity와 sanitized evidence
- Focused tests, full `npm test`, docs/generated/package/installed-MCP/browser-isolation checks
- External model calls와 추가 비용: **0**
- Clean remote implementation checkpoint

Offline 24/24는 recipe source가 evaluator에서 실행된다는 증거이지 LLM 성능 개선을 뜻하지 않는다. Gate J 승인 뒤에도
새 candidate SHA, isolated output root, representative task와 낮은 hard cap을 가진 paid smoke를 Gate K로 별도 제안한다.

## 바꾸지 않는 것

- Frozen 24 tasks, datasets, prompts, oracle, authoring/held-out split와 shuffle seed
- `gpt-5.6-terra`, reasoning/verbosity/service tier, token ceiling과 3-model-call envelope
- Phase 0 A baseline, acceptance threshold와 scoring implementation
- Runtime renderer behavior와 public package exports
- Hosted MCP, network/file/code-execution capability

Evaluator나 acceptance 기준을 완화해 통과시키지 않는다.

## 승인 효과와 계속 차단되는 범위

Gate I를 명시적으로 승인하면 위 32-recipe correction과 무과금 Gate J evidence 준비만 해제된다.

사용자는 위 범위를 승인했다. 구현은 verified conceptual checkpoint마다 commit·push하고 Gate J에서 다시 멈춘다.

계속 차단된다.

- 모든 external/paid model call
- Correctness 또는 LLM-friendly benefit claim
- PR preparation/Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 근거

- Failed full result: [`GATE_H.md`](./GATE_H.md)
- Root-cause audit: [`CORRECTED_FAILURE_ANALYSIS.md`](./CORRECTED_FAILURE_ANALYSIS.md)
- Frozen benchmark contract: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
- Existing corrective delivery contract: [`GATE_C.md`](./GATE_C.md)
