# Implementation Roadmaps

이 디렉터리는 현재 architecture/contract와 별도로 구현 순서와 협업 진행 기록을 관리한다.

## 현재 작업

- **현재 활성 계획은 Roadmap 6 Phase 1**이다. [`roadmap6/ROADMAP.md`](roadmap6/ROADMAP.md)는
  173개 액션 감사에서 나온 오류 8건·설계 문제 20건·사용자가 선택한 추가 액션군 19개를 12단계로 연결한다.
  Phase 1 교정을 구현·검증했고 [결과 검토](roadmap6/phase1/REVIEW.md)를 기다린다. 후속 신규 API의 구체 설계는 Proposed다.
- [`roadmap6/TRACEABILITY.md`](roadmap6/TRACEABILITY.md) — 실행 대상 47개 항목과 작업·검증 조건
- [`roadmap6/DESIGN_DECISIONS.md`](roadmap6/DESIGN_DECISIONS.md) — 공통 결정과 migration
- 마지막 완료 owner는 [Roadmap 5.4 Phase 6](roadmap5.4/ROADMAP.md)이다.
- [`ROADMAP_INDEX.json`](ROADMAP_INDEX.json) — nullable active Roadmap/Phase와 마지막 완료 owner의 machine-readable source

## 개발 이력

- [`HISTORY.md`](HISTORY.md) — Roadmap별 결과를 연결하는 간결한 연대기
- [`roadmap1/ROADMAP.md`](roadmap1/ROADMAP.md) — completed, 최초 여섯 chart vertical slice
- [`roadmap2/ROADMAP.md`](roadmap2/ROADMAP.md) — completed, Planned contract 구현과 초기 배포
- [`roadmap2.1/ROADMAP.md`](roadmap2.1/ROADMAP.md) — completed, `0.0.2` 외부 평가 수정
- [`roadmap3/ROADMAP.md`](roadmap3/ROADMAP.md) — completed, Polar·composition·facet과 `0.0.4`
- [`roadmap4/ROADMAP.md`](roadmap4/ROADMAP.md) — completed, native ownership과 advanced static charts
- [`roadmap4.1/ROADMAP.md`](roadmap4.1/ROADMAP.md) — completed, authoring lifecycle과 compatibility completion
- [`roadmap4.2/ROADMAP.md`](roadmap4.2/ROADMAP.md) — completed, SVG/PDF vector renderer와 distribution closeout
- [`roadmap5/ROADMAP.md`](roadmap5/ROADMAP.md) — completed, temporal derivation, ordering과 directional marks
- [`roadmap5.1/ROADMAP.md`](roadmap5.1/ROADMAP.md) — completed, multi-legend layout completion
- [`roadmap5.2/ROADMAP.md`](roadmap5.2/ROADMAP.md) — completed, repository integrity와 maintainer hardening
- [`roadmap5.3/ROADMAP.md`](roadmap5.3/ROADMAP.md) — completed, LLM knowledge/MCP 실험과 non-integration 결과
- [`roadmap5.4/ROADMAP.md`](roadmap5.4/ROADMAP.md) — completed, compact knowledge delivery와 local MCP integration

## 재사용하는 개발 절차

- [`CHART_DEVELOPMENT_CYCLE.md`](CHART_DEVELOPMENT_CYCLE.md) — roadmap과 무관하게 재사용하는 chart 개발 절차
- [`SOURCE_STRUCTURE.md`](SOURCE_STRUCTURE.md) — source organization 정리 기록
- [`TEST_STRUCTURE.md`](TEST_STRUCTURE.md) — test organization 정리 기록
- [`DOCS_IMPROVEMENTS.md`](DOCS_IMPROVEMENTS.md) — documentation 정리 기록

각 roadmap은 자기 `phaseN/` 운영 문서와 `chart/` 구현 계약을 소유한다. 완료된 roadmap 기록은
당시 진행 내역으로 보존하고, 현재 API의 canonical 상태는 action contract catalog에서 확인한다.
