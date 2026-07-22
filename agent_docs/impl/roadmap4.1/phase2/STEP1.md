# STEP 1 — Stable Selection Revision and Removal

## 진행 상태

- [x] Selection/highlight config identity and context mapping
- [x] Complete selector replacement preflight
- [x] Clean target baseline and remaining-highlight replay owner
- [x] Highlight-only and selection-cascade removal
- [x] Contract/type/docs synchronization
- [x] Focused and cumulative verification
- [x] Gate evidence/commit/push

## 실행 순서

1. Current selection grammar, item policies, highlight styles, mark rematerializers와 legend reflection을 mapping한다.
2. Existing selection을 explicit/current/unique rule로 resolve하고 같은 target에서 새 complete selector를 preflight한다.
3. Edited selection에 highlight가 있으면 target의 모든 highlight를 clean baseline에서 deterministic order로 replay한다.
4. Highlight removal은 stored selection을 보존하고 mark와 categorical legend를 baseline으로 복구한 뒤 remaining
   highlight만 replay한다.
5. Selection removal은 dependent highlight removal을 wrapped child로 먼저 실행하고 selection config/context를
   해제한다.
6. Current contract, declarations, inventory, public docs와 generated references를 동기화한다.
7. Focused tests, normal cumulative suites, representative Canvas/PNG/Browser와 packed consumer 순으로 검증한다.

## Gate evidence

구현 완료 뒤 exact source/state/trace/test/compatibility 결과와 remote commit을 [`GATE_A.md`](./GATE_A.md)에
기록한다.

Functional checkpoint는 `14f4e1a`이며 `origin/codex/roadmap4-1-lifecycle`에 push되었다. Gate package는
[`GATE_A.md`](./GATE_A.md)에 자체 완결적으로 기록했고 Phase 3은 사용자 승인 전까지 시작하지 않는다.
