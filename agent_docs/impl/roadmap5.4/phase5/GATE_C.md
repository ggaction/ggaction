# Gate R54-P5-C — Paid Runner Budget Accounting Repair

## Gate state

`approved`

Attempt 2 evidence: [`ATTEMPT2.md`](./ATTEMPT2.md).

Verified diagnosis and review checkpoint: `b3f1d47064efd31a3cfdb7676f0e070183132839`.

## 결정이 필요한 이유

Attempt 2는 actual provider input 2,096 tokens와 `$0.006121`만 사용했지만 raw HTTP request bytes를 billable tokens로
누적한 pre-request guard 때문에 세 번째 call 전에 중단됐다. Runner는 비용 상한을 강하게 유지해야 하지만 transport bytes,
model-visible input estimate와 provider-reported usage를 같은 값으로 취급하면 정상적인 multi-turn call도 실행할 수 없다.

## Options

### A — Separate transport, projected billable input, and actual usage (recommended)

세 단위를 분리한다.

1. `requestBodyBytes`: exact serialized HTTP body size. 별도 bounded transport metric으로만 사용한다.
2. `projectedInputTokens`: model-visible text/tool state를 1 byte = 1 token으로 보수 계산하되
   `reasoning.encrypted_content` 같은 opaque continuation bytes는 제외하고 prior provider-reported reasoning tokens를 더한다.
3. `usage.inputTokens`: provider가 반환한 actual billing usage. Existing 24,000-token task envelope와 result ledger의 canonical
   값으로 유지한다.

Pre-request task guard는 projected token sum을, global cost guard는 projected next input과 maximum output을 사용한다. Response
뒤에는 actual provider usage와 `$3` hard cap을 계속 즉시 검사한다. Raw transport에는 independent per-request/task byte ceiling을
추가한다.

또한 every billed response 뒤 sanitized active trace를 progress callback으로 저장한다. Trace는 request bytes, projected tokens,
tool identity, bounded arguments, provider usage와 cost만 포함하며 API key, raw encrypted reasoning, complete generated source와 local
path는 저장하지 않는다.

Realistic mock는 large encrypted reasoning payload를 포함한 A와 D의 3-call route를 검증해야 한다.

장점은 cost safety와 diagnostic evidence를 유지하면서 false stop의 원인을 정확히 분리한다는 점이다. 단점은 accounting code와
mock fixture가 조금 더 복잡해진다.

### B — Increase bytes-per-token ratio or task envelope

`requestTokenEstimateBytesPerToken`을 2–4로 올리거나 24,000-token envelope를 늘린다. 구현은 작지만 opaque transport bytes와
billable tokens를 계속 혼합하고, 값 선택이 current response shape에 의존한다. Cost projection도 다시 커지므로 권장하지 않는다.

### C — Remove the pre-request task guard

Provider usage를 response 뒤에만 검사한다. False stop은 사라지지만 한 request가 task envelope를 넘은 뒤에야 알 수 있고
pre-call cost proof가 약해진다. Hard cost와 재현성을 중시하는 paid harness에는 권장하지 않는다.

## Recommended implementation and unpaid acceptance

Option A 승인 시 다음 무비용 범위만 구현한다.

1. Transport / projected billable / actual provider usage metrics 분리
2. Opaque reasoning state projection policy와 closed test fixture
3. Per-request와 per-task transport byte ceilings
4. Every-call sanitized active progress persistence
5. Realistic encrypted-reasoning A/D 3-call mock
6. Attempt 1과 Attempt 2 plan/result SHA immutable tests
7. 16 / 16 A/B/C/D route dry-run, external calls 0, spend `$0`
8. Full contract and repository suites
9. Product candidate `6ed5af76`를 바꾸지 않는 separate runner checkpoint
10. 새 v3 plan, source hashes, cost proof와 paid authorization Gate 준비

## Approval effect

승인은 Option A runner repair와 무비용 검증만 연다. Credential read, external model call, additional spend, Attempt 2 resume/retry,
새 paid smoke, full evaluation, PR, merge, publish, deploy와 release는 열지 않는다.

## 승인 전 차단 범위

- Paid runner accounting implementation
- Credential read와 external model call
- Attempt 2 overwrite/resume/retry
- Replacement v3 paid plan execution
- Complete evaluation, PR, merge, publish, deploy와 release

## Approval record

- 사용자가 2026-08-09에 Option A를 명시적으로 승인했다.
- 이 승인은 runner accounting repair, sanitized active progress, realistic mock, 무비용 검증과 v3 paid authorization Gate
  준비만 연다.
- Credential read, external model call, additional spend, Attempt 2 resume/retry, v3 paid execution, full evaluation, PR,
  merge, publish, deploy와 release는 계속 차단한다.
