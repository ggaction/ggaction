# Roadmap 5.4 — Compact Knowledge Delivery and Intent Resolution

> **문서 상태 — 현재 실행 계획.** Active Phase는 Phase 2다. Exact pointer는
> [`../ROADMAP_INDEX.json`](../ROADMAP_INDEX.json)이 소유한다. 현재 observable action behavior는
> [`../../contract/ACTION_INDEX.json`](../../contract/ACTION_INDEX.json)과 `contract/current/`가 소유한다.

## 목표

LLM에게 많은 reference를 전달하는 대신, 한 작업에 필요한 정확한 action과 option만 작은 task packet으로 제공한다.
쉽게 말하면 다음 네 결과를 만든다.

1. 모든 173개 action을 작고 정확한 authoring card로 찾는다.
2. 여러 요구가 섞인 query를 capability 단위로 분해하고 필요한 action 집합을 함께 반환한다.
3. 기본 한 번의 knowledge lookup 뒤 submit 가능한 code를 작성하게 한다.
4. Correctness를 유지하면서 tokens, model calls와 time-to-valid를 실제로 줄인 경우에만 통합한다.

시작점은 package `0.0.8`, clean `main` commit
`9414d07179c9e7c6bbfdf00b762fc35de0ff25ec`, action inventory 173개다. 작업 branch는
`codex/roadmap5-4-compact-knowledge`다.

## 범위 원장

| ID | 범위 | 완료 결과 | Phase |
| --- | --- | --- | ---: |
| CK-01 | Scientific isolation | Roadmap 5.3 frozen evidence와 새 tuning/evaluation corpus의 완전한 분리 | 0 |
| CK-02 | Delivery budgets | Response, package, tool surface와 browser isolation의 hard budget | 0 |
| CK-03 | Compact action cards | 173개 action의 bounded signature, intent, option과 executable call pattern | 1 |
| CK-04 | Compact recipes | Task variant를 닫는 최소 prerequisite/action/snippet packet | 1 |
| CK-05 | Intent resolution | Query constraint 분해, capability set-cover와 explicit unresolved result | 2 |
| CK-06 | One-call closure | 한 lookup 뒤 필요한 action/option coverage와 submit-ready evidence | 2 |
| CK-07 | Local MCP | Local stdio read-only tool/resource와 conditional same-package distribution | 3 |
| CK-08 | Docs fallback | MCP-first, docs-only-when-unresolved routing과 duplicate context 제거 | 3 |
| CK-09 | Fresh validation | 새 development/validation/held-out corpus와 unpaid hard gates | 4 |
| CK-10 | Real LLM evaluation | Docs/direct/MCP/fallback 조건의 staged paid comparison | 5 |
| CK-11 | Integration closeout | Acceptance 통과 candidate만 PR/merge 대상으로 제안 | 5 |

## 최상위 원칙

- Roadmap 5.3 source나 generated artifact를 이 branch에 그대로 cherry-pick하지 않는다.
- Roadmap 5.3의 frozen 17-task corpus를 production tuning이나 새 acceptance 근거로 사용하지 않는다.
- Full reference truth와 default LLM delivery projection을 분리한다. 기본 응답에 transitive type closure를 넣지 않는다.
- `complete resource`가 아니라 `complete task constraint coverage`를 목표로 한다.
- Existing action API, `ChartProgram` immutability, semantic/graphic boundary와 renderer output은 바꾸지 않는다.
- MCP는 local `stdio`, read-only다. Chart execution/rendering, arbitrary file/network/code access를 제공하지 않는다.
- MCP와 docs를 동시에 preload하지 않고 MCP-first, unresolved-only docs fallback을 사용한다.
- Package budget을 넘기면 same-package distribution을 강행하지 않고 별도 public package-boundary Gate에서 멈춘다.
- 실제 LLM 호출은 exact model, corpus, repetitions, 예상 비용과 hard cap을 별도 승인받은 뒤 실행한다.
- PR, merge, package publish, docs deploy와 release는 각각 별도 승인 대상이다.

## 제안하는 compact delivery contract

Default authoring card는 action의 complete reference가 아니라 다음 정보만 제공한다.

- `name`, informative `summary`, exact public `signature`
- structured `intents`, lifecycle, prerequisites와 owned/required resource IDs
- query와 관련된 option keys와 짧은 call patterns
- executable minimal snippet 또는 적용 불가 이유
- 가장 관련 있는 error/fix와 canonical docs/resource route

Default search는 query를 atomic constraints로 분해해 `matchedConstraints`, ordered `actionPlan`, `exactCalls`,
`unresolved`와 최대 세 candidate identity를 반환한다. Hard response budget과 exact MCP signature는 Phase 0
[`GATE_A.md`](./phase0/GATE_A.md)에서 승인한다.

## 진행 상태

| Phase | 상태 | 범위 |
| ---: | --- | --- |
| 0 | completed | Baseline, isolation, delivery/package budgets와 public MCP contract |
| 1 | completed | 173 compact action cards와 compact task variants |
| 2 | in-progress | Multi-intent resolver와 one-call closure |
| 3 | planned | Local MCP, package budget과 docs fallback |
| 4 | planned | Fresh corpus, unpaid validation과 paid proposal |
| 5 | planned | Staged paid evaluation, integration decision과 closeout |

## Approval Gates

Gate 상태는 `planned | ready-for-review | approved | changes-requested`만 사용한다. Gate package는 검증하고
commit/push한 뒤에만 승인을 요청한다.

| Gate | Phase | 승인 대상 | 승인 전 차단 범위 |
| --- | ---: | --- | --- |
| R54-P0-A | 0 | Isolation, compact schema, response/package budgets, MCP tool/resource와 evaluation policy | Phase 1 implementation |
| R54-P1-A | 1 | 173 compact cards/variants, zero-gap coverage와 payload budget | Intent resolver |
| R54-P2-A | 2 | Constraint decomposition, task packet과 one-call closure evidence | MCP implementation |
| R54-P3-A | 3 | Installed MCP, conditional package budget, docs fallback와 browser isolation | Fresh evaluation corpus |
| R54-P4-A | 4 | New corpus split, strict oracle, unpaid result와 exact paid-smoke proposal | External model call |
| R54-P5-A | 5 | Small representative paid smoke, model/settings와 spend ceiling | Paid smoke |
| R54-P5-B | 5 | Smoke result와 complete paid evaluation scope/cost | Full external evaluation |
| R54-P5-C | 5 | Full result, predeclared acceptance와 integration candidate | PR preparation |
| R54-Exit | 5 | Passed merged-main evidence 또는 failed non-integration closeout | 완료 선언 |

## Phase 0 — Baseline and contract

Clean `main`과 Roadmap 5.3 negative result를 분리해 기록한다. Default response byte budget, compact authoring
schema, task packet shape, same-package budget, MCP surface와 fresh evaluation policy를 승인한다. R54-P0-A 전에는
source, dependency, public docs, package, MCP 또는 external model call을 바꾸지 않는다.

## Phase 1 — Compact knowledge source

Public types/contracts/examples에서 exact signature와 option truth를 생성하고, human-owned intent/call pattern을 작은
family map으로 관리한다. 173개 action 모두 compact card 또는 explicit not-applicable reason을 가져야 한다. Generic
boilerplate, duplicated prose와 transitive type closure는 default projection에 포함하지 않는다.

## Phase 2 — Intent resolution and one-call closure

Bag-of-words top-one ranking을 task constraint decomposition과 capability set-cover로 교체한다. Resolver는 chart,
transform, scale, encoding, guide, layout와 renderer intent를 함께 다루고, 충족하지 못한 요구를 `unresolved`로
숨김없이 반환한다. Fresh validation tasks에서 한 lookup payload가 required action/option을 모두 포함하는지 기계적으로
검증한다.

## Phase 3 — Local MCP and fallback

Compact direct payload와 byte-equal한 local stdio MCP를 만든다. MCP-first route가 task packet을 제공하고 docs는
`unresolved` capability에만 읽는다. Installed package, dependency, cold start, no-network/no-file/no-execution boundary와
browser bundle isolation을 검증한다. Same-package budget을 넘으면 구현을 중단하고 package-boundary 결정을 다시 받는다.

## Phase 4 — Fresh unpaid validation

Development, validation과 final held-out corpus를 서로 분리한다. Roadmap 5.3 prompts는 historical audit로만 남기고
새 corpus의 task/dataset/oracle/hash를 결과 확인 전에 고정한다. Payload, package, intent recall, task closure와 strict
program validation을 비용 없이 통과한 뒤 exact paid smoke만 제안한다.

## Phase 5 — Staged paid evaluation and closeout

작은 대표 smoke를 먼저 실행하고 통과한 경우에만 full A/B/C/D를 제안한다. A는 docs, B는 compact direct, C는
byte-equal compact MCP, D는 MCP-first/docs-fallback router다. Simple/complex stratum을 따로 보고 correctness, tokens,
model calls와 time-to-valid의 predeclared threshold를 통과한 candidate만 PR/merge 대상으로 제안한다.

## Explicit non-goals

- Hosted MCP, HTTP transport, server account, authentication, telemetry 또는 vector database
- Embedding/non-deterministic retrieval을 기본 요구사항으로 추가
- Existing chart action, renderer 또는 visual output 변경
- Default 응답에 complete docs, all related actions 또는 transitive types 포함
- Roadmap 5.3 corpus를 이용한 phrase patch, threshold 변경 또는 paid rerun
- 자동 package split, 별도 npm package 또는 release
