# Implementation Roadmaps

이 디렉터리는 현재 architecture/contract와 별도로 구현 순서와 협업 진행 기록을 관리한다.

## 현재 작업

- [`roadmap4/ROADMAP.md`](roadmap4/ROADMAP.md) — **active**, Phase 12 완료 후 다음 Phase를 열지 않은 상태
- [`ROADMAP_INDEX.json`](ROADMAP_INDEX.json) — Roadmap status, nullable active Phase와 마지막 완료 Phase의 machine-readable owner

## 개발 이력

- [`HISTORY.md`](HISTORY.md) — Roadmap별 결과를 연결하는 간결한 연대기
- [`roadmap1/ROADMAP.md`](roadmap1/ROADMAP.md) — completed, 최초 여섯 chart vertical slice
- [`roadmap2/ROADMAP.md`](roadmap2/ROADMAP.md) — completed, Planned contract 구현과 초기 배포
- [`roadmap2.1/ROADMAP.md`](roadmap2.1/ROADMAP.md) — completed, `0.0.2` 외부 평가 수정
- [`roadmap3/ROADMAP.md`](roadmap3/ROADMAP.md) — completed, Polar·composition·facet과 `0.0.4`

## 재사용하는 개발 절차

- [`CHART_DEVELOPMENT_CYCLE.md`](CHART_DEVELOPMENT_CYCLE.md) — roadmap과 무관하게 재사용하는 chart 개발 절차
- [`SOURCE_STRUCTURE.md`](SOURCE_STRUCTURE.md) — source organization 정리 기록
- [`TEST_STRUCTURE.md`](TEST_STRUCTURE.md) — test organization 정리 기록
- [`DOCS_IMPROVEMENTS.md`](DOCS_IMPROVEMENTS.md) — documentation 정리 기록

각 roadmap은 자기 `phaseN/` 운영 문서와 `chart/` 구현 계약을 소유한다. 완료된 roadmap 기록은
당시 진행 내역으로 보존하고, 현재 API의 canonical 상태는 action contract catalog에서 확인한다.
