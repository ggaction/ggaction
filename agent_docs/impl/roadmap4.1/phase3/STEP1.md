# STEP 1 — Bounded Legend Edit and Selective Removal

## 진행 상태

- [x] Legend registry/config/semantic/graphic ownership mapping
- [x] Stroke-width edit-kind validation and rematerialization
- [x] Requested channels to complete-block removal preflight
- [x] Atomic block cleanup and retained-block preservation
- [x] Contract/type/docs synchronization
- [x] Focused and cumulative verification
- [x] Gate evidence/commit/push

## 실행 순서

1. Current legend target resolution, kind registry, semantic/config resource IDs와 rematerializers를 mapping한다.
2. Stroke-width target은 title/count/labels/titleStyle만 accept하고 unsupported edit option을 첫 change 전에 거부한다.
3. Explicit channels를 active complete legend blocks에 resolve하고 combined categorical block의 partial request를 거부한다.
4. Selected block의 semantic/config/graphic resources만 제거하고 other target blocks, encodings와 scales를 보존한다.
5. Omitted channels는 existing whole-target removal behavior와 trace를 유지한다.
6. Current contract, declaration, inventory, docs와 generated references를 같은 conceptual change에서 동기화한다.
7. Focused tests부터 cumulative suites와 representative renderer/package evidence 순으로 검증한다.

## Gate evidence

구현 완료 뒤 exact public calls/state/trace/test/compatibility 결과와 remote commit을 [`GATE_A.md`](./GATE_A.md)에
기록한다.

Verified functional checkpoint는 `872f9a0`이며 `origin/codex/roadmap4-1-lifecycle`에 push되었다. Gate package는
[`GATE_A.md`](./GATE_A.md)에 자체 완결적으로 기록했고 Phase 4는 사용자 승인 전까지 시작하지 않는다.
