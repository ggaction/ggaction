# Gate R54-P0-A — Compact Delivery and Evaluation Contract

## Gate state

`ready-for-review`

## 쉽게 보는 승인 내용

Roadmap 5.3은 정확도를 높였지만 너무 큰 knowledge payload 때문에 효율 기준을 실패했다. 이번 Gate는 같은 구현을
줄여서 다시 돌리는 승인이 아니다. Clean `main`에서 다음 구조로 새로 설계해도 되는지를 승인하는 Gate다.

1. Complete reference와 LLM 기본 응답을 분리한다.
2. 한 resource가 아니라 task의 모든 constraint를 닫는 작은 packet을 반환한다.
3. 한 번의 lookup 뒤 submit 가능한지를 외부 비용 전에 검증한다.
4. Package 크기와 MCP surface를 hard budget으로 제한한다.
5. 완전히 새로운 corpus에서만 최종 효과를 평가한다.

## 승인 요청하는 recommended decisions

### 1. Source and isolation

- Exact base는 `9414d07179c9e7c6bbfdf00b762fc35de0ff25ec`, `ggaction@0.0.8`, 173 actions다.
- Roadmap 5.3 source/generated files를 cherry-pick하지 않고 필요한 개념을 current types/contracts/examples에서 다시 만든다.
- Frozen Gate V 17 tasks는 production tuning, 새 prompt/oracle 또는 acceptance 통계에 사용하지 않는다.
- 새 development, validation과 final held-out corpus는 파일, dataset identity와 SHA를 분리한다.

### 2. Compact authoring card

모든 public action은 다음 bounded fields를 갖는다.

- `name`, `summary`, exact `signature`
- `intents`, lifecycle, prerequisites와 resource ownership
- Query-relevant option keys와 short call patterns
- One minimal executable snippet 또는 explicit not-applicable reason
- 최대 두 개의 relevant error/fix와 canonical route

Default card에는 complete docs, duplicated prose, all related actions, complete example variants와 transitive type
definitions를 넣지 않는다. Full reference는 public types/docs가 소유하며 explicit resource read로만 접근한다.

### 3. Default response contract

`search_ggaction`은 top-one full resource 대신 다음 task packet을 반환한다.

- `matchedConstraints`
- ordered `actionPlan`
- `exactCalls`
- `unresolved`
- 최대 세 candidate identities와 exact resource routes

Recommended hard budgets:

| Surface | Budget |
| --- | ---: |
| Individual compact action card | ≤ 3,072 bytes |
| Default task packet | ≤ 6,144 bytes |
| Validation-corpus task-packet median | ≤ 4,096 bytes |
| Candidate identities | ≤ 3 |

Byte는 UTF-8 serialized response 전체를 측정한다. Wrapper, routes와 next-step text를 제외하지 않는다. Budget을 넘긴
응답은 truncate해 성공처럼 보이지 않고 validation failure로 처리한다.

### 4. Intent resolution

- Bag-of-words top-one ranking을 atomic constraint decomposition과 capability set-cover로 교체한다.
- Chart, transform, scale, encoding, guide, layout, selection과 renderer intent를 독립적으로 식별한다.
- Exact action name뿐 아니라 current API semantics에서 미리 정의한 일반 synonym과 lifecycle intent를 지원한다.
- 충족하지 못한 constraint는 `unresolved`로 반환하며 근접 결과로 숨기지 않는다.
- 한 lookup payload가 validation task의 required actions/options를 모두 포함해야 one-call closure로 인정한다.

### 5. Local MCP surface

- Transport: local `stdio`; hosted server/account/authentication 없음
- Distribution: 우선 existing `ggaction` package 안의 `ggaction-mcp` executable
- Model-visible tool: `search_ggaction({ query })` 한 개
- Read-only resources: overview, action card, task recipe와 bounded docs section
- Chart execution/rendering, arbitrary file/network/code access와 telemetry 없음
- Direct adapter와 MCP의 same-operation payload는 byte-equal

MCP resources는 protocol discovery용으로 유지하지만 evaluator가 generic resource-read tool을 기본 model surface에
자동 추가하지 않는다. Search packet이 `unresolved`를 반환한 경우에만 host가 exact resource/docs fallback을 제공한다.

### 6. Conditional same-package budget

Current main baseline은 412 entries / 386,876 packed / 1,827,671 unpacked bytes다. Phase 3 installed artifact의
recommended ceiling은 다음과 같다.

| Metric | Ceiling |
| --- | ---: |
| Package entries | 430 |
| Packed bytes | 450,000 |
| Unpacked bytes | 2,400,000 |

Browser full/basic/SVG budgets는 현재 public promise를 그대로 유지한다. Same-package candidate가 하나라도 ceiling을
넘으면 숫자를 올리거나 자동으로 package를 분리하지 않는다. Phase 3을 중단하고 existing package 유지, optional MCP
package 또는 no-integration 중 하나를 별도 public package-boundary Gate에서 다시 결정한다.

### 7. Unpaid gates before model cost

- 173 / 173 action compact cards, `unclassified = 0`
- Signature/option drift, route와 executable snippet validation
- Response byte budgets and deterministic result equality
- Fresh validation corpus required action/option coverage 100%
- One-call closure 100% or explicit `unresolved` failure; silent partial success 0
- Installed package ceilings, MCP read-only boundary and browser isolation
- Checked-in benchmark plan의 credential reads / external calls / spend `0 / 0 / $0`

### 8. Staged paid evaluation

Exact model/settings/repetitions/cost는 Phase 4 이후 별도 Gate에서 정한다. Conditions는 다음 역할을 가진다.

- A: public docs
- B: compact direct task packet
- C: B와 byte-equal한 local MCP
- D: MCP-first, docs only for explicit unresolved capability

Small representative smoke를 먼저 통과해야 full evaluation을 제안한다. Final acceptance는 결과 확인 전에 고정하며
기존 방향을 유지한다.

- Correctness guard 통과
- Task-level tokens ≥ 20% reduction
- Model calls ≥ 20% reduction
- Time-to-valid ≥ 15% reduction
- 세 efficiency threshold 중 최소 두 개 통과, 나머지 metric도 5% 초과 악화 금지
- Simple stratum은 correctness와 efficiency를 악화시키지 않고 complex stratum은 correctness benefit을 증명

## Approval effect

승인은 Phase 1 compact knowledge source와 generator 구현만 허용한다. Phase 1 결과는 R54-P1-A에서 다시 검토하며,
intent resolver, MCP, dependency/package change, corpus freeze, external model call, PR/merge/publish/deploy/release를
미리 승인하지 않는다.

## 승인 전 차단 범위

- Library source, declarations와 existing action behavior 변경
- Knowledge files, generator, search와 resolver implementation
- MCP executable, runtime dependency와 package files 변경
- Public/generated docs 변경
- Credential read, external model call와 비용 지출

## Evidence

- Exact product and previous-result boundary: [`BASELINE.md`](./BASELINE.md)
- Full Phase sequence and Gates: [`../ROADMAP.md`](../ROADMAP.md)
- Phase progress: [`GOAL.md`](./GOAL.md)
- Contract suite: 167 / 167 pass
- Review target: `110245b9335082946dd039ee6f81325d3ef65ae5`
- Remote branch: `codex/roadmap5-4-compact-knowledge`
- Roadmap 5.3 immutable evidence branch: `codex/roadmap5-3-llm-friendly` at
  `23212bf5d4dcdca1e842de889c8258ac662c7945`
