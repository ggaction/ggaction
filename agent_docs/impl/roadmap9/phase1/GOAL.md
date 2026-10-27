# Phase 1 — 안정적인 ID와 공통 리소스 기반

상태: **진행 중**. 사용자 “승인한다” (2026-10-27)는 원격 검토 revision `96971d21`의
D1–D8과 STEP-004–009 제품 구현을 명시 승인한다. 정확한 승인 증거는 [G-CORE](G-CORE.json)에 기록한다.

## 범위와 Gate

STEP-004–009의 승인된 D1–D8을 구현했다. create/revise, 26개 transform, concrete item identity,
persistent-selection 리소스와 schema 4를 연결했으며 현재 전체 소비자 검증 중이다.
완료 기록은 clean implementation revision의 필수 검사가 모두 통과한 뒤 고정한다.

- [STEP1](STEP1.md): STEP-004 준비 상태, 정확한 후속 범위
- [G-CORE 설계](DESIGN.md): 승인 대상 옵션·상태·오류·호환성·분기 규칙
- [G-CORE 기록](G-CORE.json): 승인 상태와 code/evidence revision
- [consumer matrix](consumers.json): 모든 적용 경로와 아직 남은 연결
- [STEP-004 진행 기록](progress/STEP-004.json): 제품 작업은 in-progress, 구현·검증 의무 미종료

요구 근거는 [root AGENTS](../../../../AGENTS.md)의
“Before implementing an unresolved material decision about public APIs, persisted schemas, or core architecture, present the concrete proposal and obtain explicit user approval.”이다.
[impl AGENTS](../../AGENTS.md)에 따라 검토 source와 evidence를 commit/push한 뒤 승인을 받았다.
승인된 state/API 구현과 적용 소비자 검증을 계속한다.

## 단계와 실행 조건

| 작업 | 현재 상태 | 완료에 필요한 것 |
|---|---|---|
| STEP-004 | verification | product key owner, create/revise·소비자·타입·문서 |
| STEP-005 | verification | 모든 transform의 final-grain lineage |
| STEP-006 | verification | scene/selection/inspection identity와 revision 연결 |
| STEP-007 | verification | resource schema, typed selectors, reference DAG |
| STEP-008 | verification | lifecycle preflight와 selective rematerialization |
| STEP-009 | verification | 1/2/3→4 migration, fresh-process 신규 resource edit/remove |

## 승인 전 검토 checkpoint의 검사 (보존 기록)

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

## 검토 준비 검증 완료

검토 code revision: `129a506dfd2fc2455b7de949d73fdd6cf34e27a5`.
실행 전후 모두 이 commit의 clean checkout이다. 이번 기록 commit은 제품·test source를 바꾸지 않는다.

| 검사 | 결과 |
|---|---|
| 독립 identity / historical persistence | 13 passed, 2 files |
| 독립성 / discovery / documentation navigation | 23 passed, 3 files |
| npm test | 6,311 passed, 0 failed/skipped/cancelled/todo, 1,038 files, 약 250초 |
| docs:machine:check | exit 0 |

[실행 집계](evidence/summary.json), [완료 증거](preparation.json), [검증 결과](preparation-validation.json)를 보존한다.
Focused와 문서 검사는 Node 22.23.2, 전체 일반 검사는 storage wrapper의 Node 22.23.1/darwin/arm64에서 실행했다.
원본 로그는 각 2MiB 이내이고 모두 truncated=false다. 저장 공간 감시기는 near-limit 경고 후 exit 0으로 완료했다.
위 검증은 승인 전 검토 준비의 증거이며 제품 구현 완료 증거가 아니다.
G-CORE는 이후 명시 승인되었고, 아래 증거는 CORE-REVIEW-PREPARATION만을 입증한다. 제품 통합 증거는 별도로 기록한다.

저장한 증거는 다음 명령으로 다시 검증한다. 이 명령은 test를 다시 실행하거나 Gate를 승인하지 않는다.

```sh
node scripts/verification-evidence.js agent_docs/impl/roadmap9/phase1/review-plan.json agent_docs/impl/roadmap9/phase1/preparation.json
```

## 제품 통합의 필수 검사

[실행계획](../execution-plan.json)의 STEP-004–009는 동일한 통합 checkpoint에서 검증한다.
일반 전체 suite, source coverage, 실데이터 suite, browser, render와 gallery, installed package,
package artifact, generated metadata, 문서 build와 built-site browser 검사를 모두 요구한다.
`coverage` runner는 일반 전체 suite와 같은 파일 집합을 실행하므로 최종 revision에서는
그 실행으로 전체 회귀와 coverage를 함께 입증한다. 실데이터·browser·render는 각각 별도 실행한다.
새로운 시각 표현은 추가하지 않으며 기존 geometry·draw order·decoded pixels를 유지한다.
각 chart를 독립 작성할 때 새로 할당되는 private identity만 비교에서 정규화하고,
행·항목 identity 자체는 별도 lifecycle 및 변조 거부 시험에서 정규화 없이 검사한다.

실데이터 입력은 manifest의 SHA-256와 일치하는 50개 CSV를 사용한다. 재현 시 `npm run datasets:sync`로
로컬 캐시를 준비하거나 `GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT`에 검증된 기존 캐시를 지정한다.
로컬 문서 검증은 Ruby 3.2.11을 사용하며 CI pin 3.2.6과 구별해 기록한다.
