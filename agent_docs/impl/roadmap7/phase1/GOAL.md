# Phase 1 — 계산식과 그룹 정규화

상태: planned. 이 문서는 실행 계획이며 구현 또는 승인 완료 기록이 아니다.

## 목표와 범위

- [R06 — 조건·문자열·null 계산식](../features/06-computed-expressions.md)
- [R07 — 그룹 정규화·기준값 비교](../features/07-normalization.md)

선행 Phase: 0. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. W1: computed AST 구조 validator와 nullable/string/boolean evaluator를 분리해 확장한다.
2. W2: grouped normalization pure algorithm과 transform topology를 추가한다.
3. W3: create API/type/trace/facet replay/knowledge와 independent oracle를 완성한다.

## 경계와 다음 작업

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
