# Phase 6 STEP1 — 실행과 증거 원장

## 진행 상태

- [x] 범위·현재 source owner·선행 Phase 완료 상태 확인
- [x] Gate A 자료: 정확한 API/schema/defaults/오류/수치 oracle 작성·검증
- [x] 명시 승인 범위 기록 후 해당 구현 시작
- [ ] appearance 대상은 primitive render와 target public chain으로 Gate V 확인
- [ ] 아래 wave 구현과 focused/cumulative tests 완료
- [ ] types/current contracts/catalog/cards/MCP/docs/package 영향 갱신
- [ ] Gate X 결과와 남은 후속 통합 cell 기록
- [x] R27 구현 commit `ded3b073` push; R29와 Phase 6 closeout은 계속 진행

계획 작성 시 모든 체크는 미완료다. Phase 0 은 제품 구현이 없으므로 해당 구현·시각 항목의 미적용 이유를 기록한다. Phase 12 는 새 시각 목표가 없으면 승인된 variant를 현재 코드에서 다시 실행해 검증한다.

## 작업 단위

1. W1: allocated/effective bounds를 구별하는 aspect pure function.
2. W2: domain → aspect → range dependency와Cartesian data-unit ratio.
3. W3: polar center/radius resolver를 모든 mark/guide 호출에 전달.
4. W4: Canvas/domain/layout 변경 후 radius/aspect 유지와atomic overflow error.

## 반드시 읽을 계약

[상세 구현 진입점](../IMPLEMENTATION_SPEC.md), [제안 정정 기록](../CONTRACT_RESOLUTIONS.md), [구현 연결표](../IMPLEMENTATION_MAP.json), [고정 인수 사례](../ACCEPTANCE_CASES.json)를 사용한다. 해당 Phase의 각 feature에서 구현 고정 명세를 적용하고 case ID를 실제 결과 원장에 연결한다.

- [R27 — 좌표 frame 종횡비와 데이터 단위비](../features/27-coordinate-aspect.md)
- [R29 — Polar 중심과 frame 반지름·배치](../features/29-polar-frame.md)

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
| W1 — R27 aspect pure bounds | `ded3b073` | frame/data literal bounds, align, reverse span, Polar/Parallel frame 적용 | R29 Polar frame과 결합 renderer matrix | complete-primary |
| W2 — R27 domain→aspect→range | `ded3b073` | 10 focused runtime/type cases; Canvas/domain edit replay; axes/grids/shared pair; invalid/ambiguous/explicit-range atomicity | R29 radius range 통합 | complete-primary |
| R27 public/package | `ded3b073` | unit 2,362/2,362; contracts 392/392; docs 47/47; 269 cards; package 505 entries, 652,810 packed, 3,284,572 unpacked; tar SHA-256 `bacc29844ff00a7eef0b4b025b7e6984a2101538a3d1b2050f2b7acb1f038364`; full/basic/svg gzip 328,029/161,789/6,418 | R29 확장 뒤 재생성·재측정 | passed-primary |
| W3/W4 — R29 + Phase 6 closeout | — | 실행 증거 없음 | polar center/radius, overflow lifecycle, combined renderer matrix | active |

## Gate 연결

[GATES.md](GATES.md)를 따른다. 승인 없는 Gate 이후의 dependent implementation을 시작하지 않는다. 이미 승인된 범위는 재승인을 요구하지 않고 기록을 참조한다.
