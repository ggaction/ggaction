# Gate R54-P5-H — Exact v5 Replacement Paid Smoke

## Gate state

`approved`

Product candidate: `4e211ba418cd437d7c66c4fb986fcc714cf579ea`.

Evaluator checkpoint: `57d9bb5f2c4973a21f53908b66f87a0da024c916`.

Plan: `evaluation/compact-authoring-paid-smoke-v5/PLAN.json`.

Plan SHA-256: `490612751a1348fdfa9aa08a39a3915f086e96d48d20c8585ef6c3ccf061c90e`.

Route oracle SHA-256: `27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4`.

## 현재 근거

Fresh final v3는 제품 후보를 바꾸지 않은 동결 상태에서 정확히 한 번 실행해 tasks `38 / 38`, routes `152 / 152`, strict
evaluator `38 / 38`을 통과했다. 이전 final v1/v2 실패와 네 paid attempt는 그대로 보존한다.

v5 evaluator는 product와 별도 commit으로 고정했다. 과거 evaluator의 action intent ID / public action name 불일치와 composition
child dataset 누락을 final v3 기준으로 교정했다. v4 기본 runner 계약은 그대로 통과하며 v5는 `needs-input`을 terminal
`unsupported`와 분리한다.

| Unpaid evidence | Result |
| --- | --- |
| Fresh final v3 | tasks 38 / 38; routes 152 / 152; evaluator 38 / 38 |
| v5 fixed route dry-run | 32 / 32 pass |
| v5 canonical strict evaluator | 8 / 8 pass |
| Direct / local MCP packet equality | pass |
| Focused paid-smoke contracts | 23 / 23 pass |
| Full repository suite | 2,116 / 2,116 pass |
| Credential reads / external calls / additional spend | 0 / 0 / `$0` |

## 결정 대상

### A — Exact v5 replacement smoke를 한 번 실행한다 (recommended)

| Item | Exact scope |
| --- | --- |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `57d9bb5f2c4973a21f53908b66f87a0da024c916` |
| Plan | SHA-256 `490612751a1348fdfa9aa08a39a3915f086e96d48d20c8585ef6c3ccf061c90e` |
| Route oracle | SHA-256 `27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4` |
| Model | `gpt-5.6-terra`, medium reasoning, low verbosity, default tier |
| Matrix | 8 fixed tasks × A/B/C/D × 1 repetition = 32 task-runs |
| Expected first-pass model calls | 74 |
| Maximum model calls | 3 per task-run, 96 total |
| Expected projection | `$2.304` |
| Calculated maximum | `$4.992` |
| Maximum with 10% regional uplift | `$5.4912` |
| Hard global stop | `< $6`; next request가 cap을 넘길 수 있으면 호출 전 중단 |
| Transport ceiling | 256 KiB/call, 512 KiB/task |
| Task token ceiling | input 24,000, output 8,000 |
| Credential | Previously identified single credential file, approval 뒤 1회 read |
| Retry | Automatic retry 0 |

### B — 유료 검증 없이 non-integration으로 종료한다

Final v3의 무비용 성공까지만 보존한다. 실제 모델이 수리된 compact packet을 사용해 실행 가능한 프로그램과 정확한 open
decision을 만드는지는 검증하지 않는다.

## Fixed tasks

| Task | Role | 검증하는 수리 경계 |
| --- | --- | --- |
| `final3-03-bars-png` | supported | Bar color-scale ownership과 legend handoff |
| `final3-08-violin-canvas` | supported | Violin-owned density derivation과 color encoding |
| `final3-12-rule-canvas` | supported | Complete rule geometry, stroke width, title와 subtitle intent |
| `final3-18-raw-bars-canvas` | supported | Raw bar categorical-before-quantitative ordering |
| `final3-22-composition-svg` | supported | Composed source와 child-aware SVG evaluation |
| `final3-23-labels-png` | supported | Positioned point-to-text overlay dependency |
| `final3-37-rule-endpoint` | needs-input | Incomplete rule endpoint decision |
| `final3-38-scale-consumer` | needs-input | Unconsumed scale decision |

새 제품 수리와 직접 관련된 supported 6개와 needs-input 2개만 고른다. Terminal unsupported 의미는 이 수리에서 바뀌지 않았고
v4 paid smoke에서 이미 실제 호출로 검증했으므로 반복 비용을 쓰지 않는다.

## Fixed routes and calls

| Condition | Route | First-pass calls |
| --- | --- | ---: |
| A | Public docs search → one read → submit | 24 |
| B | Compact direct search → submit | 16 |
| C | Local MCP search → submit | 16 |
| D | MCP search → supported submit; open decision만 resource read → submit | 18 |
| Total | 32 task-runs | 74 |

A는 public docs baseline, B/C는 byte-equal compact delivery, D는 compact-first와 명시된 open decision에 한정한 docs fallback을
비교한다. 한 repetition의 smoke이므로 statistical superiority를 주장하지 않는다. 모든 route가 실제 harness, billing ledger,
program execution과 stop rules를 통과하는지 확인하는 단계다.

## Cost and stop rules

2026-08-09 확인한 OpenAI Standard short-context 가격은 `gpt-5.6-terra` input `$2.00`, cached input `$0.20`, cache write
`$2.50`, output `$12.00` / 1M tokens이다. Regional processing은 해당 모델에 10% uplift가 적용될 수 있다.

- Official pricing: <https://developers.openai.com/api/docs/pricing>
- Task-run expected: input 12,000 + output 4,000 = `$0.072`
- 32 task-runs expected: `$2.304`
- Task-run maximum: input 24,000 at cache-write rate + output 8,000 = `$0.156`
- 32 task-runs calculated maximum: `$4.992`
- 10% regional uplift maximum: `$5.4912`
- Hard cap: `$6.00`

Candidate, evaluator, plan, oracle, source hash, product tree, model 또는 service tier가 다르면 credential read 전에 중단한다.
Billing usage가 불완전하거나 provider/schema error가 발생하면 확인된 append-only ledger를 먼저 저장하고 즉시 중단한다. 다음
request의 worst-case envelope가 hard cap을 넘을 수 있으면 호출하지 않는다. Automatic retry, task 대체와 추가 repetition은 없다.

## Approval effect

Option A 승인은 위 exact candidate/evaluator/plan에 대한 credential 1회 read와 최대 32 task-runs의 단일 실행, 최대 `$6.00`
spend만 연다. Retry, task나 threshold 수정, full paid evaluation, PR, merge, publish, deploy와 release는 열지 않는다.

## 승인 전 차단 범위

- Credential read
- External model call과 additional spend
- v5 paid-smoke execution
- Retry와 full paid evaluation
- PR, merge, publish, deploy와 release

## Approval record

- 사용자가 2026-08-09에 Option A의 exact product candidate, evaluator checkpoint, plan과 route oracle hash, 32 task-runs,
  expected 74 calls / `$2.304`, calculated maximum `$4.992`, regional maximum `$5.4912`와 hard global stop `< $6` 범위를
  명시적으로 승인했다.
- 이 승인은 previously identified single credential file의 1회 read와 v5 paid smoke 단일 실행만 연다.
- Retry, task나 threshold 수정, full paid evaluation, PR, merge, publish, deploy와 release는 계속 차단한다.
- 승인 기록 시점의 credential reads / external calls / additional spend는 `0 / 0 / $0`다.

## Execution result

승인된 v5 smoke는 `final3-03-bars-png:A`를 완료하고 `final3-03-bars-png:B`를 진행하던 중
`provider-failure: expected one function call, received 0` stop rule로 중단됐다. 6 billed model calls, 9,186 input tokens,
2,525 output tokens와 `$0.0428280`를 사용했다. Credential read는 1회였고 automatic retry는 없었다.

A는 invented namespace API로 strict 실패했다. B의 첫 program은 compact packet의 chart action을 따랐지만 evaluator가 주입하는
output path 대신 packet 예시의 `"chart.png"`를 고정해 permission failure가 났고, feedback 뒤 response가 function call을
반환하지 않았다. 정확한 immutable evidence와 causal analysis는 [`ATTEMPT5.md`](./ATTEMPT5.md)가 소유한다.

이 승인은 해당 중단으로 소진됐다. Retry, replacement smoke, full paid evaluation, PR, merge, publish, deploy와 release는 별도
승인 전까지 계속 차단한다.
