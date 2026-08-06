# Roadmap 5.3 Phase 4 — Deterministic Retrieval and Local Harness

## 목표

Phase 2~3에서 만든 action/recipe knowledge를 LLM이 전체 JSON을 읽지 않고 작은 ranked result로 찾게 한다. 같은 query와
index bytes는 항상 같은 결과를 내며, Condition A/B/C가 knowledge adapter만 바꾸고 task, model envelope, token/call/time
budget, 실행기와 oracle은 공유하는 local benchmark harness를 만든다.

## 진행 상태

- [x] R53-P3-A explicit approval and Phase 4 activation
- [x] Search corpus, query/result contract and ranking baseline
- [x] Deterministic generated search index and bounded Node-only search/read API
- [x] Stable tie-break, repeated-query identity, malformed-input and zero-gap validation
- [x] Condition A/B shared runner and structured-knowledge adapter
- [x] 24-task dry/mock reproducibility and executable-program evidence
- [x] R53-P4-A remote review checkpoint

## 고정 결과

- `knowledge/search-index.json`: generated action/recipe/LLM-route search records and input hashes.
- `scripts/knowledge-search.js`: Node-only `searchKnowledge({ query, limit })` and exact `readKnowledge(...)` implementation.
- `scripts/generate-knowledge-search.js`: combined knowledge에서만 index를 생성하고 drift를 검사한다.
- `scripts/llm-eval/`: Condition-specific knowledge adapter와 공통 evaluation loop를 분리한 local harness.
- Focused contracts: corpus completeness, stable ranking/tie-break, bounded response, A/B isolation과 mock execution.

## Retrieval 계약

1. Search source는 generated `knowledge/index.json`과 Phase 1의 bounded LLM routes뿐이다. 별도 행동 truth나 embedding
   database를 만들지 않는다.
2. Action name의 camelCase token, recipe ID/title, summary/intent, use/avoid guidance, signature와 related/backlink를
   정규화한 lexical record를 생성한다.
3. Exact ID/name과 complete phrase를 가장 높게, title/name token, intent/summary, decision guidance와 relation 순으로
   낮게 점수화한다.
4. Tie는 score, kind priority, stable ID 순으로 해소한다. 같은 query/index는 process와 호출 순서에 관계없이 byte-identical
   result를 반환한다.
5. `limit` 기본값은 6, 허용 범위는 1~10이다. Query 길이와 token 수, result summary field를 제한한다.
6. Fuzzy model, embedding, network, runtime dependency와 browser/package public import는 추가하지 않는다.

## Harness 계약

- Condition A는 시작 commit의 public docs route를 사용하고 기존 baseline 의미를 보존한다.
- Condition B는 같은 task prompt와 evaluator에서 structured search/read adapter만 사용한다.
- Condition C adapter slot은 정의할 수 있지만 local MCP가 생기는 Phase 5 전 실제 C 구현이나 호출을 하지 않는다.
- Mocked provider와 synthetic dry run은 비용 없이 모든 task/oracle/result schema와 repair loop를 검증한다.
- 실제 B/C Responses API 호출은 별도 비용 Gate 전까지 차단한다.

## 범위 경계

- Public chart API, declarations, chart behavior, state, renderers와 package publish files를 변경하지 않는다.
- Existing documentation browser search를 이 Node-only knowledge search로 교체하지 않는다.
- MCP SDK, package `bin`/`files`/runtime dependency와 architecture package boundary 변경은 Phase 5까지 차단한다.
- External paid B/C evaluation, PR Ready/merge, publish/deploy/release는 별도 승인 없이는 진행하지 않는다.

## Gate

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.
