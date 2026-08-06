# Gate R53-P0-A — Knowledge Baseline and Paid Evaluation Contract

## Gate state

`planned`

## 쉽게 보는 승인 내용

이 Gate는 LLM-friendly 문서나 MCP 구현 승인이 아니다. 현재 ggaction docs를 실제 LLM으로 평가하기 전에
시험 문제, 채점 방식, model 설정, 반복 수, 비용과 성공 기준을 숫자로 고정하는 Gate다.

## 승인 대상

1. Versioned authoring/held-out task corpus와 dataset identities
2. Task별 executable correctness oracle와 failure taxonomy
3. A/B/C condition isolation과 raw-result schema
4. Provider, exact model/version, reasoning/token limit와 repetition count
5. Expected cost, maximum spend와 timeout limit
6. Tokens, model/MCP calls, repair rounds와 time-to-valid collection method
7. Predeclared correctness/efficiency acceptance threshold
8. Metadata/recipe canonical source와 generated docs/package/MCP ownership proposal

## Required evidence

- Starting commit `9414d07179c9e7c6bbfdf00b762fc35de0ff25ec`, package `0.0.8`, actions 173
- Current docs/action/example/recipe availability inventory
- Representative task taxonomy, fixed datasets와 ambiguity audit
- Local dry-run harness that makes no external LLM calls
- Machine-readable result schema and deterministic scorer tests
- Exact cost calculation with normal and maximum bounds
- Focused tests plus cumulative agent-documentation/contracts verification
- Verified remote checkpoint on `origin/codex/roadmap5-3-llm-friendly`

## Recommended acceptance shape

Exact percentages are decided from the evidence package before calls. The rule must require:

- Final correctness non-regression relative to A
- A predeclared meaningful first-pass correctness target
- Predeclared reductions in tokens per successful chart, model calls and time-to-valid
- C to pass correctness plus at least two efficiency thresholds, with no large regression in the remaining metric
- Held-out results and failures to remain in the reported denominator

## Approval effect

Approval permits only the exact current-doc A baseline calls and spend recorded in this Gate. It does not approve Phase 1,
different models/settings, later B/C paid calls, MCP implementation, PR, merge, publish, deployment or release.

## Work blocked before approval

- External or paid LLM calls
- Bulk action metadata and recipe authoring
- Public docs route changes
- Search/MCP implementation and package dependency/bin changes
- Phase 1~6 work
