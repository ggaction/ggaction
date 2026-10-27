# STEP-004 — row identity 검토 준비

## 진행 상태

- [x] 현재 owner와 원안의 차이 확인
- [x] typed scalar/tuple와 explicit correspondence 독립 reference 시험
- [x] 저장 형식 1/2/3의 고정 입력과 fresh-process 호환성 시험
- [x] API·저장 schema·소비자·호환성 검토안 작성
- [x] 누적 검증 및 원격 evidence checkpoint
- [x] G-CORE 명시 승인 (2026-10-27, 사용자 “승인한다”)
- [ ] production kernel과 createData/reviseData 연결
- [ ] current contracts·types·generated docs 및 모든 적용 소비자 연결
- [ ] 실제 제품 actual과 oracle 비교, atomicity·renderer·package 검증 후 complete

상태 in-progress. independent oracle의 통과를 STEP-004 complete로 기록하지 않는다.
[DESIGN](DESIGN.md)의 D1–D8이 승인되었으며 현재 product call은 아직 변경되지 않았다.
[기계 판독 진행 기록](progress/STEP-004.json)과 [실행 집계](evidence/summary.json)를 함께 읽는다.

## 검토 준비에서 구현한 것

- `test/oracles/identity.js`: production import 없는 typed key 비교·동등성, generated allocation의 reference.
- `test/unit/oracles/identity.test.js`: type/tuple collision, UTF-16 순서, invalid key, 입력 불변성,
  key 있는 a/b 재정렬, 명시 대응·삭제 token 미재사용·overflow. production wire encoding을 정의하지 않는다.
- `test/fixtures/persistence/legacy-selection/`: exact producer와 SHA-256를 기록한 입력 3개.
- `test/unit/persistence/legacy-selection.test.js`: literal b 선택, tagged scalar, shared array,
  원본 concrete output 보존, current edit/remove, fresh process, malformed input 거부.

## 승인된 첫 구현

새 core/itemIdentity owner를 만들기 전에 기존 typed lookup/ordering과 중복 가능성을 확인한다.
순수 codec·allocation actual을 독립 reference와 비교한 뒤 wrapped createData/reviseData에 연결한다.
현재 두 번의 speculative apply에서 namespace를 한 번만 준비한다. semantic validators와 persistence를 함께 갱신하여
중간의 저장 불가능한 program을 완료 checkpoint로 만들지 않는다. 필요하면 STEP-004와 STEP-009의 공통 schema 기반을
동일 conceptual checkpoint로 구현하되 task 전체 완료나 모든 migration closure로 세지 않는다.

후속 [consumer matrix](consumers.json)의 pending 항목과 AT-06–10 closure를 넘긴다.
원안 작업 카드나 Phase 0 완료 기록을 수정하여 승인을 소급 생성하지 않는다.
