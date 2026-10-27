# STEP-004–009 — identity와 resource 통합

## 진행 상태

- [x] 현재 owner와 원안의 차이 확인
- [x] typed scalar/tuple와 explicit correspondence 독립 reference 시험
- [x] 저장 형식 1/2/3의 고정 입력과 fresh-process 호환성 시험
- [x] API·저장 schema·소비자·호환성 검토안 작성
- [x] 누적 검증 및 원격 evidence checkpoint
- [x] G-CORE 명시 승인 (2026-10-27, 사용자 “승인한다”)
- [x] production 순수 key kernel과 independent oracle 비교
- [x] createData/reviseData 및 persistence 연결
- [x] current contracts·types·generated docs 및 현재 적용 소비자 연결
- [x] 실제 제품 actual과 oracle 비교, atomicity·renderer·package 검증 후 complete

상태 complete. [DESIGN](DESIGN.md)의 D1–D8을 제품 호출 경로에 연결하고 같은 clean revision에서
STEP-004–009의 모든 필수 검사를 통과했다. [Phase 완료 결과](GOAL.md),
[기계 판독 진행 기록](progress/STEP-004.json), [통합 실행 집계](integration-results.json)를 함께 읽는다.

## 검토 준비에서 구현한 것

- `test/oracles/identity.js`: production import 없는 typed key 비교·동등성, generated allocation의 reference.
- `test/unit/oracles/identity.test.js`: type/tuple collision, UTF-16 순서, invalid key, 입력 불변성,
  key 있는 a/b 재정렬, 명시 대응·삭제 token 미재사용·overflow. production wire encoding을 정의하지 않는다.
- `test/fixtures/persistence/legacy-selection/`: exact producer와 SHA-256를 기록한 입력 3개.
- `test/unit/persistence/legacy-selection.test.js`: literal b 선택, tagged scalar, shared array,
  원본 concrete output 보존, current edit/remove, fresh process, malformed input 거부.

## 승인 직후의 구현 계획 (이전 기록)

새 core/itemIdentity owner를 만들기 전에 기존 typed lookup/ordering과 중복 가능성을 확인한다.
순수 codec·allocation actual을 독립 reference와 비교한 뒤 wrapped createData/reviseData에 연결한다.
현재 두 번의 speculative apply에서 namespace를 한 번만 준비한다. semantic validators와 persistence를 함께 갱신하여
중간의 저장 불가능한 program을 완료 checkpoint로 만들지 않는다. 필요하면 STEP-004와 STEP-009의 공통 schema 기반을
동일 conceptual checkpoint로 구현하되 task 전체 완료나 모든 migration closure로 세지 않는다.

후속 [consumer matrix](consumers.json)의 pending 항목과 AT-06–10 closure를 넘긴다.
원안 작업 카드나 Phase 0 완료 기록을 수정하여 승인을 소급 생성하지 않는다.

## 순수 kernel checkpoint (이전 기록)

`src/core/itemIdentity.js`에 typed equality/order, source key mode, explicit row mapping, 분기 namespace,
삭제 token 미재사용과 safe-integer 한도 검증을 구현했다. `test/unit/core/item-identity.test.js`는
독립 oracle과 실제 구현을 비교한다. 공개 create/revise와 저장 형식은 아직 연결 전이며 STEP-004는 계속 in-progress다.

필수 검사는 identity unit, oracle 독립성·discovery·package boundary contract, package artifact 검사다.
공개 실행 경로에 아직 연결되지 않은 순수 계산 단위이므로 전체 renderer/browser 검사는 연결 checkpoint에서 실행한다.

검증 결과: identity unit 8 passed, contract 36 passed (독립성·discovery·package boundary/artifact·문서 경로).
Package artifact는 655 entries / 979,932 packed bytes / 4,587,103 unpacked bytes였다.
기존 상한 654 / 978,000 / 4,580,000 초과를 확인하고 655 / 980,000 / 4,588,000으로 조정했다.
