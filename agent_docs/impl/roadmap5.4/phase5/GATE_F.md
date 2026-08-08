# Gate R54-P5-F — Repaired Candidate and Exact v4 Paid Smoke

## Gate state

`approved`

Product candidate: `4eb8ce78b705c160394e0a0e0bafc557f54008c0`.

Plan: `evaluation/compact-authoring-paid-smoke-v4/PLAN.json`.

Plan SHA-256: `68006c3b61751108eb91a75a4a8eb5f4a93862a00762efa95d22340673bf7228`.

Route oracle SHA-256: `1b9e7adeb8f29d3f1f43818082ac74beff76c44c533c0d7076b70f3265ce48e8`.

Canonical unpaid evidence: [`ATTEMPT4.md`](./ATTEMPT4.md).

## 무비용 검증 요약

| Evidence | Result |
| --- | --- |
| Exact-plan focused contracts | 14 / 14 pass |
| Cumulative contract suite | 208 / 208 pass |
| Fixed A/B/C/D route dry-run | 16 / 16 pass |
| Full repository suite at product candidate | 2,100 / 2,100 pass |
| Package, installed MCP, browser bundle and docs gates | pass |
| Historical Attempt 1/2/3 hash contracts | pass |
| Credential reads / external calls / additional spend | 0 / 0 / `$0` |

## 결정 대상

원인별 repair와 무비용 closure를 통과한 exact candidate에 대해 replacement v4 paid smoke를 한 번 실행할지 결정한다.
Attempt 3의 7 / 16 결과는 그대로 보존하며 v4 결과로 소급 변경하지 않는다.

### A — Exact v4 smoke를 한 번 실행한다 (recommended)

| Item | Exact scope |
| --- | --- |
| Product candidate | `4eb8ce78b705c160394e0a0e0bafc557f54008c0` |
| Plan | SHA-256 `68006c3b61751108eb91a75a4a8eb5f4a93862a00762efa95d22340673bf7228` |
| Route oracle | SHA-256 `1b9e7adeb8f29d3f1f43818082ac74beff76c44c533c0d7076b70f3265ce48e8` |
| Model | `gpt-5.6-terra`, medium reasoning, low verbosity, default tier |
| Matrix | 4 fixed tasks × A/B/C/D × 1 repetition = 16 task-runs |
| Expected first-pass model calls | 37 |
| Maximum model calls | 3 per task-run, 48 total |
| Expected projection | `$1.152` |
| Calculated maximum envelope | `$2.496` |
| Hard global stop | `< $3`; next request가 cap을 넘길 수 있으면 호출 전 중단 |
| Transport ceiling | 256 KiB/call, 512 KiB/task |
| Task token ceiling | Input 24,000, output 8,000 |
| Credential | Previously identified single credential file, approval 뒤 1회 read |
| Retry | Automatic retry 0 |

Expected 37 calls는 A/B/C가 각 task당 search와 submit을 사용하고, D가 terminal task까지 불필요하게 문서를 읽지 않는 route를
반영한다. D의 terminal PDF + JPG task는 2 calls이고, renderer 선택이 열린 3D + JPEG task만 explicit resource read를 포함한
3 calls다.

### B — 실행하지 않고 negative evidence로 종료한다

현재 repair와 무비용 결과만 보존하고 추가 비용 없이 non-integration closeout으로 이동한다. 실제 모델에서 원인별 repair가
correctness를 회복했는지는 확인하지 않는다.

## Stop and evidence rules

- Candidate, plan, oracle, model, service tier, source file 또는 source tree hash가 다르면 credential read 전에 중단한다.
- Dirty `src`, `types` 또는 `knowledge` tree가 있으면 실행하지 않는다.
- 첫 schema/provider/evaluation-runner error에서 전체 run을 중단하고 자동 수정·재시도하지 않는다.
- Billing usage가 불완전하면 확인된 ledger를 먼저 저장하고 즉시 중단한다.
- Per-call/task transport, task token 또는 global cost ceiling에 닿으면 다음 호출 전에 중단한다.
- Every billed response 뒤 sanitized active trace와 ledger를 append-only progress에 기록한다.
- 결과 확인 뒤 task, route, oracle, threshold 또는 실패 분류를 바꾸지 않는다.

## Approval effect

Option A 승인은 위 exact plan에 대한 credential 1회 read와 최대 16 task-runs의 단일 실행만 연다. Retry, 새 plan, complete
paid evaluation, PR, merge, publish, deploy와 release는 열지 않는다. Valid v4 결과가 나온 뒤 complete evaluation 여부와
정확한 범위·비용은 별도 R54-P5-G에서 다시 승인받는다.

## 승인 전 차단 범위

- Credential read
- External model call과 additional spend
- v4 paid-smoke execution
- Retry와 complete paid evaluation
- PR, merge, publish, deploy와 release

## Approval record

- 사용자가 2026-08-09에 Option A의 exact product candidate, plan과 route oracle hash, 16 task-runs,
  expected 37 calls / `$1.152`, calculated maximum `$2.496`와 hard global stop `< $3` 범위를 명시적으로 승인했다.
- 이 승인은 previously identified single credential file의 1회 read와 v4 paid smoke 단일 실행만 연다.
- Retry, 새 plan, complete paid evaluation, PR, merge, publish, deploy와 release는 계속 차단한다.
- 승인 기록 시점의 credential reads / external calls / additional spend는 0 / 0 / `$0`다.

## Execution result

승인된 v4 smoke는 runner/provider error나 budget stop 없이 16 / 16 task-runs를 완료했고 13 / 16이 strict pass였다.
37 model calls, 41,928 input tokens, 5,258 output tokens와 `$0.1465093`를 사용했다. Automatic retry는 없었다.

Public docs A는 1 / 4, compact direct B와 local MCP C, MCP-first D는 각각 4 / 4를 통과했다. Exact immutable evidence와 실패
분류는 [`ATTEMPT4.md`](./ATTEMPT4.md)가 소유한다. 이 결과는 complete paid evaluation, PR 또는 integration을 자동 승인하지
않으며 다음 범위와 비용은 R54-P5-G에서 별도로 결정한다.
