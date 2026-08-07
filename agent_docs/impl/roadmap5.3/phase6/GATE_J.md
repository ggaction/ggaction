# Gate R53-P6-J — Complete Unpaid Recipe Evidence

## Gate state

`ready-for-review`

Gate evidence checkpoint: `9ad707f4`

Implementation checkpoints:

- `cf2c20b3` — frozen 24-task executable evaluator와 renderer evidence
- `a44d3d4e` — 실제 실행된 top-level workflow action capture

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 결과

Gate I에서 승인한 32-recipe correction을 완료했다. Generated recipe 33개 모두가 package import부터 Browser Canvas
render까지 실행되며, frozen 24-task corpus도 각 primary recipe에 연결된 실제 `ChartProgram`으로 전부 생성·검증·렌더링된다.

```text
generated recipes 33/33 executable
  + frozen tasks 24/24 final valid
  + authoring 12/12 and held-out 12/12 rendered
  + Canvas / SVG / PNG / vector PDF parity
  + recipe-first retrieval and exact-name regression
  + generated / package / MCP / browser checks
  + external model calls 0
```

이 결과는 recipe delivery와 evaluator가 실행 가능하다는 무과금 증거다. LLM correctness, token, call count 또는
time-to-valid 개선을 입증한 결과는 아니며, 그런 claim은 별도 승인된 paid smoke와 이후 frozen evaluation 전까지 금지한다.

## 구현 결과

### 1. 33개 recipe의 완결성

- Generated recipe completeness: **33 / 33**
- Exact generated source execution: **33 / 33**
- 모든 source가 exact public package import, declared input, immutable action chain, Browser Canvas context guard와 final
  `render(program, context)`를 포함한다.
- Renderer guidance는 존재하지 않는 API 이름을 사용하지 않고 `render`, `renderToSVG`, `renderToPNG`, `renderToPDF`의
  정확한 package route를 보여준다.
- Public docs의 canonical source에서 generated knowledge, search index와 public LLM documents를 재생성한다. Generated
  JSON을 독립적으로 손수 복제하지 않는다.

### 2. Frozen 24-task 실행과 시각 증거

`npm run eval:recipes-offline` 결과:

| Split | Final valid | Rendered |
| --- | ---: | ---: |
| Authoring | 12 / 12 | 12 / 12 |
| Held-out | 12 / 12 | 12 / 12 |
| Overall | **24 / 24** | **24 / 24** |

각 task는 primary recipe ID, 실제 action trace, oracle validation, renderer 결과와 immutable program evidence를 manifest에
기록한다. Workflow action은 source text의 method 이름을 추측하지 않고 실행 중 top-level `ChartProgram` 호출만 capture한다.
따라서 dead code나 comment는 성공 증거가 될 수 없고, 합성 과정에서 실제 실행한 중간 action도 보존된다.

Rendered evidence:

- `.artifacts/llm-eval/recipe-task-programs/authoring-contact-sheet.png`
- `.artifacts/llm-eval/recipe-task-programs/heldout-contact-sheet.png`
- `.artifacts/llm-eval/recipe-task-programs/renderer-parity-contact-sheet.png`
- `.artifacts/llm-eval/recipe-task-programs/<task-id>/`의 개별 program과 renderer artifact

Contact sheet와 개별 chart를 시각 점검했다. Regression highlight/line/label, grouped bar의 category density, gradient
profile의 point와 legend, composition과 renderer parity가 비어 있지 않고 서로 겹치지 않는 것을 확인했다.

### 3. Renderer parity

동일 immutable program을 네 backend에 재사용했다.

| Renderer | Evidence |
| --- | --- |
| Browser Canvas | logical 640 × 400, non-empty |
| SVG | logical 640 × 400 vector output |
| PNG | `pixelRatio: 2`, physical 1280 × 800 |
| PDF | logical 640 × 400, one page, vector output |

PDF는 Poppler로 rasterize한 화면을 Canvas/SVG/PNG와 함께 육안 비교했고, PDF object scan에서 `/Subtype /Image`가 없는
vector output임을 확인했다. 네 결과의 chart geometry, colors, labels와 guides는 시각적으로 일치했다.

### 4. Retrieval과 delivery parity

- Frozen 24 task query: expected primary recipe **top 1**
- Frozen prompt를 복사하지 않은 24개 paraphrase: expected primary recipe **top 1**
- Exact action name 173개와 exact recipe name 33개: matching record **top 1**
- Search의 deterministic ordering, result/byte/query-term limits: passed
- Source discovery와 installed-package MCP discovery: identical
- Local MCP inventory: **173 actions, 33 recipes, 4 docs**
- MCP resources, templates, tools, exact read와 search payload: passed
- Installed MCP stderr credential/raw payload scan: clean

일반 task intent는 recipe로 먼저 안내하면서도 exact action lookup은 action leaf를 그대로 우선한다. Task ID, dataset 이름과
oracle 이름을 production ranking rule에 넣지 않았다.

## Cumulative verification

### Passed

- Focused recipe/evaluation/search contracts: **26 / 26**
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
- Installed package consumer: Node, extension, SVG, PNG, PDF, types, browser bundle와 private-export checks passed
- Installed local MCP package/source parity checks passed
- Browser isolation suite: **53 / 53**
- External model calls: **0**
- Additional model cost: **$0**

### Full-suite safety guards

현재 `npm test`는 **2,111 / 2,118 passed, 7 rejected**다. 7개는 product/runtime/recipe 실패가 아니라 과거 승인된 paid
candidate `e88fbea…`의 고정 SHA와 현재 corrected knowledge SHA가 다르기 때문에 정확히 거부한 paid-run safety guard다.

- `test/contracts/llm-full-evaluation.test.js`: 6개
- `test/contracts/llm-paid-smoke.test.js`: 1개
- Rejection: `knowledgeSha256 changed`

이 historical plan의 hash를 현재 candidate로 바꾸지 않았다. 그렇게 하면 Gate H의 봉인된 paid plan을 새 candidate에
재사용할 수 있게 되어 별도 승인 경계를 훼손한다. Product와 이번 correction에 관련된 나머지 **2,111개 test는 모두
통과**했고, 새 candidate용 paid plan은 Gate J 승인 이후 별도 Gate K에서만 제안할 수 있다.

## Evidence digests

| Evidence | SHA-256 |
| --- | --- |
| `knowledge/index.json` | `c8bd63f75021673a86c4d2f22a941cbb24647f8b0f4b615400148ce4934d504c` |
| `knowledge/search-index.json` | `df98a5216253af792fb1c1b4765127199c3bb2a91288c96d12808f25119538ed` |
| `docs/llms-recipes.json` | `f0452d6d235618fc45e3dfaad20ade128096d39379371d0b842a7f114d0efa13` |
| Offline manifest | `14335d1b859517051d4f348d6ffd48ac1592f9e89ac4ccedb3764ca3bedf3077` |
| Authoring contact sheet | `54d8ea3f58b9ff2171fb3ec84f6f9bd6e4fff3936d48579236fd8dee5110cd23` |
| Held-out contact sheet | `0ba4909952aa6377aa3ad72014a033c8b384b12d5b0d3860e15e891db00d2060` |
| Renderer parity contact sheet | `aaa6ec84114c5c2bbe5f1f8dbb194388f74f71927c19e25ed57a706b57dfb85c` |

## 바뀌지 않은 경계

- Public API, persisted `ChartProgram` schema, renderer implementation과 package exports를 바꾸지 않았다.
- Frozen tasks, datasets, prompts, oracle, split, seed, model settings와 acceptance threshold를 바꾸지 않았다.
- Runtime renderer는 여전히 fully materialized `graphicSpec`만 읽는다.
- Hosted MCP, network/file/code-execution capability를 추가하지 않았다.
- 과거 paid evidence와 output root를 수정하거나 덮어쓰지 않았다.

## 승인 요청과 효과

Gate J 승인은 이번 systematic recipe correction과 무과금 evidence가 계획대로 완료되었다는 판단만 닫는다.

승인해도 자동으로 허용되지 않는다.

- External/paid model call
- LLM-friendly correctness 또는 efficiency benefit claim
- Historical paid-plan hash 갱신
- PR preparation, Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

Gate J가 승인되면 다음 단계로 representative task, exact candidate SHA, 새 isolated output root와 낮은 hard cap을 가진
**Gate K paid smoke 제안**을 작성할 수 있다. Gate K 문서 작성과 실제 API 실행도 구분하며, paid call은 그 Gate의 명시적
승인 전에는 실행하지 않는다.

## 근거

- Approved correction contract: [`GATE_I.md`](./GATE_I.md)
- Previous failed evaluation: [`GATE_H.md`](./GATE_H.md)
- Root-cause audit: [`CORRECTED_FAILURE_ANALYSIS.md`](./CORRECTED_FAILURE_ANALYSIS.md)
- Frozen benchmark contract: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
