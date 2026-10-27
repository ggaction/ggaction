# Phase 1 — 안정적인 ID와 공통 리소스 기반

상태: **진행 중**. 사용자 “진행해”는 이전 응답의 G-CORE 검토 자료 준비와 독립 작업을 승인한다.
아직 보지 않은 옵션·저장 schema의 상세 승인으로 기록하지 않는다.

## 범위와 Gate

STEP-004–009를 순서대로 구현한다. 현재 STEP-004의 독립 reference 계산, 기존 저장 형식 호환성 fixture,
API/소유권/복원 검토 패키지를 준비했다. **제품 row identity 및 schema 4 구현 완료가 아니다.**

- [STEP1](STEP1.md): STEP-004 준비 상태, 정확한 후속 범위
- [G-CORE 설계](DESIGN.md): 승인 대상 옵션·상태·오류·호환성·분기 규칙
- [G-CORE 기록](G-CORE.json): 승인 상태와 code/evidence revision
- [consumer matrix](consumers.json): 모든 적용 경로와 아직 남은 연결

요구 근거는 [root AGENTS](../../../../AGENTS.md)의
“Before implementing an unresolved material decision about public APIs, persisted schemas, or core architecture, present the concrete proposal and obtain explicit user approval.”이다.
[impl AGENTS](../../AGENTS.md)에 따라 검토 source와 evidence를 commit/push한 뒤 승인 요청한다.
독립 작업은 계속하고, 미승인 결정에 의존하는 제품 state/API 수정만 대기한다.

## 단계와 실행 조건

| 작업 | 현재 상태 | 완료에 필요한 것 |
|---|---|---|
| STEP-004 | in-progress | G-CORE 승인, product key owner, create/revise·소비자·타입·문서 |
| STEP-005 | planned | 모든 transform의 final-grain lineage |
| STEP-006 | planned | scene/selection/inspection identity와 revision 연결 |
| STEP-007 | planned | resource schema, typed selectors, reference DAG |
| STEP-008 | planned | lifecycle preflight와 selective rematerialization |
| STEP-009 | planned | 1/2/3→4 migration, fresh-process 신규 resource edit/remove |

## 이번 검토 checkpoint의 필수 검사

1. `node scripts/run-tests.js unit unit/oracles/identity.test.js unit/persistence/legacy-selection.test.js`
2. `node scripts/run-tests.js contracts contracts/oracle-independence.test.js contracts/test-discovery.test.js contracts/agent-docs-navigation.test.js`
3. 누적 `npm test`
4. `npm run docs:machine:check`

실행 receipt/log와 hash는 evidence 기록에 고정한다. 제품 source/types/exports/generated 문서가 바뀌지 않아
이번 checkpoint는 renderer/browser/package 전체 재실행을 요구하지 않는다. Phase 완료 때는 모두 요구한다.
새 테스트는 capability-oriented stable suite에 들어가고 roadmap을 import하지 않는다.
Date/tuple/counter의 독립 oracle은 제품 구현과 분리되어 있으며 새 기능 동작의 성공 증거로 세지 않는다.

fixture 재현은 검토 code revision을 checkout한 뒤 `node agent_docs/impl/roadmap9/phase1/fixture-source.mjs <새 디렉터리>`로 한다.
기존 fixture는 덮어쓰지 않는다. v1/v2는 과거 형식 호환성 입력이며 과거 배포 artifact가 아니다.
큰 누적 실행은 상위 프로젝트 storage:run 정책을 따른다.
