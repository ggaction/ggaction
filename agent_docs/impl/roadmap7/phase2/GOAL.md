# Phase 2 — 결측·지역 달력·기간 window

상태: planned. 이 문서는 실행 계획이며 구현 또는 승인 완료 기록이 아니다.

## 목표와 범위

- [R05 — 결측 조합 완성과 대체](../features/05-complete-impute.md)
- [R08 — 주간·요일·시간대 버킷](../features/08-calendar-buckets.md)
- [R09 — 기간 기반 window와 최소 관측수](../features/09-duration-windows.md)

선행 Phase: 1. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. W1: complete typed key domain/group tuples/provenance와 impute interpolation·edge/missing 정책.
2. W2: timezone boundary numerical prototype와 UTC legacy oracle를 먼저 확정한다.
3. W3: week/weekday/timeZone parsing-independent bucket을 구현한다.
4. W4: duration movingMean/Sum, temporalUnit/minPeriods/missing과 stable two-pointer window.
5. W5: complete → impute → window 및 facet-local replay 통합.

## 경계와 다음 작업

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
