# Phase 12 — 25개 항목 통합·계약·패키지 마감

상태: planned. 이 문서는 실행 계획이며 구현 또는 승인 완료 기록이 아니다.

## 목표와 범위

선택 25개 전체의 최종 통합. 신규 기능 추가는 없다.

선행 Phase: 11. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. W1: 선택 25개↔current capability↔API↔tests↔docs↔package evidence 전수 대조.
2. W2: STATE_AND_REPLAY의4개 복합 흐름과R43 future cells 모두 검증.
3. W3: 전체tests/renderers/browser/realistic/docs build/type/installed package matrix.
4. W4: 미지원/미완료 entries를 사용자 승인 없이삭제하거나완료로표시하지 않는다.
5. W5: 현재 architecture/contracts와generated metadata, roadmap pointer를실제완료상태로닫는다. release/PR/publish/deploy는별도요청 범위.

## 경계와 다음 작업

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
