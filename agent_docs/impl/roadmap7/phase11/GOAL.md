# Phase 11 — 미사용 자원 삭제

상태: planned. 이 문서는 실행 계획이며 구현 또는 승인 완료 기록이 아니다.

## 목표와 범위

- [R25 — 미사용 dataset·scale·coordinate 안전 삭제](../features/25-remove-resources.md)

선행 Phase: 10. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. W1: 모든 새 config/semantic/template의live ref path inventory.
2. W2: data/scale/coordinate ref collector와context-only/trace-only 구별.
3. W3: removeData/removeScale/removeCoordinate reject-only mutations.
4. W4: R02 revision release와owner removal 공유 helper regression.
5. W5: 숨은 consumer path별 단일-reference fixture와pixel-invariant unused deletion.

## 경계와 다음 작업

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
