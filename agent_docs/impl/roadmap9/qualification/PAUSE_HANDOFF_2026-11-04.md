# Roadmap 9 중단·재개 인계 — 2026-11-04

## 현재 결정과 시작점

**사용자 요청으로 작업을 중지했다. 이 문서를 읽었다는 이유만으로 구현·시험·예약 작업을 재개하지 않는다.** 사용자가 새 코딩 에이전트에게 재개를 지시하면 아래 순서로 이어간다. 이번 wrap-up은 새 기능 구현이 아니라 소스·증거·미완료 사항의 보존이다.

순차 완료 번호는 **STEP-056**이다. STEP-057–070의 interaction/animation은 상당 부분 구현·개별 검증했지만 통합·원 성능·수명 자격이 열려 있다. STEP-071–077 및 전체 종료를 완료 처리하지 않는다. 카드 수로 구현률을 산출하지 않는다. 정식 누적 closeout 기록은 Phase0–3/STEP001–016, 개별 차트 구현·집중 검증은056까지이며 두 의미를 구분한다.

- 실제 통합 작업 폴더: `/Users/hyeonjeon/.codex/worktrees/roadmap9-integration/ggactionnewbrand`
- 실제 통합 branch: `codex/roadmap9-animation-timeline-public`
- 중단 전 통합 source/pin HEAD: `abbd84b763ec8aeba3fabb3de5dfba144e9deeda`
- remote: `https://github.com/ggaction/ggaction.git`
- 사용자 기본 checkout `/Users/hyeonjeon/Projects/ggactionnewbrand`의 main `0bbc10ab0`는 clean 상태로 보존했다. **main이나 오래된 `codex/roadmap9-integration`을 최신 통합본으로 혼동하지 않는다.**
- [복사해서 전달할 재개 지시문](handoff-2026-11-04/NEXT_AGENT_PROMPT.md), [브랜치·archive 기계 목록](handoff-2026-11-04/state.json), [파일 해시 검증기](handoff-2026-11-04/verify_bundle.py)가 함께 있다.

## 반드시 먼저 읽을 정본

1. 저장소 root 및 변경 범위의 `AGENTS.md`.
2. `agent_docs/SECOND_ARCHITECTURE.md`, 정확한 API/저장 행위는 `agent_docs/contract/current/` 및 `ACTION_INDEX.json`.
3. [ROADMAP](../ROADMAP.md), [실행 계획](../execution-plan.json), [기존 전체 승인](../AUTHORIZATION.json).
4. 아래 세 branch 인계와 실제 qualification receipt. 예전 [2026-11-01 중단 기록](PAUSE_HANDOFF_2026-11-01.md)은 역사 기록이며 현재 미완료 목록으로 사용하지 않는다.

기존 remainingApproval은077까지 설계/API/저장/아키텍처/시각 결정의 구체화와 병렬 agent·commit/push를 포함한다. 같은 범위의 승인을 반복해서 묻지 말고 정확한 구체안·검증·채택 기록을 남긴다. **검토 자료를 제품 구현으로, 승인 자체를 검증 통과로 바꾸지 않는다.** PR 생성, npm 배포, 정식 문서 deployment는 별도 승인 경계를 유지한다. 이번 중단 요청은 자동 재개 권한이 아니다.

## 보존된 네 작업 줄기

| 작업 | branch / 중단 전 runtime 기준 | 현재 상태·근거 |
| --- | --- | --- |
| 통합 | `codex/roadmap9-animation-timeline-public`, `abbd84b76` | Geo admission, source identity parse 개선까지 통합·push. 아래3개 최신 branch는 아직 합치지 않음. |
| Format6·point | `codex/roadmap9-format6-product`, 제품 `c6d44f50b` + `9cc6e89c3`, source pin `c12f89030` | 인계 HEAD `9a57c0f214`. 전체 일반 coverage10446/10446은 format6 기준, 이후 위치 검증 개선은 owning840 재검사. 후속 숫자열 proof는 **미채택 prototype**. |
| Route B | `codex/route-v2-native`, 제품 `746f7847c` + `3d368ed8f`, 감사 `69605f4e3` | unit의 editLayout/editGraphData/editFlowData/editHierarchyData/editInferredGraphData 연결. 인계 `a48449ebf`는 GitHub 오류로 아직 로컬; 복구 bundle에 포함. |
| Partition | `codex/roadmap9-partition-sampling`, 제품 `b5a88bed2`, pin `6e71785ee` | cell 내부의 최초 검산 재사용. 인계 HEAD `066e1ba4d` pushed. 원1k까지 통과, 원10k/P95는 미실행. |

상세 인계는 각 branch의 다음 파일이다. 원격에 없는 route 인계도 전달 bundle의 docs/에 포함했다.

- Format6: `agent_docs/impl/roadmap9/qualification/FORMAT6_HANDOFF.md`
- Route: `agent_docs/impl/roadmap9/chart/ROUTE_HANDOFF_2026-11-04.md`
- Partition: `agent_docs/impl/roadmap9/qualification/PARTITION_HANDOFF.md`

각 branch는 서로의 최신 상태를 포함하지 않는다. Source별 evidence를 재사용할 수 있어도 합산 candidate 검증을 대신하지 않는다. 전체 branch의 의존 커밋을 보존하며 통합하고, 압축 size 상한은 branch 값으로 덮어쓰지 말고 합산 실측으로 정합한다.

## 지금까지 확인한 결과

### 루트 통합

`7d4f828ea`/`abbd84b76`: keyed source의 같은 문자열 JSON 파싱을 재사용한다. 비문자열 coercion과 오류 순서, canonical ID 검산은 그대로다. A/B88사례와 실제32행 reviseData에서 parse256→128, semantic/graphic/전체 trace/저장 bytes가 같다. 관련105·경계28·package7·source pin9, 동일 archive의 Node20/22/24 원1k load/revise 및6bundle 검증을 통과했다. 이는 원100k 성능 통과가 아니다. [정확한 기록](data-key-token.md).

이전 Geo sampler admission은 full 검산 후 같은 호출 내에서만 geometry closure를 사용한다. Owning135·경계105·문서257, 동일 package3Node/browser 증거를 보존했다. Upstream 원100k native/current/rebase의199999commands 증거와 합산 archive의 새 실행을 구분한다. [기록](geo-admission-merged.md).

### Format6/point branch

명시 format6/scene3의 공통 circle-batch primitive, 렌더러·hit·movement·graph presentation·저장/복원·선언·문서가 구현돼 있다. 도중 전체10442에서 발견된5실패(문서 링크/한도, core-only provenance, interaction import, cycle)를 수리했고 이후10446/10446을 통과했다. 초기 실패는 보존한다.

`9cc6e89c3`는 위치 검산에서 버려지는 보간 계획만 제거했다. 840 tests/pointState100%와 같은 archive3Node·minified Chromium DPR1/2·원1k 전체 결과 및 저장 비교를 통과했다. 원100k **native → 최초 offline → rebase 전좌표**까지 통과했으나 마지막 **rebase offline**는 WeakSet.add/in-place Rehash 정체로 종료했다. 같은 프로세스의 남은 단계를 별도 프로세스로 대체해 통과 처리하지 않는다.

원100k 단일 full sample135.64ms는50ms 목표 초과다. 후속 숫자열 제작 proof의 직전 후보 단일93.92ms도 초과이며 최종 null-prototype 보강 source의100k는 미실행이다. 숫자열 prototype과 compiler keyspace cache 아이디어는 제품 반영 사실이 아니다. 해당 branch 인계가 구체 patch·상속 setter/iterator 반례·후속 수명 조건을 소유한다.

### Route/Partition branch

Route 최신433 tests×Node3종, core4owner100%, docs/types30, 같은 archive의 real Worker/type/6bundle와 minified browser를 통과했다. 전체 union14개 중5개 unit native만 부분 연결했다. 직접 미연결은 reviseData/editDerivedData/editParameter/applyDataUpdate/filterMarks/removeMarkFilter/editCanvas/fitCanvas/navigateProjection이며 scoped/composition/facet와 추가 viewport job도 남는다. 원 acquisition의 work/depth/heap 계량과 비선점100ms도 미완료다.

Partition 제품907건 exact 출력/오류/수학/64회 반복/work 비교,117 owner와32경계, 같은 archive3Node/browser/원1k의 current/rebase/offline/offline-rebase를 통과했다. 원10k와 최종33ms preview/300ms layout은 미완료다. 작은2node100cycle 회수는 canonical memory 자격이 아니다.

## 재개 첫 작업 — 최신 소스 수집과 통합

새 머신에서는 별도 폴더를 사용한다. 기존 작업 폴더가 있으면 clone/reset/checkout 덮어쓰기를 하지 말고 먼저 status를 읽는다.

```sh
git clone --branch codex/roadmap9-animation-timeline-public https://github.com/ggaction/ggaction.git ggaction-roadmap9
cd ggaction-roadmap9
git fetch origin
git status --short
git log -5 --oneline
```

Root 중앙 인계가 원격 push 실패했다면 전달 bundle의 Git snapshot을 복구한다. bundle `RESTORE.md`가 정확한 prerequisite/ref를 소유한다. remote branch가 앞섰으면 `git reset --hard`/force-push 대신 차이를 먼저 확인한다. 다른 agent 도구나 이 대화의 hidden state는 필요 없다.

권장 순서:

1. 각 branch HANDOFF와 state.json의 실제 SHA/remote/dirty 상태를 대조한다. 네 작업 줄기의 Git 관계와 source hash를 확인한다. 사용자 재개 전에는 이 읽기 확인 외 실행하지 않는다.
2. 재개 승인 뒤 clean 통합 branch에서 Partition → Route → Format6를 한 줄기씩 합친다. `git merge --no-commit --no-ff origin/<branch>` 후 충돌과 source 경계를 검토한다. 순서는 의존 관계를 확인한 뒤 바꿀 수 있지만 한 번에 세 줄기를 섞지 않는다. Route의 local handoff는 제품코드가 아니라 문서1개다.
3. `README`, SECOND_ARCHITECTURE, Current 계약, package/6bundle caps, coverage-policy, generated docs/provenance에 양쪽 사실을 보존한다. 생성물 충돌은 정본을 합친 후 해당 generator로 재생성한다. Format6의 분리된 `core/sceneRows.js`와 `grammar/schemas/batchScene.js`를 animation import로 되돌리지 않는다.
4. 각 coherent merge에서 owning·경계·타입·문서·동일 설치 archive를 확인하고 commit/push. 원 branch의 좁은 source pin 검사 실패를 제품 실패로 오인하거나 과거 receipt를 합산 결과로 덮어쓰지 않는다.
5. 그 뒤 아래 병목을 좁은 conceptual change로 해결한다. 숫자열 후보는 구체 evidence를 검토·채택 기록한 뒤 구현하며 global registry 교체/검증 약화로 우회하지 않는다.

## 남은 의무와 완료 판정

- Point100k: 같은 프로세스 rebase-offline Rehash, 원 frame/block50ms, canonical P95와 원100cycle.
- Partition10k: native/current/rebase/offline 전수,33ms preview/300ms layout.
- Geo100k: 최종 합산 archive의 전체 기능·camera/query/Canvas·P95 및 수명. 개별 upstream 기능 통과를 합산 성능으로 확대하지 않는다.
- Data100k: 원 editable load와 source-revise 전체 synchronous call. 이전 warm0/sample1 진단 load약0.78–0.81초/revise약5.35–5.71초이며 현재 source P95가 아니다. async prepare 이름만으로 blocking50ms를 충족하지 않는다.
- Route: 위 native union/실제 ordered jobs/취소/원 density1k·10k,100ms와 solver/P95.
- Inference: 원10k nodes/100k edges 기능 증거와 최종 반복 성능/수명은 구분한다.
- 최종 **동일 commit + 동일 archive**의577 consumer/79 acceptance groups,9명령, AT60 독립검토/AT61 전달 검증. Owner 배정은 실제 candidate pass가 아니다.

정본은 `test/native-capabilities.json`과 `scripts/native-capability-completion.js`다. 전체 완료는 다음 마지막 명령이 실제 증거로 성공해야 한다. 단순 구조 검사 exit0은 완료가 아니다.

```sh
node scripts/native-capability-completion.js test/native-capabilities.json candidate-results.json --require-complete
```

현재 정본의9검사는 `npm test`, `npm run test:realistic`, `npm run test:coverage`, `npm run test:browser`, `npm run test:render`, `npm run test:package`, `npm run test:platform`, `npm run package:check`, `npm run docs:verify`다. 이번 wrap-up에서는 실행하지 않았다. 재개 후 최종 candidate 검증에서 사용한다.

## 실행 환경과 안전한 재현

- 검증 Node는20.20.2/22.23.1/24.22.1이며 package-lock을 보존한다. 새 환경은 `npm ci`, 필요한 Playwright Chromium과 docs용 Ruby/Bundler 환경을 준비하고 `npm run docs:preflight`로 확인한다. 오래된 tmp consumer는 있다고 가정하지 않는다.
- 이 Mac의 실행 경로: Node22 `/opt/homebrew/Cellar/node@22/22.23.1/bin/node`, Node20 `/Users/hyeonjeon/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin/node`, Node24 `/Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node`. 새 머신에서는 실제 경로로 바꾼다.
- 다른 Node major로 pack할 때 `npm_execpath`를 실제 npm CLI로 명시하지 않으면 shell npm의 다른 Node가 실행될 수 있다. pack output은 **절대 경로**를 쓴다. 재생성된 archive의 hash를 실제로 비교하고 같지 않으면 새로운 artifact로 기록한다.
- 16GB 장비에서 대규모 시험/pack/browser/coverage는 하나씩. 코드/문서/읽기 분석은 병렬 가능하다. Canonical P95는 다른 CPU 작업을 멈춘 exclusive 창에서 원5warmup+30측정/DPR1·2로 실행한다. `--diagnostic`은 통과 증거가 아니다.
- 원 데이터/seed/행ID/수학/iteration/work/sample/bytes/runtime guard, timeout,50ms 등의 목표를 줄이거나 늘려 통과시키지 않는다. 원 실패·정체·중단과 재실행을 별도 기록한다.
- `ChartProgram` 불변성, backend-neutral fully materialized graphicSpec, explicit materialization, exact native/WeakMap 권한, renderer의 concrete-only 읽기를 지킨다. caller의 shallow freeze/copied object에 권한을 주지 않는다. SVG는 출력 정확성을 유지하고 실시간 개선의 우선순위는 Canvas다.
- canonical memory는 실제 capture/observer/worker/assets,20node·20edge/2×2PNG,DPR1·2,5warmup+100cycles(50complete/50cancel),원 heap/counter 기준이다. 별도1k 또는100k×100 시험을 임의로 대체하지 않는다.

## 전달물과 완전 중지 상태

중앙 전달 폴더는 통합 WT의 `.artifacts/handoff-2026-11-04/portable/`, 압축 파일은 같은 상위 폴더의 `ggaction-roadmap9-handoff-2026-11-04.tar.gz`다. 네 canonical `.tgz`, 중앙/세 branch 인계, receipt, SHA256 manifest, hash 검사기, 원격에 없는 문서 commit을 복구할 Git bundle을 담는다. 패키지 배포·PR·정식 문서 배포는 하지 않았다. 해당 압축 파일은 로컬 전달물이며 원격 업로드됐다고 가정하지 않는다.

2026-11-04 task 관련 test/benchmark process command scan은0개였고 각 agent도 소유 worker/browser/server/session0을 보고했다. 자동 재개 예약을 만들지 않았다. Tailscale/갤러리와 다른 프로젝트 서비스는 변경하지 않았으며 최신 접속 상태를 새로 검증하지 않았다. 코드·기존 증거를 삭제하지 않고 모든 worktree를 남겼다.

원격 예외: Route의 마지막 인계 문서 commit `a48449ebf`는 GitHub Internal Server Error로2회 push에 실패했다. 제품/시험 commit `69605f4e3`까지는 원격에 있다. 중앙 전달물의 route Git bundle로 인계 문서까지 복구 가능하며 재개 후 `git push origin codex/route-v2-native`로 다시 올린다. 다른 원격 상태는 state.json 및 최종 전달 manifest를 확인한다.

루트 중앙 인계의 첫 push도 GitHub Internal Server Error로 거부됐다. 통합 제품/source pin `abbd84b76`까지는 원격에 있으며, 추가 중앙 인계 commit은 portable Git bundle에 포함한다. 최종 로컬/원격 HEAD는 전달물 MANIFEST.json에서 구분한다. 원격 오류를 성공으로 기록하거나 force-push하지 않는다.
