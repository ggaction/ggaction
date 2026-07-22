# Roadmap 4.1 Phase 2 — Selection and Highlight Lifecycle

## 목표

Stable selection ID와 target을 유지하면서 selector 전체를 교체하고, highlight assignment와 selection resource를
각각 안전하게 해제한다. 모든 graphical transition은 clean mark baseline에서 remaining highlight와 categorical
legend reflection을 다시 계산한다.

## 진행 상태

- [x] R41-P1-A explicit approval과 active Phase 전환
- [x] R41-P2-A Gate 선언
- [ ] Current selection/highlight owner와 rematerialization flow 전수 mapping
- [ ] `editMarkSelection` implementation and focused tests
- [ ] `removeMarkHighlight` implementation and focused tests
- [ ] `removeMarkSelection` cascade implementation and focused tests
- [ ] Types/current contracts/ACTION_INDEX/public docs 동기화
- [ ] Focused/cumulative/Browser/PNG/package verification
- [ ] R41-P2-A remote checkpoint
- [ ] 사용자 explicit approval

## Gate R41-P2-A

### 승인 대상

- Stable selection ID/target와 complete selector replacement
- Highlight-only removal이 selection intent를 보존하는 결과
- Selection removal이 dependent highlight를 먼저 제거하는 wrapped cascade
- Clean baseline, remaining highlight order와 categorical legend reflection

### Required evidence

- Shortest valid edit/remove와 explicit/current/unique/ambiguous selection resolution
- Every selector source/operator/grain family replacement
- Point/bar/rect/line/area/arc/rule highlight removal and restoration
- Multiple same-target highlight preservation and deterministic selected-last order
- Exact categorical legend baseline restoration and remaining reflection
- Empty edited selection, filtered cardinality, Canvas/scale/encoding rematerialization
- Direct missing removal error, target immutability and dependent cascade trace
- Previous program and caller option immutability
- Focused/cumulative/Browser/PNG/package results and remote checkpoint

### 승인 전 차단

Phase 3 legend lifecycle implementation.

## Non-goals

- Selection target or ID replacement
- Partial selector merge
- Highlight style edit alias; existing `highlightMarks` replacement remains canonical
- New selector operator, interaction, event or renderer behavior
- Mark/data/scale/coordinate removal
