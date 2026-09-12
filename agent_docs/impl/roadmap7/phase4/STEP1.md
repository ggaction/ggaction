# Phase 4 STEP1 — 실행과 증거 원장

## 진행 상태

- [x] 범위·현재 source owner·선행 Phase 완료 상태 확인
- [x] Gate A 자료: 정확한 API/schema/defaults/오류/수치 oracle 작성·검증
- [x] 명시 승인 범위 기록 후 해당 구현 시작
- [x] data-only 기능이라 새 appearance variant는 만들지 않고 기존 Point/Bin2D와 Canvas·PNG·SVG·PDF package consumer를 검증
- [x] 아래 wave 구현과 focused/cumulative tests 완료
- [x] types/current contracts/catalog/cards/MCP/docs/package 영향 갱신
- [x] Gate X 결과와 남은 후속 통합 cell 기록
- [x] 구현 commit `d29287c9`; 이 원장 commit을 push한 뒤 Phase 5 진행

계획 작성 시 모든 체크는 미완료다. Phase 0 은 제품 구현이 없으므로 해당 구현·시각 항목의 미적용 이유를 기록한다. Phase 12 는 새 시각 목표가 없으면 승인된 variant를 현재 코드에서 다시 실행해 검증한다.

## 작업 단위

1. W1: 기존 Bin2D revision/interval edit ownership 회귀를 먼저 고정한다.
2. W2: logical owner/current, target resolution, requested extractor, downstream DAG preflight.
3. W3: default reject와explicit recompute revision transaction, output role migration.
4. W4: standalone public create16개 family의 focused edit/type/trace를 빠짐없이 연결한다.
5. W5: marks/scales/guides/current selections/facet source replay까지 검증하고 future labels/reference hooks를 명시한다.

## 반드시 읽을 계약

[상세 구현 진입점](../IMPLEMENTATION_SPEC.md), [제안 정정 기록](../CONTRACT_RESOLUTIONS.md), [구현 연결표](../IMPLEMENTATION_MAP.json), [고정 인수 사례](../ACCEPTANCE_CASES.json)를 사용한다. 해당 Phase의 각 feature에서 구현 고정 명세를 적용하고 case ID를 실제 결과 원장에 연결한다.

- [R02 — 파생 데이터 정의 편집과 종속 갱신](../features/02-derived-editing.md)

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
| W1–W4 | `d29287c9` | logical owner/current, requested transform registry, DAG reject/recompute, role rebinding, generic+15 focused editors, shared Bin2D executor | 현재 제품 consumer 검증 | passed |
| W5 lifecycle | `d29287c9` | `test/unit/actions/data/derived-editing.test.js` 10 tests; 기존 Bin2D regression; string/timezone/duration facet replay; labels+selection refresh | R36/R37/R38/R43/R25가 추가할 새 consumer와 후속 재검증 | passed-primary |
| public surface | `d29287c9` | Full/current types/contracts/ACTION_INDEX/cards/relations/docs; installed Node+TypeScript+MCP consumer | Basic에는 advanced editor를 추가하지 않음 | passed |
| cumulative | `d29287c9` | unit 2,344/2,344; contracts 333/333; docs 47/47; package 496 entries, 627,230 packed, 3,148,859 unpacked; full/basic/svg gzip 313,593/153,637/6,418 | Phase 12에서 전체 chart/render/browser/realistic matrix 재실행 | passed-primary |

## Gate 연결

[GATES.md](GATES.md)를 따른다. 승인 없는 Gate 이후의 dependent implementation을 시작하지 않는다. 이미 승인된 범위는 재승인을 요구하지 않고 기록을 참조한다.
