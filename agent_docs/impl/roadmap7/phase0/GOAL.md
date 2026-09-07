# Phase 0 — 선택 범위·계약·baseline 고정

상태: planned. 이 문서는 실행 계획이며 구현 또는 승인 완료 기록이 아니다.

## 목표와 범위

선택 25개 전체의 계획 계약과 baseline.

선행 Phase: 없음. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. 현재 commit/method inventory/기존 probe snapshot을 재확인하고 이번25개와 제외25개의 경계를 고정한다.
2. 공통 계약, API_DETAILS와 DECISIONS의 proposed 이름/수식/ownership을 실제 schema diff로 검토한다.
3. 모든 phase별 capability owner·required matrix·기계 inventory를 확인한다. 구현 stub을 만들지 않는다.
4. 검증된 계획 전체를 commit/push하고 A gate의 정확한 승인 범위를 기록한다.

## 경계와 다음 작업

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
