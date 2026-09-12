# Phase 1 STEP1 — 실행과 증거 원장

## 진행 상태

- [x] 범위·현재 source owner·선행 Phase 완료 상태 확인
- [x] Gate A 자료: 정확한 API/schema/defaults/오류/수치 oracle 작성·검증
- [x] 명시 승인 범위 기록 후 해당 구현 시작
- [x] data-only 범위라 새 appearance 목표가 없음을 확인하고 기존 Canvas consumer를 실행
- [x] 아래 wave 구현과 focused/cumulative tests 완료
- [x] types/current contracts/catalog/cards/MCP/docs/package 영향 갱신
- [x] Gate X 결과와 남은 후속 통합 cell 기록
- [x] 검증된 coherent change를 commit/push하고 Phase 2로 전환

계획 작성 시 모든 체크는 미완료다. Phase 0 은 제품 구현이 없으므로 해당 구현·시각 항목의 미적용 이유를 기록한다. Phase 12 는 새 시각 목표가 없으면 승인된 variant를 현재 코드에서 다시 실행해 검증한다.

## 작업 단위

1. W1: computed AST 구조 validator와 nullable/string/boolean evaluator를 분리해 확장한다.
2. W2: grouped normalization pure algorithm과 transform topology를 추가한다.
3. W3: create API/type/trace/facet replay/knowledge와 independent oracle를 완성한다.

## 반드시 읽을 계약

[상세 구현 진입점](../IMPLEMENTATION_SPEC.md), [제안 정정 기록](../CONTRACT_RESOLUTIONS.md), [구현 연결표](../IMPLEMENTATION_MAP.json), [고정 인수 사례](../ACCEPTANCE_CASES.json)를 사용한다. 해당 Phase의 각 feature에서 구현 고정 명세를 적용하고 case ID를 실제 결과 원장에 연결한다.

- [R06 — 조건·문자열·null 계산식](../features/06-computed-expressions.md)
- [R07 — 그룹 정규화·기준값 비교](../features/07-normalization.md)

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
| W1 | `b891d1d5` | computed oracle, nullable/string/boolean typed AST, nominal/null/facet consumers | `editComputedData`와 source revision은 R02/Phase 4 | completed-primary |
| W2 | `b891d1d5` | share/minmax/zscore/index/change/percentChange oracle, zero policy, stable baseline, group/facet-local replay | `editNormalizedData`와 source revision은 R02/Phase 4 | completed-primary |
| W3 | `b891d1d5` | Full-only runtime/types, Current/catalog/cards/relations/MCP/docs, installed Node+TypeScript package | Phase 4 edit 및 Phase 12 전체 통합 | completed-primary |

## 검증 결과

- Focused: computed/normalization/type/transform tests 20/20.
- Unit cumulative: 2,299/2,299.
- Contract cumulative: 330/330.
- Documentation: 47/47; generated reference/cards/machine/LLM artifacts synchronized.
- Installed package: Node runtime, strict TypeScript, MCP and tutorial consumers 통과. Full/basic/SVG gzip은 300,790/152,434/6,418 bytes로 승인된 305,000/153,000/25,000 ceiling 이하다.
- Package artifact: 489 entries, packed 620,000-byte 및 unpacked 3,100,000-byte ceiling 이내.
- 시각 Gate V: R06/R07은 data transform이라 새 appearance variant가 없다. nominal computed color와 normalized quantitative point를 public Canvas materialization으로 검증했고 renderer 전용 분기는 추가하지 않았다.

후속 의무는 누락이 아니다. R02가 `editComputedData`/`editNormalizedData`와 descendant recompute를 구현할 때 이 Phase의 evaluator/materializer를 재사용하고, Phase 12가 source edit·labels·references·facet 전체 흐름을 다시 실행한다.

## Gate 연결

[GATES.md](GATES.md)를 따른다. 승인 없는 Gate 이후의 dependent implementation을 시작하지 않는다. 이미 승인된 범위는 재승인을 요구하지 않고 기록을 참조한다.
