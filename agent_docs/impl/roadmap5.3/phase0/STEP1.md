# STEP 1 — Freeze the Knowledge and Evaluation Baseline

## 진행 상태

- [x] Exact merged-main identity, version와 action count 기록
- [x] Current LLM entry routes와 knowledge sources inventory
- [x] Action별 English description/example/recipe availability matrix
- [x] Representative chart task taxonomy와 versioned dataset identities
- [x] Executable correctness oracle와 invalid-result taxonomy
- [x] Benchmark condition isolation, run order와 raw-result schema
- [x] Token/call/time/cost collection method
- [x] Exact paid-run proposal와 predeclared acceptance rule
- [x] Canonical metadata/recipe ownership proposal
- [x] Local dry run and contract tests
- [ ] Commit/push and R53-P0-A review package

Inventory evidence는 [`CURRENT_KNOWLEDGE_INVENTORY.json`](./CURRENT_KNOWLEDGE_INVENTORY.json), 사람이 읽는
해석은 [`BASELINE.md`](./BASELINE.md)가 소유한다.
Exact evaluation proposal는 [`BENCHMARK_CONTRACT.md`](./BENCHMARK_CONTRACT.md)가 소유한다.

## 쉽게 보는 작업 결과

이 STEP이 끝나면 사용자는 다음 내용을 보고 실제 LLM baseline 실행 여부를 결정할 수 있다.

1. 어떤 chart task를 몇 번 실행하는가?
2. 어떤 model과 설정을 쓰며 최대 비용은 얼마인가?
3. 결과가 맞는지 코드로 어떻게 판정하는가?
4. tokens, LLM 호출 수와 걸린 시간을 어떻게 같은 조건으로 재는가?
5. 어느 정도 개선돼야 Roadmap 5.3이 의미 있다고 판단하는가?
6. Metadata와 recipes의 canonical source는 어디이며 docs/package/MCP가 어떻게 재사용하는가?

## Inventory contract

173개 action 각각에 대해 다음 availability만 먼저 측정한다. Phase 0에서 설명을 채우지 않는다.

- Informative English summary 존재 여부
- Exact public signature와 parameter explanation route
- Executable example 존재 여부와 실행 검증 상태
- Task recipe 연결 여부
- Related action/docs link 여부
- Current contract와 generated/public docs 사이 drift 여부

결과는 action name으로 stable sort하고 `missing`, `partial`, `present`, `not-applicable`의 bounded vocabulary를
사용한다. `not-applicable`에는 이유가 반드시 필요하다.

## Task corpus contract

Corpus는 versioned dataset과 explicit fields/action intent를 사용한다. 임의로 첫 dataset, mark, scale 또는 stored
resource를 선택하게 하는 ambiguous prompt는 넣지 않는다. 최소 taxonomy는 다음을 포함한다.

- Single-view categorical, quantitative와 temporal charts
- Multi-step encodings, transforms와 statistical overlays
- Distribution, regression, window/moving calculation과 ordering
- Axis, legend, title, annotation와 multi-guide layout
- Selection/highlighting과 semantic follow-up edit
- Facet/composition과 polar/directional marks
- Canvas/SVG/PNG/PDF export requirement
- Invalid first attempt를 고치는 repair task

Authoring set은 knowledge 설계에 사용할 수 있고 held-out set은 acceptance 전까지 solution을 노출하지 않는다.
Task별 oracle은 required semantic/graphic facts, allowed alternatives, forbidden shortcuts와 render/package validation을
명시한다.

## Measurement contract

모든 condition은 같은 model, reasoning effort, token limit, system prompt envelope와 task order randomization policy를
사용한다. A는 starting commit의 docs, B는 structured knowledge, C는 local MCP만 추가한다.

Raw result에는 최소한 다음을 저장한다.

- Condition, task ID, run/repetition ID와 exact knowledge commit/package
- Prompt/context tokens, completion tokens와 total tokens
- Model calls, MCP calls, repair rounds와 wall-clock time-to-valid
- First-pass/final correctness, timeout/failure category와 estimated cost
- Generated public program, validation output와 final renderer/package evidence

Aggregate는 success count, median과 p95를 함께 보고한다. Tokens와 time은 성공한 task뿐 아니라 timeout/failure도
별도 집계한다.

## Paid-call decision

R53-P0-A에는 provider/model, repetitions, expected/maximum cost와 exact acceptance rule을 숫자로 제시한다.
승인 전에는 external LLM call을 실행하지 않는다. 승인 뒤에도 설정을 바꾸려면 새 승인을 받는다.

## Compatibility and architecture impact

- Phase 0은 internal roadmap, local fixtures와 benchmark tooling만 추가한다.
- Public API, action behavior, persisted schema, renderer pixels와 package entry는 바꾸지 않는다.
- Metadata/recipe ownership과 package inclusion은 R53-P0-B 전에 확정한다.
- MCP bin과 runtime dependency를 구현할 때 package boundary와 architecture를 함께 갱신한다.
