# Roadmap 5.3 — LLM-Friendly Knowledge and Local MCP

> **문서 상태 — 현재 실행 계획.** Active Phase는 Phase 6이다. Exact pointer는
> [`../ROADMAP_INDEX.json`](../ROADMAP_INDEX.json)이 소유한다. 현재 observable action behavior는
> [`../../contract/ACTION_INDEX.json`](../../contract/ACTION_INDEX.json)과 `contract/current/`가 소유한다.

## 목표

LLM이 ggaction을 사용할 때 긴 문서를 여러 번 뒤지거나 시행착오로 action을 추측하지 않아도 되게 한다.
쉽게 말하면 다음 네 결과를 만든다.

1. 모든 action을 짧고 정확한 영어 metadata로 찾을 수 있게 한다.
2. “산포도를 그리고 회귀선을 추가한다” 같은 실제 작업을 높은 커버리지의 recipe로 안내한다.
3. 같은 knowledge를 문서, deterministic search와 local MCP에서 일관되게 제공한다.
4. 실제 LLM이 다양한 차트를 만들게 해 correctness, tokens, 호출 수와 시간을 전후 비교한다.

시작점은 package `0.0.8`, merged `main` commit
`9414d07179c9e7c6bbfdf00b762fc35de0ff25ec`, action inventory 173개다. 작업 branch는
`codex/roadmap5-3-llm-friendly`다.

## 범위 원장

| ID | 범위 | 완료 결과 | Phase |
| --- | --- | --- | ---: |
| LF-01 | Exact baseline | 현재 문서 route, action knowledge와 LLM 사용 비용의 재현 가능한 기준선 | 0 |
| LF-02 | Benchmark contract | versioned task corpus, correctness oracle, token/call/time 측정과 비용 승인 절차 | 0 |
| LF-03 | LLM-readable routing | 작고 안정적인 overview, action, recipe와 docs section route | 1 |
| LF-04 | Action metadata | 173개 action의 informative English metadata와 zero-gap validation | 2 |
| LF-05 | Task recipes | 실제 chart task 중심 recipe와 action/capability/lifecycle coverage report | 3 |
| LF-06 | Deterministic retrieval | 같은 query가 같은 ranked result를 내는 local search index와 API | 4 |
| LF-07 | Local MCP | 기존 `ggaction` package의 `ggaction-mcp` stdio executable과 read-only resources/tool | 5 |
| LF-08 | Real LLM evaluation | current docs(A), structured knowledge(B), local MCP(C)의 반복 비교 | 6 |
| LF-09 | Integration and closeout | package/docs/contracts/tests와 benchmark evidence의 동기화 | 6 |

## 이미 승인된 핵심 결정

- Public metadata, recipes와 MCP response는 영어로 작성한다. 내부 roadmap과 Gate 기록은 한국어로 작성한다.
- Metadata summary는 기능 이름만 반복하지 않고 “무슨 chart/result를 만들며 언제 쓰는지”를 한 문장에 담는다.
- 173개 action을 모두 분류하고 `unclassified = 0`을 강제한다.
- Recipe는 몇 개의 예쁜 예시가 아니라 task coverage를 관리하는 실행 가능한 knowledge layer다.
- MCP는 local `stdio`, read-only다. 별도 서버, 계정, 인증, database와 hosted service를 만들지 않는다.
- 별도 npm package를 만들지 않고 기존 `ggaction` package에 `ggaction-mcp` executable을 추가한다.
- MCP는 arbitrary file access, network access, chart execution/rendering과 code execution을 제공하지 않는다.
- 실제 유료 LLM 호출은 model, 반복 수, 예상 비용을 먼저 제시하고 별도 승인을 받은 뒤 실행한다.
- PR, merge, package publish, documentation deployment와 release는 각각 별도 승인을 받는다.

## Knowledge contract 방향

Action metadata는 최소한 다음 정보를 machine-readable하게 제공한다.

- `name`, informative `summary`, `useWhen`, `avoidWhen`
- public `signature`, required state와 parameter descriptions
- semantic/graphic `effects`, composition hints와 common errors
- 최소 한 개의 executable example 또는 명시적인 not-applicable 이유
- related actions, recipes와 canonical docs links

예를 들어 점 chart action은 “두 수치 필드를 점으로 표현한다”가 아니라 다음 수준으로 설명한다.

> Creates a Cartesian scatter plot by mapping the required x and y fields to point positions, making relationships,
> clusters, trends, and outliers easier to inspect.

Recipe coverage는 action을 `primary`, `supporting`, `lifecycle`, `extension-only`, `metadata-only` 또는
`not-applicable`로 분류한다. Primary action은 최소 한 recipe의 핵심 단계여야 한다. 나머지는 적용 가능한 recipe,
직접 metadata example 또는 검증된 not-applicable 이유 중 하나를 가져야 한다.

## Benchmark contract 방향

Benchmark는 고정된 model/settings와 versioned task/dataset을 사용하고 순서를 섞어 A/B/C 조건을 비교한다.

- **A — Current docs:** Roadmap 시작 commit의 기존 public documentation만 제공
- **B — Structured knowledge:** overview, action metadata와 recipes 제공
- **C — Local MCP:** B와 같은 canonical knowledge를 MCP resource/search로 제공

Task corpus는 simple chart, multi-step composition, transform/statistics, guide/layout, selection/highlighting,
renderer/export와 error-repair를 포함한다. 모든 task는 dataset identity, required result와 허용 가능한 public call
chain을 명시하며 authoring set과 held-out set을 분리한다.

측정값은 first-pass/final correctness, tokens per successful chart, model calls, MCP calls, repair rounds,
time-to-valid, timeout/failure와 추정 비용이다. Exact acceptance threshold와 유료 run 설정은 결과를 보기 전에
R53-P0-A에서 승인한다. Recommended starting rule은 C가 A보다 final correctness를 악화시키지 않으면서 tokens,
model calls와 time-to-valid 중 최소 두 지표를 사전 합의한 비율 이상 개선하고 나머지 지표도 유의미하게
악화시키지 않는 것이다.

## Local MCP contract 방향

MCP는 official SDK를 runtime dependency로 사용하고 다음 bounded surface만 제공한다.

- Resources: `ggaction://overview`, `ggaction://actions/{name}`, `ggaction://recipes/{id}`,
  `ggaction://docs/{section}`
- Tool: `search_ggaction({ query, limit })`
- Transport: local `stdio`
- Distribution: existing `ggaction` package의 `ggaction-mcp` bin

Renderer와 browser entry에 MCP runtime dependency가 섞이지 않도록 installed-package, exports와 bundle tests로
경계를 증명한다. 이 package-boundary 변경은 Phase 5 implementation과 함께
[`../../SECOND_ARCHITECTURE.md`](../../SECOND_ARCHITECTURE.md)에 반영한다.

## 진행 상태

| Phase | 상태 | 범위 |
| ---: | --- | --- |
| 0 | completed | Exact knowledge baseline, benchmark/cost contract와 source-of-truth 결정 |
| 1 | completed | LLM-readable documentation routing과 stable chunks |
| 2 | completed | 173-action informative English metadata |
| 3 | completed | High-coverage executable task recipes |
| 4 | completed | Deterministic retrieval, local harness와 mechanical coverage reports |
| 5 | completed | Existing-package local MCP integration |
| 6 | in-progress | A/B/C real LLM benchmark, integration와 closeout |

## Approval Gates

Gate 상태는 `planned | ready-for-review | approved | changes-requested`만 사용한다. Gate package는 검증하고
commit/push한 뒤에만 승인을 요청한다.

| Gate | Phase | 승인 대상 | 승인 전 차단 범위 |
| --- | ---: | --- | --- |
| R53-P0-A | 0 | Exact task corpus, oracle, model/settings/repetitions, 예상 비용, acceptance threshold와 knowledge ownership | 실제 LLM 호출 |
| R53-P0-B | 0 | Current-doc baseline 결과, final metadata/recipe schema와 Phase 1~5 file/package boundary | Phase 1 변경 |
| R53-P1-A | 1 | Stable docs route, chunk size, navigation과 drift guards | Action metadata 작성 |
| R53-P2-A | 2 | 173-action metadata, zero-gap report와 executable examples | Recipe 작성 |
| R53-P3-A | 3 | Recipe catalog, classification과 action/capability/lifecycle coverage | Retrieval index |
| R53-P4-A | 4 | Deterministic search, local benchmark harness와 reproducibility evidence | MCP implementation |
| R53-P5-A | 5 | `ggaction-mcp` installed-package behavior, read-only boundary와 browser isolation | Final paid comparison |
| R53-P6-A | 6 | Final model/repetition/cost proposal for B/C comparison | Final 유료 LLM 호출 |
| R53-P6-B | 6 | A/B/C benchmark result, acceptance decision와 integration candidate | PR preparation |
| R53-Exit | 6 | Merged-main package/docs/contracts/tests와 reproducible benchmark evidence | 완료 선언과 release preparation |

## Phase 0 — Baseline and measurement contract

현재 문서가 LLM에게 어떻게 보이는지, 173개 action에 어떤 descriptive/executable knowledge가 이미 있는지,
어떤 task가 chart correctness를 대표하는지 측정한다. Benchmark harness와 oracle을 먼저 설계하고 exact model,
반복 수와 최대 비용을 제안한다. R53-P0-A 승인 전에는 실제 유료 호출을 하지 않는다. 승인 뒤 current-doc A
baseline을 고정하고 metadata/recipe/source ownership을 확정해 R53-P0-B를 연다.

## Phase 1 — LLM-readable documentation routing

LLM이 전체 사이트를 읽지 않아도 overview에서 action, recipe와 세부 docs로 좁혀 갈 수 있는 작은 영어 route를
만든다. 사람이 읽는 public docs와 machine-readable knowledge가 서로 다른 사실을 소유하지 않도록 canonical
source와 generated view를 분명히 한다.

## Phase 2 — Informative action metadata

173개 action에 summary/useWhen/avoidWhen/signature/parameters/effects/errors/example/relations를 채운다. Schema와
generator가 누락, stale signature, 깨진 link와 실행 불가능한 example을 차단한다. 이름만 바꾼 boilerplate summary는
coverage로 인정하지 않는다.

## Phase 3 — High-coverage task recipes

실제 사용자가 원하는 chart task를 중심으로 data-to-chart, composition, transform, guide, highlight, renderer/export와
repair recipes를 만든다. 모든 action을 분류하고 primary recipe coverage 100%, unclassified 0, 적용 가능한 support
coverage와 explicit not-applicable reason을 mechanical report로 증명한다.

## Phase 4 — Deterministic retrieval and benchmark harness

Action/recipe/docs knowledge를 작은 ranked result로 찾는 deterministic index를 만든다. Query 결과는 stable tie-break와
bounded output을 가지며 browser/runtime code에 search dependency를 섞지 않는다. 같은 harness가 A/B/C 조건을
실행하고 correctness와 비용 지표를 동일한 형식으로 기록한다.

## Phase 5 — Local MCP

기존 package에 `ggaction-mcp` executable을 추가한다. MCP는 canonical knowledge를 읽기 전용 resource와 한 개의
search tool로 노출한다. Installed tarball, clean consumer, stdio protocol, invalid input, no-network/no-file/no-execution
boundary와 browser bundle isolation을 검증한다.

## Phase 6 — Evaluation, integration, and closeout

별도 비용 승인 뒤 B/C를 current-doc A baseline과 같은 corpus/model/settings로 반복 비교한다. 실패 사례는 숨기지
않고 task별 raw result와 aggregate median/p95를 함께 보존한다. 사전 합의한 threshold를 통과할 때만 product
benefit을 주장한다. Package, docs, current contracts, architecture, generated knowledge와 full suite를 동기화하고
별도 PR/merge 승인 뒤 exact merged main을 재검증해 R53-Exit를 연다.

## Explicit non-goals

- Hosted MCP, HTTP/SSE transport, cloud database, account, authentication 또는 telemetry service
- MCP를 통한 chart execution, rendering, arbitrary code/file/network access
- General-purpose vector database, embedding service 또는 non-deterministic retrieval requirement
- LLM-specific public chart authoring API나 existing action behavior 변경
- Metadata 양을 늘리기 위한 무의미한 boilerplate와 recipe 수 부풀리기
- Benchmark 결과를 본 뒤 acceptance threshold, held-out task 또는 scoring rule 변경
- 별도 MCP npm package
- 승인 없는 유료 LLM 호출, PR, merge, package publish, documentation deployment 또는 release
