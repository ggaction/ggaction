# Roadmap 6 Phase 11 — Integration discovery and closeout

## 상태와 목표

상태: planned. 구현·사용자 승인 기록 없음.

단계별 구현을 전체 액션 계층과 제품 surface에서 검증한다. 선택한 19개 액션군과 기존 오류·설계 문제의 결과를 확인하여 실행 범위를 닫는다.

## 선행 조건

- [Phase 10](../phase10/GOAL.md)의 R6-P10-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P11-W1 — 계층·card·discovery 전체 대조

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D20.
- 작업: 변경 후 모든 direct/internal action, declarations, Current, card, public docs를 재분류한다. Wraps/editableVia/supports/units/inference/completion과 실제 public trace를 대조한다.
- 완료 조건: 미분류 direct action 0, supported 주장과 runtime/type 불일치 0. Proposed/Planned/Current 잔여 문장과 selectMarks lifecycle drift 정리.

### R6-P11-W2 — Cross-layer 검증과 installed consumer

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: 로드맵 공통 관리.
- 작업: 각 chart의 H0 시작과 H2 시작, H3 edit를 같은 evidence corpus에서 비교한다. Fresh compositional scenarios, MCP completion, renderers, package/browser ceilings를 검증한다.
- 완료 조건: 승인된 facade마다 child-chain·primitive equivalence와 edit/rematerialization matrix 완료. Existing release gates 통과, 새 payload/bundle 초과를 숨기지 않음.

### R6-P11-W4 — Contract·문서·이력 closeout

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: 로드맵 공통 관리.
- 작업: 승인 범위의 Planned를 Current 또는 승인된 장기 처분으로 정리한다. Durable executable evidence를 capability owner로 옮기고 README/index/history를 갱신한다.
- 완료 조건: 승인 범위 Planned0, unresolved hidden deferral0. 현재 source/type/docs/architecture/generated output 일치. 원격 검증 commit과 명시적 Exit 승인 후에만 completed.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P11-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
