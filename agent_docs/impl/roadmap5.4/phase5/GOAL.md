# Roadmap 5.4 Phase 5 — Staged Paid Evaluation and Closeout

## 목표

Approved candidate를 작은 A/B/C/D paid smoke로 먼저 검증한다. Harness와 knowledge delivery가 실제 모델 호출에서 정상
동작하는 경우에만 complete paid evaluation 범위와 비용을 제안한다. 결과 확인 뒤 task, threshold 또는 실패를 수정해 같은
attempt를 성공으로 재분류하지 않는다.

## 진행 상태

- [x] R54-P4-D replacement paid-smoke authorization
- [x] Attempt 1 credential read — 1
- [x] Attempt 1 external model calls / spend — 9 / `$0.0593232`
- [x] Attempt 1 stop rule 발동 — `repair-val-histogram:D` request schema rejection
- [x] Attempt 1 immutable result 보존
- [ ] Provider-compatible runner repair와 unpaid validation
- [ ] Authoring bootstrap contract decision
- [ ] Replacement paid-smoke scope/cost approval
- [ ] Valid small paid smoke
- [ ] Complete evaluation proposal or non-integration closeout

## Attempt 1 conclusion

Attempt 1은 valid A/B/C/D comparison이 아니다. A/B/C는 모두 ggaction package-level factory를 잘못 발명했고, D는 모델
호출 전에 `uniqueItems`가 strict function schema에서 거부되어 전체 실행이 중단됐다. Exact result와 원인은
[`ATTEMPT1.md`](./ATTEMPT1.md)가 소유한다.

자동 retry는 하지 않는다. 새 external call은 runner/candidate/plan을 다시 동결하고 별도 replacement Gate를 승인받기 전까지
차단한다.

## Remaining boundaries

- Attempt 1 result, task output 또는 비용 ledger 수정 금지
- Failed task를 success로 재분류하거나 efficiency threshold에 포함 금지
- Unapproved packet schema/public MCP behavior 변경 금지
- Credential 재읽기, external retry와 추가 spend 금지
- Full evaluation, PR Ready/merge, publish, deploy와 release 금지
