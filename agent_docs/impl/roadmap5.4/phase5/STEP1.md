# Phase 5 Step 1 — Run the Representative Paid Smoke

## 진행 상태

- [x] Gate R54-P4-D approval checkpoint — `c74bde7b`
- [x] Single credential file identity 확인
- [x] Credential 1회 read
- [x] Attempt 1 시작
- [x] 3 task-runs complete, fourth run pre-request rejection
- [x] Stop rule에 따라 즉시 중단
- [x] Automatic retry 0
- [x] Raw progress/result artifact 보존
- [x] Failure classification and root-cause analysis
- [x] Independent runner repair — `935611a9`, provider preflight와 bounded feedback
- [x] Public task-packet decision Gate prepared
- [x] R54-P5-A Option A user approval — 2026-08-09
- [x] Task packet schema v2 implementation and unpaid validation — `6ed5af76`
- [x] Immutable Attempt 1 plan/result hash contract
- [x] Replacement v2 plan and 16 / 16 zero-spend dry-run
- [x] R54-P5-B user approval — 2026-08-09
- [x] Replacement paid smoke execution and immutable result — [`ATTEMPT2.md`](./ATTEMPT2.md)
- [x] Automatic retry 0, additional credential read 0
- [x] Budget-estimator and partial-trace root-cause analysis
- [ ] R54-P5-C runner accounting decision

## Execution discipline

1. Attempt 1은 plan SHA-256 `95010b28aacb596f18398a9e259ed9bec1de9280e78ccd2316a525a73f08bc54`로 시작했다.
2. A/B/C histogram task가 각각 세 model calls를 사용했지만 executable program을 만들지 못했다.
3. D의 첫 request는 provider가 function schema를 거부해 usage ledger에 추가되지 않았다.
4. Runner는 `repair-val-histogram:D`에서 전체 실행을 중단하고 `IN_PROGRESS.json`을 갱신했다.
5. Attempt 1의 remaining task 또는 failed task를 자동으로 다시 호출하지 않는다.

## 차단 범위

- Credential read와 external model call
- Attempt 1 result overwrite, resume 또는 retry
- Public packet schema/contract 변경
- Complete paid evaluation
- Integration, PR, merge, publish, deploy와 release
