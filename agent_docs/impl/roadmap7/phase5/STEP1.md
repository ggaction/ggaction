# Phase 5 STEP1 — 실행과 증거 원장

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

1. W1: editParallelScale/offset scale을 existing editScale의focused resolver로 연결.
2. W2: size continuous/discrete mapper와area-correct mark/legend geometry.
3. W3: field stroke+scale+legend channel과series grain validator.
4. W4: encodeChannels final-state plan과all-consumer preflight.
5. W5: 단일 encode 동등성, 중간-invalid final-valid, combined legend와shared scale 통합.

## 반드시 읽을 계약

- [R20 — Parallel 차원별 scale 집중 편집](../features/20-parallel-scale.md)
- [R21 — 중첩 band offset scale 집중 편집](../features/21-offset-scales.md)
- [R23 — 크기 scale의 비선형·단계형 mapping](../features/23-size-scale-types.md)
- [R22 — 필드 기반 stroke 색상](../features/22-stroke-color.md)
- [R19 — 다중 채널의 원자적 재인코딩](../features/19-atomic-encoding.md)

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
