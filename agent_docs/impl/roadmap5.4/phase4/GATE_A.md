# Gate R54-P4-A — Fresh Corpus, Unpaid Result, and Paid-Smoke Proposal

## Gate state

`planned`

이 Gate는 fresh split identity, strict oracle, one-pass validation/held-out unpaid result와 exact paid-smoke proposal을
승인받는다. 승인 전에는 credential을 읽거나 외부 모델을 호출하지 않는다.

## 승인 대상

1. Development 18 / validation 15 / held-out 15의 fresh task identity
2. Dataset/task/oracle SHA-256 freeze와 historical/design corpus overlap 0
3. Constraint closure, exact action/option, fallback, payload와 TypeScript strict oracle
4. Candidate lock 뒤 one-pass validation과 held-out result
5. Package, installed MCP와 browser budget regression evidence
6. Exact paid-smoke model/settings/tasks/repetitions/estimated cost/hard cap

## 승인 효과

승인은 문서에 적힌 exact paid smoke와 hard cap만 연다. Full paid evaluation, PR/merge/publish/deploy/release는 승인하지
않는다.

## 승인 전 차단 범위

- Credential read, external model call와 비용 지출
- Full paid evaluation
- PR, merge, package publish, docs deploy와 release
