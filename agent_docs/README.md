# Agent documentation

이 디렉터리는 현재 구현 계약과 architecture, 실행 중인 roadmap, 보존된 개발 이력을 함께 관리한다.
문서의 양이 많으므로 전체를 순서대로 읽지 말고 아래 작업별 진입점을 사용한다.

## 지금 읽을 문서

| 목적 | Canonical 문서 |
| --- | --- |
| 현재 macro-architecture 확인 | [`SECOND_ARCHITECTURE.md`](SECOND_ARCHITECTURE.md) |
| 구현된 action의 정확한 계약 찾기 | [`contract/ACTION_INDEX.json`](contract/ACTION_INDEX.json) |
| action 전체 현황 훑기 | [`contract/ACTION_CATALOG.md`](contract/ACTION_CATALOG.md) |
| 현재 구현 계약 읽기 | [`contract/current/`](contract/current/) |
| 승인된 미래 계약 읽기 | [`contract/planned/`](contract/planned/) |
| 현재 개발 순서 확인 | [`impl/README.md`](impl/README.md) |

현재 실행 계획은 **Roadmap 4**이고 다음 미완료 범위는 **Phase 12 — collision-aware label
layout**이다. 이 포인터의 machine-readable owner는
[`impl/ROADMAP_INDEX.json`](impl/ROADMAP_INDEX.json)이다.

## 작업별 읽기 경로

### 기존 action을 수정할 때

1. `ACTION_INDEX.json`에서 action 이름을 찾는다.
2. `contract.file`과 `contract.anchor`가 가리키는 정확한 section만 읽는다.
3. ownership, state 또는 materialization boundary가 바뀔 때만 현재 architecture의 관련 section을 읽는다.

### 새 action이나 capability를 추가할 때

1. [`contract/README.md`](contract/README.md)의 lifecycle과 status 규칙을 확인한다.
2. 활성 Roadmap의 해당 Phase와 Gate를 읽는다.
3. 현재 architecture에서 가장 가까운 기존 family의 ownership과 materialization 흐름을 확인한다.

### Roadmap 작업을 계속할 때

1. `ROADMAP_INDEX.json`의 `activeRoadmap`과 `activePhase`를 확인한다.
2. 활성 `ROADMAP.md`의 해당 Phase를 읽는다.
3. 존재한다면 해당 `phaseN/GOAL.md`, `STEPn.md`, Gate 기록만 추가로 읽는다.

### 과거 결정 이유를 조사할 때

[`impl/HISTORY.md`](impl/HISTORY.md)에서 관련 Roadmap을 찾은 뒤 당시 STEP/Gate 문서를 읽는다.
과거 Roadmap은 개발 이력이며 현재 observable behavior의 계약이 아니다.

## 문서 권위 순서

정확한 현재 동작이 서로 다르게 적혀 있다면 다음 순서를 따른다.

1. 현재 source, declaration과 executable test
2. `contract/current/`와 `ACTION_INDEX.json`
3. `SECOND_ARCHITECTURE.md`
4. 활성 Roadmap
5. 완료된 Roadmap과 `INITIAL_ARCHITECTURE.md`

완료된 기록은 삭제하거나 현재 계약처럼 다시 쓰지 않는다. 현재와 달라진 부분은 역사적 맥락으로
보존하고, 현재 owner를 링크한다.
