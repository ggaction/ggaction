# Phase 8 — 범례 content와 표시명

상태: planned. 이 문서는 실행 계획이며 구현 또는 승인 완료 기록이 아니다.

## 목표와 범위

- [R37 — 연속 범례의 명시적인 표본값](../features/37-legend-values.md)
- [R38 — 결합 범례의 channel block별 편집](../features/38-legend-blocks.md)
- [R39 — 범주 표시명과 facet header 배치](../features/39-display-names-headers.md)

선행 Phase: 5, 7. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. W1: exact size/opacity/width legend samples와invalid-after-scale-edit preflight.
2. W2: combined block canonical identity/override/transition semantics.
3. W3: typed display mapping과role별facet header side/align/occupied bounds.
4. W4: theme/source/Canvas/reorder/remove replay에서content와style 보존.

## 경계와 다음 작업

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
