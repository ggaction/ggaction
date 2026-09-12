# Phase 3 STEP1 — 실행과 증거 원장

## 진행 상태

- [x] 범위·현재 source owner·선행 Phase 완료 상태 확인
- [x] Gate A 자료: 정확한 API/schema/defaults/오류/수치 oracle 작성·검증
- [x] 명시 승인 범위 기록 후 해당 구현 시작
- [x] weighted histogram의 graphic/Canvas와 density·violin public consumer 경로로 Gate V 확인
- [x] 아래 wave 구현과 focused/cumulative tests 완료
- [x] types/current contracts/catalog/cards/MCP/docs/package 영향 갱신
- [x] Gate X 결과와 남은 Phase 4 edit 통합 cell 기록
- [x] 검증된 coherent change를 commit/push하고 Phase 4로 전환

계획 작성 시 모든 체크는 미완료다. Phase 0 은 제품 구현이 없으므로 해당 구현·시각 항목의 미적용 이유를 기록한다. Phase 12 는 새 시각 목표가 없으면 승인된 variant를 현재 코드에서 다시 실행해 검증한다.

## 작업 단위

1. W1: frequency/reliability accumulators와quantile/variance/nEff 오라클.
2. W2: summary/bin/KDE requested weight와explicit/auto bandwidth 처리.
3. W3: histogram/density/violin facade pass-through와group/facet별 기여도.
4. W4: unweighted compatibility와installed browser/Node 통계 검증.

## 반드시 읽을 계약

[상세 구현 진입점](../IMPLEMENTATION_SPEC.md), [제안 정정 기록](../CONTRACT_RESOLUTIONS.md), [구현 연결표](../IMPLEMENTATION_MAP.json), [고정 인수 사례](../ACCEPTANCE_CASES.json)를 사용한다. 해당 Phase의 각 feature에서 구현 고정 명세를 적용하고 case ID를 실제 결과 원장에 연결한다.

- [R10 — 가중 통계·histogram·KDE](../features/10-weighted-statistics.md)

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
| W1 | `da0ca4e2` | frequency/reliability accumulator, virtual-frequency/inverse-CDF quantile, variance·stderr·nEff literal oracle | Phase 4 edit transaction | completed-primary |
| W2 | `da0ca4e2`, `276c8318` | summary/bin/KDE weight validation, mass, unit/count scaling, explicit/auto per-profile bandwidth | `editSummaryData`/`editBinData`/`editDensityData`는 R02/Phase 4 | completed-primary |
| W3 | `da0ca4e2`, `32ddfcdd` | histogram/density/violin pass-through, positive-weight membership/domain, label/selection and grouped/facet replay | generic `editDerivedData`는 R02/Phase 4 | completed-primary |
| W4 | `da0ca4e2`, `276c8318`, `32ddfcdd` | legacy omission compatibility, Full types/current docs, installed Node/browser weighted consumers | Phase 12 전체 통합 | completed-primary |

## 검증 결과

- Focused weighted suites: 109/109; density scaling 13/13; histogram label/selection consumers 25/25.
- Unit cumulative: 2,334/2,334.
- Contract cumulative: 331/331.
- Documentation: 47/47; generated reference/cards/machine/LLM artifacts synchronized.
- Installed package: weighted Node summary와 strict TypeScript consumer, browser weighted histogram 1/1 통과. Full/basic/SVG gzip은 309,521/153,436/6,418 bytes로 310,000/155,000/25,000 ceiling 이하다.
- Package artifact: 494 entries, packed 617,369 bytes, unpacked 3,086,982 bytes로 승인된 한도 이내.
- 시각 Gate V: weighted histogram은 실제 browser Canvas consumer에서 x/y domain, bar 수와 높이를 검증했다. Density/violin은 기존 graphic-only renderer 경로와 public materialization 회귀를 통과했다.

후속 의무는 누락이 아니다. R02가 `editSummaryData`, `editBinData`, `editDensityData`와 generic `editDerivedData`를 Phase 4에서 같은 weighted materializer에 연결하며, Phase 12가 source edit·facet·labels·selection 전체 흐름을 다시 실행한다.

## Gate 연결

[GATES.md](GATES.md)를 따른다. 승인 없는 Gate 이후의 dependent implementation을 시작하지 않는다. 이미 승인된 범위는 재승인을 요구하지 않고 기록을 참조한다.
