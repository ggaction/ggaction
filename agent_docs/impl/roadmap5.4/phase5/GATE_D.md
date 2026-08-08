# Gate R54-P5-D — Repaired Runner and Replacement v3 Paid Smoke

## Gate state

`approved`

Product candidate: `6ed5af76c80e56c5a3cde833c5a702de183e4d7a`.

Verified review checkpoint: `5c3c97d94d3608f7840e6ebd25148d2ac8a19816`.

Replacement plan: `evaluation/compact-authoring-paid-smoke-v3/PLAN.json`.

Plan SHA-256: `261a53c96913eededc7bbed898abc38104d223508701eba7c0f2daf5ebd01d37`.

## 구현 결과

Attempt 2를 중단시킨 false pre-request token guard를 다음 세 단위로 분리했다.

1. `requestBodyBytes`는 exact serialized HTTP transport 크기다. 256 KiB/call, 512 KiB/task independent ceiling만
   적용한다.
2. `projectedInputTokens`는 model-visible request를 1 UTF-8 byte = 1 token으로 보수 계산한다. Opaque
   `encrypted_content`는 제외하고 prior provider-reported reasoning tokens를 더한다. 24,000-token task envelope와 next-call
   cost proof에 사용한다.
3. Provider `usage`는 actual billing ledger와 response 이후 task/global stop의 canonical 값이다.

모든 provider response 직후 active task progress를 저장한다. 저장되는 trace는 request bytes, projected tokens, function-call
count, bounded tool identity/arguments와 provider-reported usage/cost뿐이다. Billing usage가 불완전하면 `null`과 explicit flag로
기록하고 즉시 중단한다. API key, raw encrypted reasoning, complete generated source와 local path는 보존하지 않는다.

## 무비용 검증

| Evidence | Result |
| --- | --- |
| Focused paid-runner contracts | 14 / 14 pass |
| Realistic public-doc A route | 60 KB opaque reasoning × 3 calls, pass |
| Realistic MCP-first fallback D route | 60 KB opaque reasoning × 3 calls, pass |
| Independent per-call/task transport preflight | Provider call 0, pass |
| Sanitized active progress | Encrypted state, key와 complete source 미포함, pass |
| Malformed/incomplete billed response progress | Abort 전 sanitized trace 보존, pass |
| Attempt 1 and Attempt 2 immutable plan/result contracts | pass |
| Replacement A/B/C/D route dry-run | 16 / 16 pass |
| Cumulative contract suite | 206 / 206 pass |
| Full repository suite | 2,100 / 2,100 pass |
| External calls / spend after Attempt 2 | 0 / `$0` |

Dry-run은 final plan SHA-256 `261a53c96913eededc7bbed898abc38104d223508701eba7c0f2daf5ebd01d37`와
product candidate `6ed5af76c80e56c5a3cde833c5a702de183e4d7a`를 다시 확인했다.

## Historical evidence preservation

Attempt 1과 Attempt 2는 수정하거나 resume하지 않았다. Contract test가 다음 identity를 고정한다.

- Attempt 1 plan: `95010b28aacb596f18398a9e259ed9bec1de9280e78ccd2316a525a73f08bc54`
- Attempt 1 result: `a6176c64010795da419cc6f49c4cec645f95fdfdfb938e98c0f216a441dbb745`
- Attempt 2 plan: `24325b73b1e0e3751f5fb9346c31e8f998a7de4a8b1735ec9a63835a1c6e6c6c`
- Attempt 2 result: `a9c9ffadafcadd076d6f44948e9a2f7b7673a4aa68ee3a4e2106e622e54bb12e`

Replacement v3는 새 directory와 새 append-only result ledger를 사용한다.

## 승인 요청 범위

승인 시 다음 한 번의 replacement v3 smoke만 허용한다.

| Item | Exact scope |
| --- | --- |
| Product candidate | `6ed5af76c80e56c5a3cde833c5a702de183e4d7a` |
| Plan | SHA-256 `261a53c96913eededc7bbed898abc38104d223508701eba7c0f2daf5ebd01d37` |
| Model | `gpt-5.6-terra`, medium reasoning, low verbosity, default tier |
| Matrix | 4 fixed tasks × A/B/C/D × 1 repetition = 16 task-runs |
| Maximum model calls | 3 per task-run, 48 total |
| Expected projection | `$1.152` |
| Calculated maximum envelope | `$2.496` |
| Hard global stop | `< $3`; next request가 cap을 넘길 수 있으면 호출 전 중단 |
| Transport ceiling | 256 KiB/call, 512 KiB/task |
| Task token ceiling | Projected/actual input 24,000, output 8,000 |
| Credential | Previously identified single credential file, one read only after approval |
| Retry | Automatic retry 0 |

Condition A는 public docs, B는 compact direct, C는 byte-equal local MCP, D는 MCP-first/docs-fallback이다. Fixed tasks는
simple/complex와 supported/unsupported stratum을 각각 포함한다.

## Stop and evidence rules

- Model/service-tier/source hash가 다르거나 billing usage가 불완전하면 즉시 중단한다.
- Per-call/task transport, projected/actual task token 또는 global cost ceiling에 닿으면 즉시 중단한다.
- 첫 schema/provider/evaluation-runner error도 전체 run을 중단하며 자동 수정·재시도하지 않는다.
- Every billed response 뒤 sanitized active trace와 ledger를 append-only progress에 기록한다.
- Result 확인 전 failed task를 success로 재분류하거나 complete evaluation을 제안하지 않는다.

## Approval effect

승인은 위 exact plan에 대한 credential 1회 read와 최대 16 task-runs만 연다. Attempt 1/2 resume, automatic retry, full
evaluation, PR, merge, publish, deploy와 release는 열지 않는다.

## 승인 전 차단 범위

- Credential read
- External model call
- Additional spend
- Replacement v3 paid-smoke execution
- Complete evaluation, PR, merge, publish, deploy와 release

## Approval record

- 사용자가 2026-08-09에 exact product candidate, plan SHA-256, 16 task-runs, 최대 48 model calls,
  expected `$1.152`, calculated maximum `$2.496`와 hard global stop `< $3` 범위를 명시적으로 승인했다.
- 이 승인은 previously identified single credential file의 1회 read와 replacement v3 paid smoke 실행만 연다.
- Attempt 1/2 resume, automatic retry, complete evaluation, PR, merge, publish, deploy와 release는 계속 차단한다.

## Execution result

승인된 v3 smoke는 16 / 16 task-runs를 정상 완료했고 7 / 16이 strict pass였다. 42 model calls, 47,468 input
tokens, 9,926 output tokens와 `$0.2068565`를 사용했다. Automatic retry는 없고 runner stop rule이나 cost ceiling은
발동하지 않았다.

Exact immutable evidence와 실패 분류는 [`ATTEMPT3.md`](./ATTEMPT3.md)가 소유한다. 7 / 16 결과는 integration acceptance를
통과하지 않았으므로 full evaluation을 제안하지 않는다. 다음 repair/closeout 결정은 [`GATE_E.md`](./GATE_E.md)가 소유한다.
