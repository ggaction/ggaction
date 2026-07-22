# Roadmap 4.1 Phase 0 — Lifecycle Contract Gate

## 목표

선택된 열 가지 lifecycle gap을 현재 source, strict declarations, contracts와 executable evidence에서 다시
검증하고, runtime 구현 전에 public API와 cascade/revision policy를 하나의 승인 가능한 package로 확정한다.

## 진행 상태

- [x] Current 159 direct action과 lifecycle inventory 재집계
- [x] 선택 번호를 LC-01/03/04/05/06/07/08/09/11/12로 고정
- [x] Current source/types/contracts에서 각 gap 재현
- [x] Public mark-data rebind와 standalone resource removal을 범위 밖으로 고정
- [x] Proposed-only action/extension inventory 작성
- [x] Phase dependency와 Gate 분할 작성
- [x] Contract/unit baseline 실행
- [x] R41-P0-A review package commit/push — `ffe163b`
- [ ] 사용자 explicit approval
- [ ] Approved subset을 ACTION_INDEX Planned inventory로 승격

## Gate R41-P0-A

### 승인 대상

- 새 direct action 8개
- Existing action parameter/dispatch extension 12개
- Encoding, selection, legend와 derived revision cascade 8개 결정
- 9개 implementation/closeout Phase의 순서와 evidence boundary

Exact 목록과 추천안은 [`../PROPOSALS.json`](../PROPOSALS.json) 및 [`GATE_A.md`](./GATE_A.md)가 소유한다.

### Required evidence

- Current baseline: `npm run test:contracts`, `npm run test:unit`
- Machine-readable proposal가 `ACTION_INDEX.json` Planned/Current에 들어가지 않았다는 비교
- 선택한 각 gap의 current source/type/contract evidence
- Compatibility, non-goal, state/trace/materialization 영향
- Remote commit

### 승인 전 차단

- Runtime registrar와 public declaration 변경
- ACTION_INDEX Planned/Current promotion
- Current contract/public docs 변경
- Phase 1 이후 implementation

## Exit

사용자가 exact proposal 또는 수정된 subset을 명시적으로 승인한다. 승인 응답과 Gate commit을 기록한 뒤에만
Phase 0을 completed로 바꾸고 Phase 1을 in-progress로 연다.
