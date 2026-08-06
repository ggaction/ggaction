# STEP 2 — Run and Judge Conditions B and C

## 진행 상태

- [x] Apply the approved pricing and spend caps to the runner
- [x] Verify the key source without exposing or copying it into the repository
- [x] Run and preserve all 48 Condition B records
- [x] Run and preserve all 48 Condition C records
- [x] Confirm the same resolved model identity across A/B/C
- [x] Generate aggregate, split, task and failure reports
- [x] Apply the frozen acceptance thresholds
- [x] Record the failed integration candidate without changing the benchmark
- [x] Prepare R53-P6-B review package
- [ ] Commit/push the R53-P6-B remote checkpoint and stop for review

## 판정 원칙

- 실패, timeout과 provider error도 denominator에서 제외하지 않는다.
- Correctness는 generated program을 실제 package/dataset/renderer로 실행한 oracle 결과만 인정한다.
- 성공한 chart의 median token, model calls와 time-to-valid를 A와 비교한다.
- Held-out 결과를 우선하고 authoring 및 overall 결과를 함께 공개한다.
- 결과를 확인한 뒤 task, oracle, threshold 또는 제외 규칙을 수정하지 않는다.

## 중단 조건

Resolved model mismatch, condition cap $5 또는 combined cap $10 도달, corpus/knowledge hash mismatch, 반복적인
provider failure 중 하나가 발생하면 새 paid request를 시작하지 않는다. 완료되지 않은 condition은 benchmark pass로
판정하지 않고 원인과 사용 비용을 보고한 뒤 새 승인을 기다린다.

## 실행 결과

- B: 48 runs, 0 first-pass/final success, 48 invalid-program, $0.795406
- C: 48 runs, 0 first-pass/final success, 48 invalid-program, 380 MCP calls, $0.729342
- Combined paid spend: $1.524748 / approved $10
- Resolved model: all `gpt-5.6-terra`; provider error 0
- Acceptance: failed; successful-chart efficiency는 candidate success가 0이라 계산 불가

Exact aggregate와 sanitized run evidence는 [`LLM_COMPARISON.md`](./LLM_COMPARISON.md)와
[`LLM_COMPARISON.json`](./LLM_COMPARISON.json)이 소유한다.
