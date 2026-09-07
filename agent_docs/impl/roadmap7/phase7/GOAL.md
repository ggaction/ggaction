# Phase 7 — 라벨 lifecycle와 통계 주석

상태: planned. 이 문서는 실행 계획이며 구현 또는 승인 완료 기록이 아니다.

## 목표와 범위

- [R31 — 원본 마크를 보존하는 붙임 라벨 삭제](../features/31-remove-labels.md)
- [R32 — 선택된 final item만 라벨링](../features/32-selected-labels.md)
- [R33 — 의미 기반 라벨 anchor와 배치 정책](../features/33-semantic-label-anchors.md)
- [R36 — 데이터를 추적하는 통계 참조선·밴드](../features/36-statistical-references.md)

선행 Phase: 4, 5, 6. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. W1: attached label-only removal closure와replay cleanup.
2. W2: source-final-item label selection, inline/named recipe와predicate stage.
3. W3: signed/stack/arc semantic anchors, fit fallback와leader ownership.
4. W4: boundData/visibleItems dynamic references와domain-contribution 차단.
5. W5: data edit → selection → labels/reference → layout → highlight 전체와삭제 순서 통합.

## 경계와 다음 작업

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
