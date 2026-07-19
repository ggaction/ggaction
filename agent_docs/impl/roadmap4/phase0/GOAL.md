# Roadmap 4 Phase 0 — Baseline and Scope Audit

## 목표

기능 구현 전에 현재 저장소의 architecture, public package boundary, test/build 기준선과 외부 평가의
전체 범위를 확인하고 Roadmap 4의 실행 순서와 gate를 확정한다.

## 진행 상태

- [x] 외부 개발 prompt와 통합 보고서 읽기
- [x] 최종 추천 proposal 13개 원문 읽기
- [x] runtime bug 3개와 docs bug 1개 원문 읽기
- [x] `INITIAL_ARCHITECTURE.md`와 `SECOND_ARCHITECTURE.md` 대조
- [x] source/test/package/docs 구조 조사
- [x] normal test, coverage, package artifact와 installed consumer 기준선 실행
- [x] Browser/PNG local 실행의 제품 결과와 sandbox 제약 분리
- [x] 기능 ID, 의존 관계, 예상 수정 영역과 exit gate를 Roadmap 4에 배정
- [x] NCP-006/NCP-007 제외와 `encodeParallelCoordinates` 이름 고정
- [x] Basic Chart facade 계층과 `createScatterPlot`, `createLinePlot`, `createBarPlot`,
  `createHistogram`, `createHeatmap`, `createGradientIntervalPlot`, `createParallelCoordinates` 범위 통합

## 산출물

- [Roadmap 4](../ROADMAP.md)
- [Phase 0 실행 기록](./STEP1.md)

## Exit gate

- 기능 13개, runtime bug 3개, docs bug 1개가 정확히 한 번씩 배정됐다.
- Basic Chart facade는 기존 wrapped action을 조합하는 별도 실행 Phase와 capability-owned 확장 Phase에 배정됐다.
- 제외 대상이 구현 또는 docs 계획에 들어가지 않았다.
- 기능 구현 파일은 수정하지 않았다.
- 이후에는 한 번에 하나의 Phase만 진행한다.
