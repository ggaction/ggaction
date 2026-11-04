# Format6 / point 검증 / column 구조 증거 인계

기록일: 2026-11-04. 사용자 요청은 **wrap up 후 완전히 중지**이다. 이 문서의 재개 명령은 다음 명시적 재개 요청 전 실행하지 않는다. 이번 wrap up에서는 source 변경·새 검증·대규모 실행 없이 상태 조회, 기존 artifact 복사/해시 확인, 문서 commit/push만 했다.

## 현재 보존 위치

- WT: `/Users/hyeonjeon/.codex/worktrees/roadmap9-format6-product/ggactionnewbrand`
- branch: `codex/roadmap9-format6-product`
- remote: `https://github.com/ggaction/ggaction.git`
- 인계 전 HEAD: `37de444b42c05fb749dbdd5c6975e70a9d0995b1` (원격 push 완료, clean)
- 실제 제품 source checkpoint: `9cc6e89c36babbe58b3e3683ced81bc862f585b3`; metadata pin `c12f8903091db20bd1ce27e7575669f0d4701778`
- `c80221dca`, `37de444b4`는 읽기 전용 column prototype 검토 기록이다. 이 두 commit은 제품 source를 바꾸지 않았다.
- 이 HANDOFF를 담는 commit은 `git log -1 --format=%H -- agent_docs/impl/roadmap9/qualification/FORMAT6_HANDOFF.md`로 확인한다. 자기 commit hash를 문서 안에 순환 기입하지 않는다.
- 현재 시험/세션/소유 자식 프로세스 **0**. `point-validation`, `column-proof-review`, `format6-sampler-profile`, 해당 WT 경로로 ps를 조회해 잔여 실행이 없음을 확인했다. 이전 PID60117은 SIGTERM/exit143, 이후 profile PID62740/63022/63102는 종료됐다. PID를 재사용해 종료하지 않는다.
- 미커밋 runtime WIP 없음. 미채택 prototype은 tracked gzip 증거로 보존된 **검토 WIP**이며 제품 완료로 세지 않는다.

## Root 통합과 합치는 방법

확인한 root WT는 `/Users/hyeonjeon/.codex/worktrees/roadmap9-integration/ggactionnewbrand`, branch `codex/roadmap9-animation-timeline-public`, HEAD `abbd84b763ec8aeba3fabb3de5dfba144e9deeda`, clean이다. 두 branch의 merge-base는 `edb67604f5252982d457588388faec8876778292`다. Root에는 Geo·graph route·resource·data identity 개선이 있고 이 branch에는 format6 전 소비자 연결이 있다. 서로의 변경을 버리는 ours/theirs 일괄 해결을 하면 안 된다.

이 branch의 큰 제품 checkpoint는 `c6d44f50b2a6fec611429f4d07b31f801f7ff901` + `f82f4f86b`이다. 이후 사전 채택 `b21362a68` → point source `9cc6e89c3` → pin `c12f89030` → 읽기 전용 검토 두 commit 순서다. Root에 이 전체 이력이 아직 합쳐지지 않았으므로 마지막 작은 point commit만 cherry-pick하면 format6 기반이 빠진다. 전체 branch merge가 기본이다.

직접 겹치는 src/types는 `src/grammar/hitIndex.js`, `src/interaction/hitProgram.js`, `types/index.d.ts`, `types/interaction.d.ts`, `types/program.d.ts`다. 추가로 architecture, coverage-policy, package/bundle caps, manifest·문서 생성물이 겹친다. Root의 Geo/route/hit 작업과 이 branch의 scene3 logical-row 처리 및 Any scene/frame 선언을 모두 유지한다. `src/persistence/codec.js`의 `97d9e30ee` decoder 기반도 보존한다. 합산 package footprint는 다시 측정해야 하며 각 branch cap의 max만 택해 통과를 가정하면 안 된다.

재개 후 root에서 실행할 **통합 준비** 예시(지금 실행하지 않음):

```sh
git fetch origin
git status --short
git diff --stat abbd84b763ec8aeba3fabb3de5dfba144e9deeda...origin/codex/roadmap9-format6-product
git merge --no-ff --no-commit origin/codex/roadmap9-format6-product
```

Conflict가 나면 위 owner별 기능을 함께 유지하고 generated 문서는 canonical generator로 재생성한다. Root의 다른 미통합 agent branches(Partition/route 후속)는 중앙 HANDOFF를 따른다. 이 문서 작성 중에는 merge하지 않았다.

## 승인 범위와 제품 상태

`AUTHORIZATION.json.remainingApproval`의 STEP077까지 기존 포괄 승인과 root의 구체 채택 기록을 재사용한다. 같은 결정을 다시 사용자에게 묻지 않는다. 단 PR 생성·publish·deploy는 별도 승인 영역이며 수행하지 않았다. 사용자 중지 요청이 현재 우선한다.

구현된 format6는 opt-in plan6/scene3/circle-batch, 기본 v3–v5, 완성된 backend-neutral graphicSpec, 4renderer, native hit, public session, offline/rebase/timeline, 공통 저작/저장을 연결한다. Ordinary legacy bytes를 유지한다. 의도적 예외로 원래 v3–v5에도 있던 graph unbundle 저장 복원 bug를 exact `edited-graph-geometry` reason에서 수리했다. 이를 legacy 전체 behavior 무변경이라고 숨기면 안 된다.

Point 개선은 `validatePointAnimationPosition`이 버리던 `preparePositionInterpolation(p,p)` 결과 생성을 없애고 원 `normalizePositionEndpoint` 두 번 및 node mapping 검산을 유지한 것이다. 입력/오류 순서·guard·native 권한·global owned registry는 바꾸지 않았다. 채택 commit 제목의 allocation-free는 버려지는 계획만 뜻하며 정규화/매핑 임시 할당은 남는다.

## 실제 완료한 검증

- Format6 baseline c6: full normal coverage **10446/10446**, global97.38/95.63/99.35, 776 critical floors 통과. same archive Node20/22/24 각각 runtime408 + strict TS/MCP/executable docs/6bundles, 실제 minified Chromium DPR1/2 통과.
- Point 9cc: owning animation **840/840**, pointState100/100/100. 135개 결과·오류 exact/getter0, 1000행 등록40000→22000. 1k의 6scale/fallback/timeline/mixed9변형 whole frame/positions/native/offline/rebase/wire exact. 같은 archive3Node 관련 animation runtime/1k public fixture/TS/MCP/docs/6bundles 및 browser 통과. **이번 관련 runtime 재검사는408 전체가 아니다.**
- Point source pin35개 통과 및 strict pack SHA 동일. 1k sample100회/rebase10회/GC5회에서 이전 객체 회수. 원100k heap qualification과 구분한다.
- 최신 exact archive: `186c01ea470a97e8c10a2f97e66061ef0d4a5583ae561ab1bfacd2b00a159c84`,1829700bytes. Packed 실측 Node20/24 max1833576, unpacked8237162,1267entries. byte 차이는 pack runtime별 차이이며 소비자들은 동일186c archive를 사용했다.

정본: [format6 checkpoint](format6-product-checkpoint.md), [point checkpoint](point-validation-checkpoint.md), [point 기계 receipt](point-validation-evidence/qualification.json).

## 해결되지 않은 실패와 병목

원100k PID60117은 **같은 프로세스** native100000좌표→첫 offline wholeframe/wire/권한0→rebase100000좌표까지 통과했다. 마지막 rebase offline가 WeakSet.add의 in-place Rehash에서 지속 정체되어 두 OS sample을 보존하고 진단 종료(exit143)했다. 최초 offline182.3s는 실제 통과이나 전체100k 완료가 아니다. phase를 별도 프로세스로 나눠 통과 처리하지 않는다. 원 입력 hash `b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f`, 원 limits/maxItems/50-frame export work 거부를 유지한다.

원 50ms full-frame/P95/100cycle은 미완료다. 최신 product pure sample 단일132.58ms, profiled second110.45ms였다. Timer 안의 모든 좌표·appearance·placement·meaning·native identity·graphicSpec 완성 의무를 유지한다. Oracle는 timer 뒤다. P95 단정이나 workload/guard 감소 금지. Global ownership registry rotation/branding/shallow trust로 해결하지 않는다. V8 exact overload를 확인했어도 deleted/live/capacity를 측정하지 않아 엔진 버그로 단정하지 않는다.

과거 native construction의 intermittent Rehash, 최초 physical envelope guard 실패, stdin fresh-child transport 정체도 원 기록에 남아 있다. Stdin transport는 동일 UTF8 입력/child/timeout/assertion을 file fd0으로 넘겨 수리했고 제품 runtime 문제와 구분한다. 단일 성공으로 intermittent 문제 해결을 주장하지 않는다.

## 미반영 column 후보와 다음 작업

[구체 column 검토](circle-column-proof-review.md)는 **미채택/제품 미반영**이다. Schema owner가 길이1..10000을 먼저 확인하고 `Array.from({__proto__:null,length},callback)`로 직접 만드는 숫자 배열만 구조 proof를 갖는다. 기존 finite/negative/length/appearance 검산은 그대로다. Caller/copied/frozen/forged 배열은 원 full boundary다. `isOwned`만으로 통과시키지 않는다.

초안 assignment는 inherited numeric setter 반례로 기각했다. Array.from 일반 `{length}`도 inherited iterator 반례가 있어 최종 null-prototype로 고쳤다. 최종 작은 검사:1k9변형 exact,30focused,10정상/오류 결과·getter0,creator와frame lifetime. 원100k94/75ms 진단은 **null-prototype 보강 직전** source이며 `profile-effective-source.json`으로 분리했다. 최종 보강 source의 원100k는 미실행이다. 원50ms도 달성하지 못했다. Loader source를 제품 파일에 무조건 복사하지 말고 root가 concrete 검토를 읽고 채택 기록 후 구현한다.

후속 compiler keyspace cache는 아직 구체 구현도 없다. 전체 tuple exact 확인 전 prefix 검산을 생략하면 중복을 놓치고, 사전 조회가 getter를 실행하면 오류순서가 바뀔 수 있다. Entries/records/key reference 모두 immutable own-data인지 descriptor로 확인하고 miss는 처음부터 원 경로여야 한다. Cache는 anchor별 한 slot이어서 companion keys retention bound를 별도 입증해야 한다. 이 후보가 native/frame 권한을 만들면 안 된다.

재개 순서: root에 제품 branch 통합 → 합산 owning/경계/선언/docs/package 검증 → column 후보 채택 여부를 기록 → 채택 시 durable 반례·critical coverage·새 same archive3Node/browser 및 원100k 검증 → 남은 restore 정확 caller 계측과 최종 exclusive P95/100cycle. 새 source가 섞인 뒤 이전 archive 성공을 합산 검증으로 인용하지 않는다.

## Portable 증거와 재개 명령

필수 증거는 tracked `format6-product-evidence`, `point-validation-evidence`, `circle-column-proof-evidence`의 gzip과 JSON이다. Local `.artifacts`는 ignored이며 유일한 증거 사본으로 삼지 않는다. 두 frozen archive도 이번 wrap up에 [format6-handoff-artifacts](format6-handoff-artifacts/archives.json)로 tracked 복사했다. 이전349dbf와 최신186c 모두 해시 검증했고 재다운로드나 repack은 하지 않았다. 새 agent는 local WT가 없어도 Git과 이 파일만으로 원 증거/fixture를 복원할 수 있다.

명시 재개 후 저장소 root에서:

```sh
npm ci
python3 agent_docs/impl/roadmap9/qualification/format6-handoff-artifacts/restore.py
```

복원 helper는 gzip을 `.artifacts`에 풀고 `frozen.json`의 archive 경로만 현재 checkout 절대 경로로 만든다. 테스트를 실행하지 않는다. 원 기록 안 과거 local path는 역사적 receipt이며 수정하지 않는다. `validation-only/` 원 prototype plain files는 tracked evidence 폴더에 이미 있다. 설치 Node20.20.2/22.23.1/24.22.1과 Playwright Chromium을 준비하고 버전을 확인한다. 기존 Mac의 npx 경로 자체는 다른 호스트에서 재사용하지 않는다.

재검사 명령 예시(제품/source checkpoint에서; CPU slot 조율 후 순차):

```sh
node --test --test-concurrency=4 --experimental-test-coverage --test-coverage-include='src/grammar/animation/pointState.js' test/unit/animation/*.test.js
node .artifacts/point-validation/canonical-consumer.mjs
node .artifacts/point-validation/browser-installed.mjs
node scripts/run-tests.js coverage
```

`canonical-consumer.mjs`는 실행 중인 Node major별 결과를 쓴다. Node20/22/24 binary로 같은 명령을 각각 실행하며186c를 재사용한다. Full normal runner는 성공 시 stdout에 요약만 남기므로 `.artifacts/coverage/report.log`도 보존해야 한다. 기존 logs를 덮기 전 별도 복사한다.

원100k 또는 profile은 다른 heavy 작업 없이 한 번에 한 프로세스만:

```sh
node --expose-gc --max-old-space-size=8192 .artifacts/point-validation/product-100000-phased.mjs
node --expose-gc --max-old-space-size=8192 .artifacts/format6-sampler-profile/run.mjs
```

두 명령은 **순차**이며 원100k는 수분 이상 걸리거나 정체될 수 있다. 정체시 정확 PID의 OS sample을 두 번 보존하고 해당 소유 프로세스만 안전 종료한다. 실패를 timeout 확장/phase 분할로 감추지 않는다. 현 시점에는 이 명령들을 실행하지 않고 완전히 중지한다.
