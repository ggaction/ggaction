# Gate R54-P5-I — Exact v6 State-Machine Paid Smoke

## Gate state

`ready-for-review`

Product candidate: `4e211ba418cd437d7c66c4fb986fcc714cf579ea`.

Evaluator checkpoint: `956e969faf3c127a83850f65e5c78009c070af7d`.

Plan: `evaluation/compact-authoring-paid-smoke-v6/PLAN.json`.

Plan SHA-256: `5f8a226e2146843b3fe8875289646871284b3b486c755c333d02bc6a4cf8b561`.

Inherited route oracle SHA-256: `27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4`.

Review checkpoint: `5454540fd9b44feef2df0629b652fb7223c9ae7b`.

## 현재 근거

Attempt 5는 A의 실제 public-doc baseline 실패를 기록한 뒤 B의 evaluator wrapper mismatch와 `tool_choice: "auto"` / exact
one-call 모순으로 중단됐다. v6는 product candidate나 task를 바꾸지 않고 evaluator와 orchestration만 새 버전으로 분리했다.

| Unpaid evidence | Result |
| --- | --- |
| Forced route state machine regression | pass |
| Attempt 5 B literal-output reproduction | precise preflight failure, corrected submit pass |
| Provider zero-call reproduction | precise protocol stop after ledger persistence |
| v6 fixed route dry-run | 32 / 32 pass |
| v6 canonical strict evaluator | 8 / 8 pass |
| Full repository suite | 2,127 / 2,127 pass |
| Coverage | 94.75% lines; 70 / 70 critical floors |
| Credential reads / external calls / additional spend | 0 / 0 / `$0` |

## 결정 대상

### A — Exact v6 replacement smoke를 한 번 실행한다 (recommended)

| Item | Exact scope |
| --- | --- |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `956e969faf3c127a83850f65e5c78009c070af7d` |
| Plan | SHA-256 `5f8a226e2146843b3fe8875289646871284b3b486c755c333d02bc6a4cf8b561` |
| Route oracle | inherited v5 SHA-256 `27b76486d37c8cbb07ab2753db204f4fbf7dad5ab48ab27f48707eb9ae6bd0f4` |
| Model | `gpt-5.6-terra`, medium reasoning, low verbosity, default tier |
| Matrix | same 8 fixed tasks × A/B/C/D × 1 repetition = 32 task-runs |
| Expected first-pass model calls | 74 |
| Maximum model calls | 4 per task-run, 128 total |
| Expected projection | `$2.304` |
| Calculated maximum | `$7.488` |
| Maximum with 10% regional uplift | `$8.2368` |
| Hard global stop | `< $8.30`; 다음 request가 cap을 넘길 수 있으면 호출 전 중단 |
| Transport ceiling | 256 KiB/call, 768 KiB/task |
| Task token ceiling | input 36,000, output 12,000 |
| Credential | previously identified single credential file, approval 뒤 1회 read |
| Retry | transport/API automatic retry 0; evaluator feedback 뒤 forced resubmit 최대 1회 보장 |

네 번째 call은 A와 fallback D에도 한 번의 evaluator correction 기회를 주기 위한 task-local ceiling이다. B/C는 first-pass가 두
calls이므로 두 번까지 submit 상태를 유지할 수 있다. 전체 128-call cap, token/transport cap과 cost cap은 각각 다음 request 전에
독립적으로 검사한다.

### B — 유료 검증 없이 non-integration으로 종료한다

v6 unpaid repair와 final v3의 38 / 38 canonical result만 보존한다. Forced `tool_choice`와 evaluator wrapper 교정이 실제 provider
응답에서 작동하는지는 주장하지 않는다.

## 고정 비교 경계

- A는 public docs baseline으로 남긴다. Attempt 5 결과를 본 뒤 search ranking, 반환 URL 또는 문서 내용을 조정하지 않았다.
- B/C/D는 byte-equal compact packet과 명시된 fallback resource만 사용한다.
- Product candidate, 8 tasks, dataset, role, expected action plan과 route oracle은 v5와 동일하다.
- 한 repetition의 smoke이므로 statistical superiority를 주장하지 않는다.

## 비용과 stop rules

2026-08-09 확인한 standard short-context 가격은 input `$2.00`, cached input `$0.20`, cache write `$2.50`, output `$12.00`
/ 1M tokens이다. Regional processing은 10% uplift가 적용될 수 있다.

- Expected: 32 × (input 12,000 + output 4,000) = `$2.304`
- Calculated maximum: 32 × (input 36,000 at cache-write rate + output 12,000) = `$7.488`
- Regional maximum: `$8.2368`
- Hard cap: `$8.30`

Candidate, evaluator, plan, oracle, source hash, product tree, model 또는 service tier가 다르면 credential read 전에 중단한다.
Incomplete billing usage나 provider protocol mismatch는 append-only progress에 확인된 ledger를 먼저 저장하고 즉시 중단한다.
Automatic transport/API retry, task 교체와 추가 repetition은 없다.

## Approval effect

Option A 승인은 exact candidate/evaluator/plan에 대한 credential 1회 read, 32 task-runs의 단일 실행과 최대 `$8.30` spend만
연다. Complete paid evaluation, 새로운 제품 수리, PR, merge, publish, deploy와 release는 열지 않는다.

## 승인 전 차단 범위

- Credential read
- External model call과 additional spend
- v6 paid-smoke execution
- Retry와 complete paid evaluation
- PR, merge, publish, deploy와 release
