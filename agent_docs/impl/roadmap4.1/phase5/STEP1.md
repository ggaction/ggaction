# STEP 1 — Logical Bin2D Partial Revision

## 진행 상태

- [x] Logical owner, current provenance and consumer mapping
- [x] Complete proposed-state and dependency preflight
- [x] Immutable revision, rebind, rematerialization and orphan release
- [x] Repeated-create compatibility and intent distinction
- [x] Contract/type/docs synchronization
- [x] Focused and cumulative verification
- [x] Gate evidence/commit/push

## 실행 순서

1. Current `createBin2DData` logical ID revision, transform provenance, derived registry and layer consumer flow를 mapping한다.
2. `target`을 explicit/current/unique owner로 resolve하고 omitted option을 current provenance에서 채운 complete candidate를
   첫 child action 전에 검증한다.
3. Existing derived revision planner로 새 immutable revision을 만들고 affected direct layer consumers를 explicit
   `rebindLayerData`로 연결한다.
4. Rebound consumer의 scale, mark, guide와 selection/highlight dependency를 deterministic하게 rematerialize하고
   unreferenced prior revision만 release한다.
5. Repeated `createBin2DData({ id: existing })`의 observable result와 trace compatibility를 보존하면서 public docs에서
   complete create/revision intent와 partial edit intent를 구분한다.
6. Current contract, declarations, inventory, public docs와 generated references를 동기화한다.
7. Focused tests, normal cumulative suites, representative Canvas/PNG/Browser와 packed consumer 순으로 검증한다.

## Gate evidence

구현 완료 뒤 exact public call/source/state/trace/test/compatibility 결과와 remote commit을
[`GATE_A.md`](./GATE_A.md)에 기록한다.

Verified functional checkpoint는 `4eed2dc`이며 `origin/codex/roadmap4-1-lifecycle`에 push되었다. Gate package는
[`GATE_A.md`](./GATE_A.md)에 자체 완결적으로 기록했고 Phase 6는 사용자 승인 전까지 시작하지 않는다.
