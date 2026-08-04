# Roadmap 5.1 Phase 3 — Integration and Closeout

## 목표

승인된 all-edge multi-legend layout을 stable capability evidence로 승격하고 Current contract, architecture,
public docs, generated reference, four-renderer output과 installed package를 한 번 더 검증한다. R51-Exit review
package를 원격 체크포인트로 만든 뒤 사용자의 explicit 승인 전에는 Roadmap 완료 상태나 active pointer를
변경하지 않는다.

## 진행 상태

- [ ] Phase 1~2 승인 결과와 Current contract 재감사
- [ ] Actual Cars horizontal lane을 stable primitive/public chart pair로 승격
- [ ] Gate-only 비교 artifact와 test ownership 정리
- [ ] Canvas/SVG/PNG/PDF stable artifact와 exact parity 검증
- [ ] Public docs, generated docs, declarations와 package consumer 동기화
- [ ] Full normal/render/coverage/package verification
- [ ] R51-Exit remote checkpoint 기록
- [ ] 사용자 explicit R51-Exit approval

## Gate R51-Exit

Canonical review record는 [`GATE_EXIT.md`](./GATE_EXIT.md)가 소유한다.

### 승인 대상

- Same-edge multi-legend의 side/top/bottom layout과 lifecycle convergence가 Current 상태인지
- Actual Cars stable primitive/public pair와 Canvas/SVG/PNG/PDF가 같은 final `graphicSpec`을 소비하는지
- 임시 Gate evidence 제거, docs/contracts/types/package synchronization과 cumulative verification이 완료됐는지

### 승인 전 차단

- Roadmap 5.1 completed 전환과 active pointer 해제
- PR creation, merge, release, publish 또는 documentation deployment
