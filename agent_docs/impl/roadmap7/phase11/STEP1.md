# Phase 11 STEP1 — 실행과 증거 원장

## 진행 상태

- [x] 범위·현재 source owner·선행 Phase 완료 상태 확인
- [x] Gate A 자료: 정확한 API/schema/defaults/오류/수치 oracle 작성·검증
- [x] 명시 승인 범위 기록 후 해당 구현 시작
- [x] appearance 대상은 primitive render와 target public chain으로 Gate V 확인
- [x] 아래 wave 구현과 focused/cumulative tests 완료
- [x] types/current contracts/catalog/cards/MCP/docs/package 영향 갱신
- [x] Gate X 결과와 남은 후속 통합 cell 기록
- [x] 검증된 coherent change마다 commit/push하고 다음 Gate 범위 확인

계획 작성 시 모든 체크는 미완료다. Phase 0 은 제품 구현이 없으므로 해당 구현·시각 항목의 미적용 이유를 기록한다. Phase 12 는 새 시각 목표가 없으면 승인된 variant를 현재 코드에서 다시 실행해 검증한다.

## 작업 단위

1. W1: 모든 새 config/semantic/template의live ref path inventory.
2. W2: data/scale/coordinate ref collector와context-only/trace-only 구별.
3. W3: removeData/removeScale/removeCoordinate reject-only mutations.
4. W4: R02 revision release와owner removal 공유 helper regression.
5. W5: 숨은 consumer path별 단일-reference fixture와pixel-invariant unused deletion.

## 반드시 읽을 계약

[상세 구현 진입점](../IMPLEMENTATION_SPEC.md), [Phase 10–12 무추론 명세](../LOW_INFERENCE_IMPLEMENTATION_SPEC.md#6-phase-11--r25-safe-named-resource-removal), [제안 정정 기록](../CONTRACT_RESOLUTIONS.md), [구현 연결표](../IMPLEMENTATION_MAP.json), [고정 인수 사례](../ACCEPTANCE_CASES.json)를 사용한다. 해당 Phase의 각 feature에서 구현 고정 명세를 적용하고 case ID를 실제 결과 원장에 연결한다.

- [R25 — 미사용 dataset·scale·coordinate 안전 삭제](../features/25-remove-resources.md)

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
| W1–W2 typed reference graph | `c29f496c` | semantic/config/composition/context의 owner-relative data·scale·coordinate·mark·selection edges; sort/dedup/freeze; trace·field·style false-positive 제외; 119개 smoke program 구조 대조 | 없음 | passed-primary |
| W3 safe public removal | `c29f496c` | Full-only 세 action, unit/facet commit, concat reject, wrong-kind/internal-owner 오류, context/cache/standalone-owner cleanup, strict types | 없음 | passed-primary |
| W4 owner lifecycle | `c29f496c` | R02 `releaseDerivedData` registry 연결, regression·box revision stale source 수정, mark external-ref preflight, Parallel axis teardown, named-label selection registry 연결 | 없음 | passed-primary |
| W5 invariance·public surfaces | `c29f496c` | R25-N01/N02/N03/E01/E02/L01, xOffset·legend·Polar guide·annotation one-edge fixtures, deterministic errors, Canvas-call과 decoded PNG hash parity, Current/catalog/cards/MCP/docs/installed package | Phase 12 누적 25개 통합 | passed-primary |
| Phase 11 누적 검증 | `c29f496c` + 상태 checkpoint | unit 2,476/2,476; contracts 485/485; charts 578/578; render 216/216; docs 47/47; package 521 entries, 704,263 packed, 3,542,730 unpacked; tar SHA-256 `66b594bf65a96ebfd0f8f90aaac2b7e91185a61110daa6fb4973a797248b3887`; Full/Basic/SVG gzip 358,177/173,733/6,742; installed Node/strict TypeScript/MCP/browser 통과 | Phase 12 browser·realistic·4개 누적 flow와 final main 반영 | passed-primary |

## Gate 연결

[GATES.md](GATES.md)를 따른다. 승인 없는 Gate 이후의 dependent implementation을 시작하지 않는다. 이미 승인된 범위는 재승인을 요구하지 않고 기록을 참조한다.
