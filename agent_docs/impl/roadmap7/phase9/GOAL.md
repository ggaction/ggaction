# Phase 9 — 사용자 theme와 형상 스타일

상태: planned. 이 문서는 실행 계획이며 구현 또는 승인 완료 기록이 아니다.

## 목표와 범위

- [R47 — 사용자 theme tokens와 composition 전파](../features/47-custom-theme.md)
- [R49 — 둥근 모서리와 stroke cap·join](../features/49-shape-style-details.md)

선행 Phase: 7, 8. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. W1: custom tokens closed schema와explicit style precedence.
2. W2: nested composition descendants propagation와retained source theme recipe.
3. W3: rounded rect common path 및cap/join/miter bounds primitive 먼저 구현.
4. W4: 기존 mark create/edit/legend/highlight/renderers에 동일 attrs 전달.
5. W5: reencode/theme/Canvas/facet-style persistence 및renderer matrix.

## 경계와 다음 작업

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
