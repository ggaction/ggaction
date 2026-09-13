# Phase 8 STEP1 — 실행과 증거 원장

## 진행 상태

- [x] 범위·현재 source owner·선행 Phase 완료 상태 확인
- [x] Gate A 자료: 정확한 API/schema/defaults/오류/수치 oracle 작성·검증
- [x] 명시 승인 범위 기록 후 해당 구현 시작
- [x] R37 appearance 대상은 primitive render와 target public chain으로 Gate V 확인
- [ ] 아래 wave 구현과 focused/cumulative tests 완료
- [ ] types/current contracts/catalog/cards/MCP/docs/package 영향 갱신
- [ ] Gate X 결과와 남은 후속 통합 cell 기록
- [x] R37 coherent source/test change를 검증하고 commit/push

계획 작성 시 모든 체크는 미완료다. Phase 0 은 제품 구현이 없으므로 해당 구현·시각 항목의 미적용 이유를 기록한다. Phase 12 는 새 시각 목표가 없으면 승인된 variant를 현재 코드에서 다시 실행해 검증한다.

## 작업 단위

1. W1: exact size/opacity/width legend samples와invalid-after-scale-edit preflight.
2. W2: combined block canonical identity/override/transition semantics.
3. W3: typed display mapping과role별facet header side/align/occupied bounds.
4. W4: theme/source/Canvas/reorder/remove replay에서content와style 보존.

## 반드시 읽을 계약

[상세 구현 진입점](../IMPLEMENTATION_SPEC.md), [제안 정정 기록](../CONTRACT_RESOLUTIONS.md), [구현 연결표](../IMPLEMENTATION_MAP.json), [고정 인수 사례](../ACCEPTANCE_CASES.json)를 사용한다. 해당 Phase의 각 feature에서 구현 고정 명세를 적용하고 case ID를 실제 결과 원장에 연결한다.

- [R37 — 연속 범례의 명시적인 표본값](../features/37-legend-values.md)
- [R38 — 결합 범례의 channel block별 편집](../features/38-legend-blocks.md)
- [R39 — 범주 표시명과 facet header 배치](../features/39-display-names-headers.md)

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
| W1 R37 제품 | `8760111d` | `test/contracts/legend-values.test.js`; unit 2,373; contracts 447; docs 47; browser 73; installed Node/TypeScript/MCP/browser consumer | R38 selector 전 combined/multi-block root values는 명시 거부 | Implemented-primary |
| W1 R37 시각 증거 | `547eae1b` | independent lower-level program과 public program의 graphic equivalence 및 decoded PNG pixel hash 일치 | R38/R39의 새 시각 target | passed |
| W2–W4 | — | 실행 전 | R38, R39, Phase 8 통합 | planned |

## Gate 연결

[GATES.md](GATES.md)를 따른다. 승인 없는 Gate 이후의 dependent implementation을 시작하지 않는다. 이미 승인된 범위는 재승인을 요구하지 않고 기록을 참조한다.
