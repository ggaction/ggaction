# Phase 10 — Polar·Parallel facet와 repeat

상태: completed-primary. 모든 Gate가 승인된 범위에서 R43 foundation `89f1c54e`,
runtime `4dbdaf85`, 종료 감사·Current·문서·설치 패키지 `ebf3562a`로 구현·검증됐다.
일곱 non-Cartesian family, 지원 repeat 역할과 선행 label/legend/theme/style 소비 셀을 닫았다.

## 목표와 범위

- [R43 — Polar·Parallel facet와 repeat 지원](../features/43-polar-parallel-facets.md)

선행 Phase: 4, 5, 6, 7, 8, 9. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. W1: chart 지원행렬 각 family primitive/public target fixture와local-frame oracle.
2. W2: source partition/provenance replay 및nested parallel/polar refs.
3. W3: dimension별shared/independent domains와pie-local shares.
4. W4: one-dimensional theta/r/parallelDimension repeat field substitution.
5. W5: local guides/shared compatible legends/header/labels/theme/styles의namespace/replay.
6. W6: 모든 matrix와Cartesian facet/repeat 기존 지원 회귀.

## 경계와 다음 작업

다음 active Phase는 Phase 11 R25 안전한 named resource 삭제다. R43의 별도 public action은
추가하지 않았으며 기존 `facet`, `facetGrid`, `repeatCharts`, `editFacetScales`,
`editFacetGuides`, `editFacetSource`의 지원 범위를 확장했다.

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
