# Gate R53-P4-A — Deterministic Retrieval and Reproducible Local Harness

## Gate state

`approved`

Approved by the user on 2026-08-06. Gate package checkpoint: `0002133f`
(`docs: prepare roadmap 5.3 phase 4 gate`).

Retrieval implementation checkpoint: `9ea6abe7` (`feat: add deterministic knowledge search`).
Harness implementation checkpoint: `72a856df` (`test: unify structured knowledge evaluation`).
Remote branch: `origin/codex/roadmap5-3-llm-friendly`.

## 승인 대상

1. Complete generated action/recipe/LLM-route search index
2. Bounded deterministic search/read API, exact ranking weights and stable tie-break
3. Repeated-query identity, malformed-input, zero-gap and generated-drift evidence
4. Condition-neutral evaluation runner with isolated current-doc A and structured-knowledge B adapters
5. 24-task dry-run and representative mocked executable A/B repair evidence
6. Package/browser isolation, contract and cumulative verification

## Required evidence

- Search record counts, source hashes and missing/duplicate report
- Exact-name, recognizable task, lifecycle repair and ambiguous-query ranking examples
- Repeated process/query identity and maximum response-size evidence
- Condition A semantic compatibility and A/B adapter-only difference report
- Synthetic 24-task and mocked A/B result-schema/execution evidence with zero paid calls
- Complete checkpoint pushed to `origin/codex/roadmap5-3-llm-friendly`

## 구현 결과

Phase 2~3 combined knowledge를 작은 result로 찾는 deterministic Node-only layer를 추가했다. Generator는 action 173개,
recipe 33개와 Phase 1 LLM routes 4개를 stable `kind:id` order로 `knowledge/search-index.json`에 기록한다. Search/read는
network, embedding, fuzzy model, runtime dependency나 arbitrary file access 없이 이 generated index와 combined knowledge만
읽는다.

Local evaluation loop는 condition-neutral `condition-runner.js`가 소유한다. Condition A와 B는 knowledge tools, mode와
exact knowledge commit만 다르고 task/prompt/dataset, model settings, token/call/time/spend budgets, sandbox, evaluator,
renderer, oracle, repair feedback와 result schema를 모두 공유한다.

상세 exact evidence는 다음 두 record가 소유한다.

- [`RETRIEVAL_REPORT.md`](./RETRIEVAL_REPORT.md): ranking weights, limits, representative queries와 24-task top-k 결과
- [`HARNESS_REPORT.md`](./HARNESS_REPORT.md): A/B shared envelope, adapter isolation, 48 dry results와 mocked repair flow

## Retrieval 정량 결과

| 항목 | 결과 |
| --- | ---: |
| Indexed actions / recipes / docs routes | 173 / 33 / 4 |
| Total unique records / duplicate / missing | 210 / 0 / 0 |
| Evaluation prompts with intended core hit in top 10 | 24/24 |
| Default / maximum search results | 6 / 10 |
| Maximum query characters / normalized terms | 500 / 32 |
| Maximum summary / exact read characters | 280 / 16,000 |
| Generated search index bytes | 552,425 |
| Largest observed top-10 response | 3,404 bytes |

Exact action name은 ID/title 우선으로 찾고, recognizable task는 recipe intent를 먼저 찾으며, lifecycle query는 focused
edit/remove action을 우선한다. Same query/new index load identity, source SHA-256, generated drift와 stable tie-break를 test가
고정한다.

## Representative ranking

| Query | Leading result |
| --- | --- |
| `createScatterPlot` | `action:createScatterPlot` |
| `scatter plot relationship between horsepower and efficiency` | `recipe:scatterplot` |
| `edit legend layout spacing` | `action:editLegendLayout` |
| `remove a Cartesian x axis` | `action:removeXAxis` |
| `moving average time series` | `recipe:time-series-derivation` |
| `extension semantic graphics` | extension primitives and extension workflow |

## Local harness evidence

| Evidence | Result |
| --- | ---: |
| Synthetic A tasks | 24/24 passed |
| Synthetic B tasks | 24/24 passed |
| Total local dry results | 48/48 passed |
| Mocked A executable flow | first-pass valid |
| Mocked B flow | search + read + invalid submission + corrected submission |
| Mocked B final outcome | valid, 3 model calls, 1 repair, 0 MCP calls |
| External model/API calls / spend | 0 / $0.00 |

Condition B는 exact 40-character implementation commit 없이 시작할 수 없고, structured adapter에서 Condition A의
`read_doc`을 호출하면 거부한다. C adapter, MCP SDK와 actual MCP call은 Phase 5까지 구현하지 않았다.

## 검증 증거

- `npm run knowledge:check`: combined/search generated drift 없음
- `npm run test:contracts`: 200/200 passed
- `npm run test:docs`: 45/45 passed
- `npm run package:check`: bounded artifact and Phase 4 package isolation passed
- Ruby 3.2.6 Jekyll build: 117 pages generated
- Built docs links/assets/search/metadata: passed
- Desktop search와 all documentation pages: 320px, 390px, 768px browser verification passed
- `git diff --check`: passed

System Ruby 대신 repository-pinned `mise exec ruby@3.2.6` 환경으로 docs build를 수행했다. Browser test는 sandbox의
loopback listen 제한 때문에 승인된 local test-server 권한으로 실행했다.

## 호환성과 경계

- Public chart API, declarations, action behavior, state, renderers와 browser docs search는 바뀌지 않았다.
- Package `files`, exports, bin과 runtime dependency는 바뀌지 않았고 generated knowledge는 Phase 4 package에 포함되지 않는다.
- Existing Condition A entry, run IDs, starting commit, current-doc mode와 public docs tools는 유지된다.
- MCP SDK/bin/files/dependency, architecture package boundary와 Condition C는 R53-P4-A 승인 전 차단한다.
- External paid B/C evaluation, PR Ready/merge, publish/deploy/release는 승인 범위가 아니다.

## Approval effect

승인하면 Phase 5의 official MCP SDK dependency, existing-package `ggaction-mcp` stdio bin, read-only resource/tool adapter와
installed-package boundary 구현을 시작할 수 있다. External paid B/C LLM evaluation, PR Ready/merge, publish/deploy/release는
승인하지 않는다.

## Work blocked before approval

- MCP SDK/package bin/files/runtime dependency and architecture boundary changes
- Condition C real MCP adapter execution
- External or paid B/C LLM runs
