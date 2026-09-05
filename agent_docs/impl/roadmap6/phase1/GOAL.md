# Roadmap 6 Phase 1 — Reproduced correctness and contract repairs

## 상태와 목표

상태: completed. 2026-09-05 사용자의 “승인한다”로 [R6-P1-X 결과](REVIEW.md)를 승인했다. W1–W5의 승인 범위를 닫고 Phase 2 계약 검토 준비로 이동한다. B01 lower measure-first는 R6-P2-W5에 남는다.

현재 실행 가능한 계약에서 재현된 실패와 잘못된 지원 주장을 먼저 교정한다. 새 chart facade를 기다리지 않고 사용자에게 정확한 결과와 오류를 준다.

## 선행 조건

- [Phase 0](../phase0/GOAL.md)의 R6-P0-A 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P1-W1 — Bar pair-role와 temporal 선언

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: B01, B07.
- 작업: Facade에서 x/y category·measure를 함께 preflight하고 기존 position owner를 호출한다. 수평 temporal category type을 공통 role union으로 표현한다. Mean default는 유지한다.
- 완료 조건: 가로/세로 shorthand, explicit aggregate, temporal category가 runtime와 strict TS에서 일치. 잘못된 양쪽 category/measure 조합은 명확히 거부.

### R6-P1-W2 — 미완성 derived data의 consumer 검증

- 상대 규모: S. 시간 약속이 아닌 변경 구조 비교다.
- 연결: B05.
- 작업: Definition-only dataset과 materialized dataset을 구별한다. Scatter뿐 아니라 같은 consumer selection owner를 쓰는 진입점에 domain precondition을 적용한다.
- 완료 조건: createDerivedData 자체 계약 유지. 후속 action이 internal TypeError 대신 필요한 materialized data를 설명하고 원래 program/trace는 보존.

### R6-P1-W3 — stroke:false runtime·type·prose 정합성

- 상대 규모: S. 시간 약속이 아닌 변경 구조 비교다.
- 연결: B06.
- 작업: Point/Bar의 실제 허용 범위를 declarations, shared alias, Current prose에 맞춘다. Rect 비교 사례를 유지하고 Area/Arc 확장은 이 수정과 분리한다.
- 완료 조건: JS·TS의 동일 positive/negative case 결과, unknown style option 거부, 기존 render 유지.

### R6-P1-W4 — MCP false completion와 intent shadow

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: B02, B03, B04.
- 작업: Area/Strip의 complete-chart provider를 실제 완성 경로 또는 unresolved로 바꾼다. Radial-bar가 generic bar를 shadow하게 한다. Raw mark 요청은 별도 provider로 유지한다.
- 완료 조건: 7개 probe를 실행해 필수 encoding·item grain·coordinate·extra layer를 검사. 지원 안 된 요구를 unresolved=[]로 반환하지 않음. 비용 드는 모델 호출 불필요.

### R6-P1-W5 — Internal inventory의 전체 집합 검증

- 상대 규모: S. 시간 약속이 아닌 변경 구조 비교다.
- 연결: B08.
- 작업: 등록 wrapped method = direct ∪ internal, 교집합 없음, manifest orphan 없음의 전체 집합 대조를 만든다. 누락 16개를 internal에 기록한다.
- 완료 조건: 현재 기준 direct173/internal111/registered284와 일치하며 임의 internal method 누락을 탐지한다. Public promotion 없음.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P1-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
