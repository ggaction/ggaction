# Paid Smoke Attempt 2 — Replacement v2 Budget-Estimator Abort

## Immutable identity

| Item | Value |
| --- | --- |
| Execution approval | R54-P5-B, approval checkpoint `12e8a0aacbfffa0b720a1456bf6528a470fa5455` |
| Product candidate | `6ed5af76c80e56c5a3cde833c5a702de183e4d7a` |
| Plan | `evaluation/compact-authoring-paid-smoke-v2/PLAN.json` |
| Plan SHA-256 | `24325b73b1e0e3751f5fb9346c31e8f998a7de4a8b1735ec9a63835a1c6e6c6c` |
| Raw result | `evaluation/compact-authoring-paid-smoke-v2/results/IN_PROGRESS.json` |
| Raw result SHA-256 | `a9c9ffadafcadd076d6f44948e9a2f7b7673a4aa68ee3a4e2106e622e54bb12e` |
| Credential reads | 1 |
| Automatic retries | 0 |

## Exact outcome

Attempt 2는 첫 run `repair-val-histogram:A`에서 중단됐다. Condition A가 public docs search와 read를 마친 뒤 세 번째
model request를 준비하는 시점에 pre-request guard가 다음 오류를 냈다.

```text
task-token-envelope: conservative input estimate would be exceeded
```

| Metric | Result |
| --- | ---: |
| Completed task-runs | 0 / 16 |
| Billed model calls | 2 |
| Input tokens | 2,096 |
| Cache-write tokens | 1,290 |
| Output tokens | 107 |
| Reasoning tokens | 48 |
| Total tokens | 2,203 |
| Spend | `$0.006121` |

Stop rule은 세 번째 request와 이후 15 task-runs를 호출하지 않았다. Result를 success로 재분류하거나 같은 plan을 resume하지
않는다.

## Root cause

### 1. Transport bytes와 billable input tokens를 같은 양으로 취급했다

`recordBudgetBeforeRequest`는 complete JSON request의 UTF-8 byte count를 `requestTokenEstimateBytesPerToken: 1`로 나눠
estimated input tokens로 삼고, 모든 turn의 값을 더해 24,000-token task envelope와 비교했다. 1 byte를 1 token으로 보는
상한은 보수적이지만 HTTP transport 크기와 provider가 보고하는 billable input token을 같은 단위로 간주한다.

실제 두 call의 provider input usage는 2,096 tokens였으므로 task envelope의 8.7%였다. 그럼에도 세 번째 call은 raw request
projection만으로 차단됐다.

### 2. Opaque encrypted reasoning state도 prompt text처럼 byte-count했다

Runner는 multi-turn Responses input에 prior `response.output`을 보존한다. 여기에는 `reasoning.encrypted_content` 같은 opaque
continuation state가 포함될 수 있다. Raw HTTP body에서는 크지만 model-visible prompt text와 같은 방식으로 tokenized되는
문자열이라고 볼 수 없다. Current estimator는 이를 구분하지 않는다.

이 항목이 false stop에 기여했다는 결론은 runner control flow와 provider usage 차이에 근거한 inference다. Attempt 2가
request별 trace를 보존하지 않아 opaque field별 exact byte contribution은 사후 복구할 수 없다.

### 3. Mock coverage가 realistic provider envelope를 재현하지 않았다

Existing 3-call mock는 function-call item만 반환했다. Real response가 포함하는 reasoning item과 encrypted continuation payload가
없어 raw-body estimator의 false stop을 발견하지 못했다.

### 4. Active task trace가 abort result에서 유실됐다

`runPaidSmokeTask`는 task가 return된 뒤에만 trace를 parent result에 전달한다. Pre-request guard가 throw하면 top-level ledger와
aborted run은 남지만 이미 완료한 call의 sanitized request bytes, tool name과 per-call usage trace는 저장되지 않는다. 비용과
usage는 보존됐지만 estimator 진단에 필요한 exact partial trace는 누락됐다.

## Interpretation boundary

- Attempt 2는 valid A/B/C/D comparison이 아니다.
- Condition A는 authoring submission 전에 중단됐으므로 task packet schema v2의 quality 결과가 아니다.
- Product candidate의 173 exact actions, 48 fresh tasks, Canvas/SVG/package execution에 대한 unpaid evidence는 그대로 유효하다.
- Attempt 2의 실패는 paid harness budget accounting과 partial-progress evidence 문제다.

## Next decision

Recommended repair와 대안은 [`GATE_C.md`](./GATE_C.md)가 소유한다. 승인 전에는 runner를 수정하거나 credential을 다시 읽거나
새 external request를 보내지 않는다.
