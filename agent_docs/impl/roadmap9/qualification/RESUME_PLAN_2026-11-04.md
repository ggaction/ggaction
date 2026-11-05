# Roadmap 9 재개 실행 계획 — 2026-11-04

## 진행 상태

- [x] 사용자 재개 지시 확인: "나한테 허락맡지말고 너가 알아서 쭉 밀어"(2026-11-04). 기존 [remainingApproval](../AUTHORIZATION.json)을 재사용한다. PR 생성·npm publish·정식 docs deployment는 root `AGENTS.md`의 별도 승인 경계로 남긴다.
- [x] 인계 묶음 해시 27개 검산, 네 줄기 local/remote SHA를 [state.json](handoff-2026-11-04/state.json)과 대조.
- [x] 미푸시 인계 commit 정상 push: integration `4861b9ff2`, route `a48449ebf`(재시도 후 성공). force-push 없음.
- [x] Partition 병합 `220ebde1e`: owning117·경계33·전체10464 통과. [증거](partition-merged-evidence/qualification.json)
- [x] Route 병합 `e2e4f6cc3`: owning434×3Node·경계/문서60·전체10481 통과. Route 단독에도 있던 6건 결함을 수리했다. [증거](route-merged-evidence/qualification.json)
- [x] Format6 병합 `5e84150e6`: animation owning847·경계/문서141·전체10523 통과. [증거](format6-merged-evidence/qualification.json)
- [x] 합산 candidate 같은 archive 3Node·browser·render. Node20 pipe stdin 정체 harness 수리, mark-outline render 의존성 수리, **d3-array 3.2.5 외부 배포로 깨진 installed browser를 감사 closure 고정으로 수리**. [후보](combined-candidate-evidence/qualification.json), [고정](geometry-closure-pin-evidence/qualification.json)
- [x] Circle column 구조 증거 채택·구현. 원100k 단일 sample 132→93–96ms, 50ms 미달. [기록](CIRCLE_COLUMN_ADOPTION.md)
- [x] Point 100k rebase-offline Rehash: 소유 표식을 private class field로 옮겨 원 phased 실행 완료. [진단](POINT_REHASH_DIAGNOSIS.md), [결정](OWNED_MARK_DECISION.md)
- [x] Point 전 크기 hit·full frame 통과(100k는 format6). [기록](POINT_FRAME_50MS.md)
- [x] Partition layout 전 크기, preview 100·1k 통과(1k 6ms). 10k 66/70ms 미달. [기록](PARTITION_PREVIEW_PERFORMANCE.md)
- [x] Geo hit 전 크기, camera 1k·10k 통과(10k 21.3/20.8ms). 100k 228/232ms 미달. [기록](GEO_CAMERA_PREVIEW.md)
- [x] Canonical memory 100 cycle DPR1·2 통과(비exclusive 창). [기록](CANONICAL_MEMORY.md)
- [x] Route B union `reviseData`·`editDerivedData`·`editParameter`·`editCanvas`·`fitCanvas`: 순서 있는 원 job/completion replay로 연결(미연결 직접 4개). [기록](../chart/route-native-revise-data.md)
- [ ] 미달: partition 10k preview, Geo 100k camera, data load/revise blocking 50ms(10k·100k), Route B union, exclusive 창 P95, 최종 qualification.

순차 완료 번호는 여전히 **STEP-056**이다. 이 문서는 실행 순서를 정할 뿐 어떤 STEP의 완료도 기록하지 않는다.

## 1. 세 줄기 통합

순서는 Partition → Route → Format6이다. 충돌 범위가 작은 것부터 합쳐 각 merge가 독립적으로 검증 가능한 conceptual checkpoint가 되게 한다. `git merge-tree` 사전 분석 결과는 다음과 같다.

| 줄기 | 충돌 | 해결 원칙 |
| --- | --- | --- |
| Partition | `scripts/browser-bundle-size.js`, `scripts/package-artifact.js` | 어느 branch 값도 택하지 않고 합산본을 Node20/22/24로 pack·설치·6번들 실측해 초과 항목만 Node20/24 최대값으로 올린다. |
| Route | README, SECOND_ARCHITECTURE, 생성 docs, 크기 상한 2파일 | 아키텍처는 Geo admission 단락과 prepared native route invocation 단락을 모두 보존. 생성물은 정본 generator로 재생성. 상한은 재실측. |
| Format6 | 위 항목 + `src/interaction/hitProgram.js`, `scripts/consumers/fixtures/interaction.ts`, `scripts/generate-doc-search-index.js` | `hitProgram.js`는 Format6의 `animationSceneRows` 순회(`for…of`/`continue`, batch row 제외)와 통합본의 `policy.pathGeometry`·`hitShapePreparationWork`를 함께 유지한다. TS fixture는 path budget 검사와 batch scene narrowing 검사를 모두 남긴다. 검색 index 상한은 재생성 후 실측. |

`hitShapeWork`는 통합본에서도 질의 비용 함수로 export되므로 Format6 `hitIndex.js`의 사용은 유효하다. Format6의 `core/sceneRows.js`와 `grammar/schemas/batchScene.js` 분리를 animation import로 되돌리지 않는다.

각 merge의 최소 검증: 해당 owner 시험(coverage 기준 포함), `package-boundaries`·`test-discovery`·`documentation-truth`·`package-artifact` 계약, generator `--check` 8종, 전체 `npm test`. 세 merge 뒤에는 합산 archive 하나로 Node20/22/24 설치 runtime·strict TS·6번들, minified Chromium DPR1/2, 원1k Partition/Point/Data를 다시 실행한다. 이전 branch archive 성공을 합산 결과로 인용하지 않는다.

## 2. 병목 해결 우선순위

통합 뒤에는 한 번에 한 conceptual change만 다룬다. 우선순위는 최종 요구를 막는 정도와 원인이 구체적으로 알려진 정도로 정했다.

1. **Point 100k 같은 프로세스 rebase-offline 정체.** WeakSet.add in-place Rehash에서 멈춘 기록이 Geo의 재시작 plan 실패와 같은 계열이다. 먼저 합산본에서 원 phased 스크립트를 재현하고, 장수명 owned-registry WeakSet에 들어가는 객체 수를 phase별로 계측한다. 등록 수 자체를 줄이는 방향(이미 1k에서 40000→22000)을 우선하며 registry rotation·branding·shallow trust로 우회하지 않는다.
2. **공통 sampler 50ms.** 최신 단일 sample 132.58ms(profiled 110.45ms), 미채택 column 후보 93.92ms다. [column 검토](circle-column-proof-review.md)의 null-prototype 최종안을 합산본에서 원100k로 먼저 측정하고, 반례 테스트·coverage와 함께 채택 기록을 남긴 뒤에만 구현한다. 50ms에 못 미치면 남은 비용을 phase별로 귀속해 다음 후보를 정한다.
3. **Partition 10k.** 원10k native/current/rebase/offline 기능 전수를 합산 archive로 먼저 실행한다. 그 뒤 exclusive 창에서 33ms preview/300ms layout P95.
4. **Route B union.** 미연결 직접 action 9개(`reviseData`, `editDerivedData`, `editParameter`, `applyDataUpdate`, `filterMarks`, `removeMarkFilter`, `editCanvas`, `fitCanvas`, `navigateProjection`)를 [감사 문서](../chart/route-native-data-canvas-next.md)의 경계대로 연결한다. data(transient context 수명) → Canvas(순서 있는 원 job/completion 검산) → fit(probe broad catch가 abort/deadline/quota를 흡수하지 않게) 순서. 이어 scoped/composition/facet과 초기 snapshot·clone·postMessage·물질화의 100ms 계량.
5. **Data 100k.** editable load(진단 약 0.8초)와 source-revise(약 5.4–5.7초) 전체 동기 호출의 phase 귀속부터 한다. async prepare 이름만으로 blocking 50ms를 충족했다고 보지 않는다.
6. **Geo 100k·Inference.** 합산 archive에서 camera/query/Canvas P95와 수명. 추론은 원10k nodes/100k edges 반복 P95·메모리.

모든 단계는 원 데이터·seed·수학·guard·timeout·SLO를 유지한다. 실패·정체는 지우지 않고 별도로 기록하며, 진단 측정(`--diagnostic`)을 통과 증거로 쓰지 않는다.

## 3. STEP-057–077 종료 경로

- **057–070**(interaction·animation·transaction·접근성·offline): 대부분 개별 checkpoint가 있으므로 새 구현보다 합산 candidate에서 각 카드의 의무를 다시 대조한다. 남는 것은 위 병목과 Route union, 그리고 STEP-070의 "모든 deferred 통합 의무 종료"다.
- **071**: size class SLO·memory. Canonical P95는 다른 CPU 작업을 멈춘 창에서 5warmup+30측정, DPR1·2. Canonical memory는 20node·20edge/2×2PNG, 5warmup+100cycle(50complete/50cancel).
- **072–074**: 새 exports·source-free package, current 계약·agent packet, `test/native-capabilities.json`의 577 consumer·79 AT group을 실제 candidate 결과로 닫는다. Owner 배정은 통과가 아니다.
- **075**: 실패·성공 표본 독립 검토(AT60). 구현과 분리된 reviewer가 코드만 보고 판단하게 한다.
- **076–077**: 같은 commit·같은 archive로 9검사(`npm test`, `test:realistic`, `test:coverage`, `test:browser`, `test:render`, `test:package`, `test:platform`, `package:check`, `docs:verify`)를 실행하고 `node scripts/native-capability-completion.js test/native-capabilities.json candidate-results.json --require-complete`가 실제 증거로 성공해야 한다. tag 생성 이후의 publish·docs deployment·registry 대조는 별도 승인 후에만 실행한다.

## 실행 규칙

- 16GB 장비에서 대규모 시험·pack·browser·coverage·100k 실행은 한 번에 하나. 코드·문서 작업은 병행한다.
- Node 경로: 20 `/Users/hyeonjeon/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin/node`, 22 `/opt/homebrew/Cellar/node@22/22.23.1/bin/node`, 24 `/Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node`. 다른 major로 pack할 때 `npm_execpath`를 Node22의 `npm-cli.js`로 지정한다.
- Gzip 상한은 Node20/24가 Node22보다 크게 나오므로 세 major 최대값을 기준으로 한다.
- 각 검증된 checkpoint를 commit/push한다.

## 2026-11-05 남은 미달의 공통 원인

남은 성능 미달은 모두 국소 비용 제거로는 닿지 않는 구조 문제로 귀속됐다.

- **Partition 10k·Geo 100k**: frame마다 path 명령 객체 수만~10만 개를 만들고 검증·freeze한다. Points가 format6 circle-run으로 SLO를 맞춘 것처럼, 명령을 열(batch)로 표현하는 공개 scene/primitive 확장이 필요하다. 네 renderer, hit, frame 의미, 저장 형식을 함께 다뤄야 하는 설계 결정이다.
- **Geo 10k**: 해결(authentic sampled group의 정확한 재수용 총량과 구성 경로 명령, [기록](GEO_CAMERA_PREVIEW.md)).
- **Data blocking 50ms**: 10k load(Node 약 71ms)의 30%가 snapshot `JSON.parse`이고, 나머지는 신뢰할 수 없는 snapshot의 전체 재검증이다. Revise 10k는 약 266ms다. 검증을 줄이지 않는 한 CPU 최적화로는 닿지 않는다. [CAPACITY_AUDIT](native-workloads-tool-evidence/CAPACITY_AUDIT.md) 6항대로, 동기 경계를 실제로 나눠 양보하는 명시 API가 필요하다. Route의 `drainRouteStages`(동기 iterator step 사이 양보)가 같은 모양의 기존 owner다.
