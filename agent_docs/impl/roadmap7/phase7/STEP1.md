# Phase 7 STEP1 — 실행과 증거 원장

## 진행 상태

- [ ] 범위·현재 source owner·선행 Phase 완료 상태 확인
- [ ] Gate A 자료: 정확한 API/schema/defaults/오류/수치 oracle 작성·검증
- [ ] 명시 승인 범위 기록 후 해당 구현 시작
- [ ] appearance 대상은 primitive render와 target public chain으로 Gate V 확인
- [ ] 아래 wave 구현과 focused/cumulative tests 완료
- [ ] types/current contracts/catalog/cards/MCP/docs/package 영향 갱신
- [ ] Gate X 결과와 남은 후속 통합 cell 기록
- [ ] 검증된 coherent change마다 commit/push하고 다음 Gate 범위 확인

계획 작성 시 모든 체크는 미완료다. Phase 0 은 제품 구현이 없으므로 해당 구현·시각 항목의 미적용 이유를 기록한다. Phase 12 는 새 시각 목표가 없으면 승인된 variant를 현재 코드에서 다시 실행해 검증한다.

## 작업 단위

1. W1: attached label-only removal closure와replay cleanup.
2. W2: source-final-item label selection, inline/named recipe와predicate stage.
3. W3: signed/stack/arc semantic anchors, fit fallback와leader ownership.
4. W4: boundData/visibleItems dynamic references와domain-contribution 차단.
5. W5: data edit → selection → labels/reference → layout → highlight 전체와삭제 순서 통합.

## 반드시 읽을 계약

- [R31 — 원본 마크를 보존하는 붙임 라벨 삭제](../features/31-remove-labels.md)
- [R32 — 선택된 final item만 라벨링](../features/32-selected-labels.md)
- [R33 — 의미 기반 라벨 anchor와 배치 정책](../features/33-semantic-label-anchors.md)
- [R36 — 데이터를 추적하는 통계 참조선·밴드](../features/36-statistical-references.md)

공통 [COMMON_CONTRACT](../COMMON_CONTRACT.md), [API_DETAILS](../API_DETAILS.md), [STATE_AND_REPLAY](../STATE_AND_REPLAY.md), [VALIDATION](../VALIDATION.md)을 적용한다. 이 Phase의 후보 목록은 [CANDIDATES.json](CANDIDATES.json)이다.

## 각 wave의 구현 절차

1. 관련 src/test/types/docs의 AGENTS.md를 읽고 ACTION_INDEX에서 기존 계약을 확인한다.
2. 구체적인 fixture로 변경 전후의 semantic/config/graphic을 기록한다. public/primitive/owner 경계를 확인한다.
3. pure validator/materializer → domain action → public registry/types → composition consumer 순서로 작은 coherent diff를 만든다.
4. 기능 명세의 수치 oracle·오류·불변성·lifecycle을 독립 expected로 검증한다. 후속 기능을 기다리는 통합 case는 owner와  상태를 명시한다.
5. 실제 구현된 항목만 current contracts/metadata에 반영하고 generated checks를 통과한다.
6. diff/status와 scoped tests를 확인한 뒤 commit/push한다. source와 정확한 결과를 아래 원장에 기록한다.

## 결과 원장

| wave | commit | tests/artifacts | remaining | status |
| --- | --- | --- | --- | --- |
| 미착수 | — | 실행 증거 없음 | 위 전체 범위 | planned |

## Gate 연결

[GATES.md](GATES.md)를 따른다. 승인 없는 Gate 이후의 dependent implementation을 시작하지 않는다. 이미 승인된 범위는 재승인을 요구하지 않고 기록을 참조한다.
