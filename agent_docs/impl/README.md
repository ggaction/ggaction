# Implementation Roadmaps

이 디렉터리는 현재 architecture/contract와 별도로 구현 순서와 협업 진행 기록을 관리한다.

## 현재 상태

- 현재 활성 계획은 없다. 마지막 완료 owner는 **Roadmap 7 Phase 12**다.
- [`roadmap7/ROADMAP.md`](roadmap7/ROADMAP.md) — 완료된 범위·의존성·Phase 0–12 실행 기록
- [`roadmap7/LOW_INFERENCE_IMPLEMENTATION_SPEC.md`](roadmap7/LOW_INFERENCE_IMPLEMENTATION_SPEC.md) —
  낮은 성능의 구현자도 결과를 재현·감사할 수 있는 상세 함수·state·검증 명세
- [`roadmap7/phase12/STEP1.md`](roadmap7/phase12/STEP1.md) — 25개 기능, 154개 사례,
  전체 테스트·현실 시나리오·패키지 closeout
- Roadmap 6 Phase 0–11은 완료된 이력으로 보존한다.
- [`roadmap6/phase11/REVIEW.md`](roadmap6/phase11/REVIEW.md) — 234개 action의 계층·card·MCP·package
  통합 검증과 최종 closeout
- [`roadmap6/TRACEABILITY.md`](roadmap6/TRACEABILITY.md) — 실행 대상 47개 항목과 작업·검증 조건
- [`roadmap6/DESIGN_DECISIONS.md`](roadmap6/DESIGN_DECISIONS.md) — 공통 결정과 migration
- Roadmap 6의 마지막 owner는 [Phase 11](roadmap6/phase11/REVIEW.md)이다.
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
- [`roadmap6/ROADMAP.md`](roadmap6/ROADMAP.md) — completed, hierarchical chart authoring과 action consistency
- [`roadmap7/ROADMAP.md`](roadmap7/ROADMAP.md) — completed, detailed chart authoring operations 25개와 전체 integration closeout

## 재사용하는 개발 절차

- [`CHART_DEVELOPMENT_CYCLE.md`](CHART_DEVELOPMENT_CYCLE.md) — roadmap과 무관하게 재사용하는 chart 개발 절차
- [`SOURCE_STRUCTURE.md`](SOURCE_STRUCTURE.md) — source organization 정리 기록
- [`TEST_STRUCTURE.md`](TEST_STRUCTURE.md) — test organization 정리 기록
- [`DOCS_IMPROVEMENTS.md`](DOCS_IMPROVEMENTS.md) — documentation 정리 기록

각 roadmap은 자기 `phaseN/` 운영 문서와 `chart/` 구현 계약을 소유한다. 완료된 roadmap 기록은
당시 진행 내역으로 보존하고, 현재 API의 canonical 상태는 action contract catalog에서 확인한다.
