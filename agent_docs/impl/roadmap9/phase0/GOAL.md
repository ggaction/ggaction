# Phase 0 — 검증 기반 구현 완료

상태: **완료**. 사용자 요청 “1단계 구현. 밀어”에 따라 WP-00 / STEP-001–003을 구현했다.
실행·검증한 코드 commit은 `2e36f4ea168426add1444fdcf28f317ab75a72f9`이다. 이후 이 기록을 저장하는 commit은 증거와 문서만 변경한다.

## 구현 결과

- [STEP1](STEP1.md): 지정 커밋의 package/lock/action/export/명령 및 source-map hash와 선언 위치를 기록한다. [기준 snapshot](baseline.json)은 시작 commit `48cbd44c7b2b3fcc81127e419bfa0936afb1063d`의 298 actions, 11 exports, 92 mapped files를 고정한다.
- [STEP2](STEP2.md): literal fixture schema, abs/rel tolerance, deterministic seed/hash와 numeric·geometry·state·time·asset 독립 oracle을 구현했다. 잘못된 결과와 경계 입력을 거부하며 production import가 없음을 검사한다.
- [STEP3](STEP3.md): 실제 test discovery, 실행 전후 clean commit, 명령·종료코드·시간·log hash를 연결한다. 미실행·실패·누락·변조·다른 commit·미완료 의무는 완료로 인정하지 않는다.
- [실행계획](../execution-plan.json)의 STEP-070에 STEP-056 의존성을 추가했다. 77개 작업 모두 최종 STEP-077로 이어진다. 연구 원안은 보존한다.

## 실제 검증

| 검사 | 결과 |
|---|---|
| npm test | 6,298 passed, 0 failed/skipped; 1,036 test files discovered |
| npm run test:browser | 295 passed, 0 failed/skipped; 35 files |
| npm run test:render | 265 passed, 0 failed/skipped; 106 files; 209 chart variants 및 gallery 검증 |
| npm run test:package | 별도 설치의 Node, MCP, types, tutorials, full/basic/SVG browser bundle 통과 |
| npm run package:check | 654 entries, packed 975,075 bytes, unpacked 4,576,677 bytes |
| npm run docs:machine:check | 통과 |
| completion validator | STEP-001–003 complete; 다음 실행 가능 task STEP-004 |

[results.json](results.json)에 집계가 있고 [evidence/](evidence/)에 원본 receipt와 로그가 있다.
로그는 run-check의 2MiB 보존 한도를 따른다. 이번 필수 로그는 모두 truncated=false다.
기준 조사와 focused 검사는 Node 22.23.2, 저장 공간 감시기를 거친 누적 검사는 Node 22.23.1/darwin/arm64였다.
metadata-check는 Node 22.23.2였다. 각각 실제 실행 환경을 receipt에 보존하며 동일 환경으로 오인하지 않는다.
Chromium 기준 관측 버전은 153.0.8010.12다.

## 재현

검증 코드 commit을 checkout하고 npm ci 후 아래 명령을 사용한다. 저장 공간 지침이 적용되는 로컬 환경에서는 상위 AGENTS.md의 storage:run으로 감싼다.

```sh
node scripts/run-check.js test -- npm test
node scripts/run-check.js test-browser -- npm run test:browser
node scripts/run-check.js test-render -- npm run test:render
node scripts/run-check.js test-package -- npm run test:package
node scripts/run-check.js package-check -- npm run package:check
node scripts/run-check.js metadata-check -- npm run docs:machine:check
```

저장한 완료 증거의 무결성과 dependency는 기록 commit에서 다음과 같이 확인한다.

```sh
node scripts/verification-evidence.js agent_docs/impl/roadmap9/execution-plan.json agent_docs/impl/roadmap9/phase0/progress/STEP-001.json agent_docs/impl/roadmap9/phase0/progress/STEP-002.json agent_docs/impl/roadmap9/phase0/progress/STEP-003.json
```

새 실행은 새 시간과 log hash를 갖는다. 기존 immutable evidence를 새 실행 결과로 덮어쓰지 않는다.

## 범위와 인계

공개 API, source/types/knowledge, package/lock, 저장 schema와 renderer 동작의 변경은 없다. 해당 current contracts·generated API docs 변경은 불필요했다. 타입과 docs의 기존 동작은 위 검사로 확인했다.
이번 Phase에 새 승인 Gate는 없다. 후속 G-CORE 등은 [원안 결정표](../../../../study/coverage-expansion-2026-10-27/roadmap/DECISIONS.ko.md)의 미승인 경계를 유지한다.
다음 구현 대상은 STEP-004 identity 기반이다. 다음 task가 dependency상 ready라는 출력이 공개·저장 계약 승인을 뜻하지 않는다.
79개 확장 인수 시험군과 새 mark의 consumer matrix는 아직 미검증이다. 이번 결과는 기반 도구 및 기존 기능 회귀 검증이며 새 차트·모든 renderer의 확장 기능 완료나 release/publish/deploy 승인이 아니다.
