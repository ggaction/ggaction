# 설치 소비자 프로세스 수명 격리

## 범위와 승인

- 기준 제품/통합 source: `8cbbc020c97c8db653ac09b4c769729083fbc368`.
- Root의 명시 지시(2026-11-02): 원 400개 뒤 큰 hit/Geo case에서 멈춘 장수 프로세스 증거를 보존하고, canonical 설치 소비자 하네스에 명시 격리 metadata를 추가한다. 제품/API/fixture/입력/guard/heap/iterations/SLO는 바꾸지 않는다.
- 별도 branch `codex/roadmap9-consumer-isolation`. A1/A2 작업은 원 worktree/branch에 보존하며 A2 제품 구현은 시작하지 않는다.
- 공개 제품·소유권·renderer·package 경계 변경이 없는 검사 수명 변경이다. 새 public API, callback, plugin registry는 없다.

## 단일 실행 정본

`scripts/consumers/node-cases.mjs`를 실제 설치 디렉터리에 복사한다. 기본 모듈은 기존 한 Node process에서 기존 case 순서로 실행한다. `fixtures/node/manifest.json`에서 `isolation: "case"`를 명시한 `hit-preparation.mjs`, `geographic-capacity.mjs`의 4개 case만 각각 새 process에서 직렬 실행한다.

- child는 같은 설치 cwd/env/Node executable/consumer `execArgv`를 사용하며 fixture의 bare package imports가 같은 설치물로 해석된다. 새 heap/GC flag를 주입하지 않는다. 기존 `testNodeConsumer`의 최초 Node 호출 인자는 그대로다.
- child에서 모듈을 import하므로 부모는 큰 fixture를 먼저 import하거나 입력을 대신 준비하지 않는다. case fixture 문장/실제 크기/수학은 byte 동일하다.
- IPC는 case 하나의 `{id,status,durationMs,error?,pid}` receipt만 운반한다. 부모가 정확한 ID/PID/status/exit 일치와 receipt 1개를 검증한다. exit0만으로 성공이 되지 않는다. 실패·누락·중복·잘못된 receipt 뒤에도 독립 case를 계속한다.
- 부모만 manifest 순서의 `node-cases.json` 하나를 임시 파일→rename으로 갱신한다. 끝에 전체 ID 순서를 검산하고, 외부 canonical 호출자도 exit0 뒤 전체 receipt를 다시 검산한다.
- 현재 deadline 환경값을 격리 case에도 사용한다. timeout/SIGINT/SIGTERM은 process group에 TERM 후 KILL을 적용한다. 정상 종료 때 남은 동일 process-group descendant도 정리한다. 취소 뒤 미실행 case는 cancelled failure로 기록한다.
- existing process-tree 원리(`run-check.js`)를 재사용하되 이 설치물의 작은 standalone runner가 Git/source-evidence 전체 도구를 import하지 않는다. process 관리와 IPC는 이 하나의 현재 소비자 책임 안에 있다.
- Manifest AST 검사는 module/case exhaustiveness, closed isolation metadata 및 현재 `run` 본문 statement 수를 검산한다. 과거 49개 숫자가 이미 불일치하여 metadata 숫자만 갱신했다. case/fixture 분모는 404 그대로다.

## 원 미완료 관측

`consumer-isolation-evidence/original-*`은 원본을 그대로 보존한다. 기존 장수 PID99179는 400 case를 모두 통과한 뒤 원100k hit 준비에서 14분까지 끝나지 않았고 Root가 해당 child만 SIGTERM했다. 두 native OS sample은 WeakSet.add→EphemeronRehash를 보여 준다. 이는 그 실행의 미완료 수명 병목 관측이며 제품 오류 확정, 성공, SLO 결과가 아니다.

원 archive SHA-256: `03d9cd8fb9b72c1c505676b5194a8d14460d183742dd63c215f8b4ec6aa33dde`.

검사 후 process를 새로 만드는 이번 성공은 장수 상태를 고친다는 증명이나 retained100cycle의 대체가 아니다. 최종 통합 성능/P95 및 기존 원형 수명 의무는 별도 유지한다.

## 검증

완료된 개념 검증:

- Node22: canary9 + discovery17 =26/26. Manifest AST·독립 phase 실패 보존2/2.
- Node20/24: canary 각각9/9. PID·execArgv·bare import, throw/exit0 무receipt/중복/오염/receipt와 exit 불일치, manifest/export case 누락·중복, timeout·취소·성공 후 descendant cleanup을 검증했다.
- Node22 `v22.23.1`, 같은 고정 archive의 전체404/404 성공. 처음400은 PID8461 하나, 마지막4는 각 PID9041/9167/9168/9212. 전체 순서·중복0·누락0·모든 child exit0+receipt를 검산했다.
- 원100k hit case64.071초, Geo 원1k/10k/100k case25.490초, 전체 설치+peer+404case229.840초. 모두 단발 기능 관측이며 SLO/P95 결과가 아니다.
- 원 fixture70개 모듈의 byte와404 case ID/순서가 기준 source 및 실제 설치물에서 동일하다. 원 정책/크기/iterations/heap/GC 옵션을 바꾸지 않았다.
- 제품 source/types/package 입력 변경0. 설치 archive SHA-256/SHA-512 및 하네스 input hash를 따로 기록했다. 실행 당시 하네스와 마감 하네스 byte는 동일하다.
- 최종 `cleaned:true`, 설치 디렉터리 제거 및 소유 parent/child PID 모두 종료를 확인했다. 원 미완료 실행과 성공 실행의 receipt는 별도 이름이다.

증거의 `source`는 실행 기반8cbbc020c이고, 새 하네스는 당시 WIP의 `execution-inputs.json` hash로 정확히 식별한다. 최종 commit은 이 같은 하네스 bytes와 검증/기록을 포함한다. 제품 전체 release 검증이나 유지 상태100cycle을 대신하지 않는다.

재현:

```sh
node --test test/contracts/consumer-isolation.test.js test/contracts/test-discovery.test.js
node --test --test-name-pattern='independent installed cases|installed fixture modules' test/contracts/package-artifact.test.js
node agent_docs/impl/roadmap9/qualification/consumer-isolation-evidence/replay.mjs /absolute/path/to/ggaction-03d9cd8fb9b72c1c505676b5194a8d14460d183742dd63c215f8b4ec6aa33dde.tgz /absolute/output/directory
```

`replay.mjs`는 canonical `preparePackageConsumer`/optional peers/`testNodeConsumer`를 호출한다. 별도 설치물의 integrity, 400 shared PID +4 distinct child PID, 순서/누락/중복/exit, 최종 설치 디렉터리 cleanup을 검산한다. 최종 결과는 기능 검증으로만 기록한다.

## Root 통합 재검증

통합 기준 `ea58615f9`에 `31763c915` 하네스를 합쳤다. 기존 원 archive 결과와 별도로
현재 SHA state를 포함한 archive `2ccfbd6c…f2c3dd`를 같은 canonical 설치 경로로 검사한다.
제품 source/types/package 입력은 바꾸지 않는다. Root 검토에서 non-Error throw 값의
`error.stack` 접근과 falsy import 실패 판정을 보완했다. null/undefined/string 및 import-null을
두 실행 모드에서 정확한 failed receipt로 보존하고 뒤 case를 계속하는 회귀를 추가했다.

현재 통합 기록과 재현 도구는 [별도 증거](consumer-isolation-merged-evidence/qualification.json)에
있다. 원70개 fixture module byte/404 ID 및 순서는 그대로 검산한다. 원 미완료 실행과
새 하네스 성공은 구별하며 제품 장수100cycle·원50ms 및 최종9명령 의무는 남는다.
