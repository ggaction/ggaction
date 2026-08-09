# Roadmap 5.4 Phase 6 — Expanded Model-Size Comparison

## 목표

Phase 5의 Terra/Luna 256-run 결과를 수정하지 않고, 이미 동결된 task 범위를 넓혀 GPT-5.4 Nano가 compact knowledge와 local
MCP를 사용했을 때 도달하는 capability floor를 측정한다. 비용 절감 자체보다 더 작은 모델에서도 B/C/D의 correctness,
first-pass, calls, tokens, latency와 cost가 유지되는지를 조건별로 비교한다.

## 진행 상태

- [x] 기존 16 tasks와 결과 전 동결된 8 tasks의 24-task selection 고정
- [x] 12-cell cyclic Latin square의 576-run order 구현
- [x] Terra/Luna/Nano pairwise condition comparison과 route interaction 구현
- [x] GPT-5.4 Nano의 no-explicit-cache-write 가격·usage 차이 처리
- [x] Evaluator checkpoint — `fb6044c4f7ba55a11bbc9e97991ceb3d4f815c7f`
- [x] Exact plan과 route oracle 동결
- [x] 96 routes, 24 canonical submissions와 576-cell dry run
- [x] Focused contracts와 전체 normal suite 분할 검증
- [x] R54-P6-A review package 준비
- [x] R54-P6-A exact paid comparison 승인 — Option A, 2026-08-10
- [x] Attempt 9 external comparison — 8 / 576 뒤 provider identity stop, 자동 retry/resume 없음
- [x] Attempt 9 progress와 ledger byte-for-byte 보존
- [ ] Provider identity observability와 snapshot pinning 무과금 수리
- [ ] Replacement plan과 Gate 준비
- [ ] 새 승인 뒤 576-run external comparison
- [ ] Result analysis와 integration closeout

## 차단 범위

- R54-P6-A 승인 전 credential read, 외부 model call와 비용 지출
- Plan 중단 뒤 자동 resume, retry 범위 확대, task 교체 또는 추가 repetition
- 결과 확인 뒤 candidate, prompt, evaluator, threshold 또는 task selection 수정
- PR Ready, merge, package publish, docs deploy와 release
