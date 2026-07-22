# STEP 1 — Cartesian Axis Component Removal

## 진행 상태

- [x] Axis semantic/config/graphic ownership and aggregate dispatch mapping
- [x] Complete proposed-operation preflight
- [x] Leaf/group removal and retained-component reconciliation
- [x] Last-component cleanup and ordinary recreate
- [x] Contract/type/docs synchronization
- [x] Focused and cumulative verification
- [x] Gate evidence/commit/push

## 실행 순서

1. Current Cartesian axis creation/edit facades, component owners, materialization config와 concrete graphic IDs를 mapping한다.
2. `editXAxis`/`editYAxis`가 selected nested edit/removal 전체와 group/leaf conflicts를 첫 child action 전에 검증하게 한다.
3. `false` component를 semantic/config/graphic state에서 제거하고 retained component만 current Canvas와 scale에서
   deterministic하게 유지한다.
4. 마지막 component 제거는 empty axis branch와 owned config/graphics를 완전히 정리하고 ordinary create path로
   recreate할 수 있게 한다.
5. Scale/Canvas revision 뒤 removed component가 stale config에서 복원되지 않는지 검증한다.
6. Current contract, declarations, inventory, public docs와 generated references를 동기화한다.
7. Focused tests, normal cumulative suites, representative Canvas/PNG/Browser와 packed consumer 순으로 검증한다.

## Gate evidence

구현 완료 뒤 exact source/state/trace/test/compatibility 결과와 remote commit을 [`GATE_A.md`](./GATE_A.md)에
기록한다.

Verified functional checkpoint는 `52b26d8`이며 `origin/codex/roadmap4-1-lifecycle`에 push되었다. Gate package는
[`GATE_A.md`](./GATE_A.md)에 자체 완결적으로 기록했고 Phase 5는 사용자 승인 전까지 시작하지 않는다.
