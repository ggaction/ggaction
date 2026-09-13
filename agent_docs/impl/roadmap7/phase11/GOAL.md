# Phase 11 — 미사용 자원 삭제

상태: completed-primary. R25 typed reference inventory, reject-only 안전 삭제, 기존
derived/mark/selection 수명주기 통합과 Current·문서·설치 패키지가 제품 checkpoint
`c29f496c`에서 구현·검증됐다.

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

다음 active Phase는 Phase 12 전체 통합·계약·패키지 마감이다. R25 public 범위는 세
named resource action으로 닫혔으며 cascade, force, batch와 concat cross-child 삭제는 추가하지 않았다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
