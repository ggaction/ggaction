# Roadmap 6 Phase 0 — Baseline and decisions

## 상태와 목표

상태: planned. 구현·사용자 승인 기록 없음.

기준 제품과 감사 증거를 고정하고, 48개 항목을 빠짐없이 실행 가능한 단위에 연결한다. 이 단계는 계획과 결정 기록이며 제품 구현을 시작하지 않는다.

## 선행 조건

- 기준 commit과 감사 기록이 존재한다.
- 로드맵 작성 요청의 범위에서 계획을 작성한다.

## 구체적인 작업 묶음

### R6-P0-W1 — 감사와 source identity 고정

- 상대 규모: S. 시간 약속이 아닌 변경 구조 비교다.
- 연결: 로드맵 공통 관리.
- 작업: 173개 direct, 284개 wrapped, internal 95/111, 43 API·7 MCP·4 type 사례를 저장한다. 새 clone에서 재현할 명령과 기준 commit을 기록한다.
- 완료 조건: 원본 evidence와 source commit이 연결되고 ignored artifact 없이 읽을 수 있다.

### R6-P0-W2 — 계층과 traceability 작성

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: 로드맵 공통 관리.
- 작업: H0–H4, exposure, lifecycle을 분리한다. 모든 B/D/F 항목에 primary owner, dependent phases와 acceptance를 부여한다.
- 완료 조건: 48개 ID 중 누락·중복 primary owner 0; 전체 액션 전수표 링크가 존재한다.

### R6-P0-W3 — 변경 결정과 migration 고정

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: 로드맵 공통 관리.
- 작업: Current bug repair와 새 의미·default 변경을 구분한다. 각 단계에 A/V/X와 compatibility 예제를 요구한다.
- 완료 조건: Proposed를 Current/Planned로 승격한 항목 0, 승인했다고 기록한 Gate 0.

### R6-P0-W4 — 검증과 납품 순서 작성

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: 로드맵 공통 관리.
- 작업: 수치·계층·편집·render·types·MCP·package matrix와 F20 별도 연구 진입 기준을 작성한다.
- 완료 조건: 각 단계가 진입 조건, 구체적 결과, 실패 조건, 다음 Gate를 가진다.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P0-A 승인 전 Phase 1을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
