# STEP066/067 — 준비 결과와 세션 수명

## 진행 상태

- [x] 원 카드066/067, interaction 계약 및 기존 session/asset preparation owner 확인
- [x] 전체 승인 remainingApproval 재사용, 부모와 최소 경계 확인
- [x] A: candidate asset 준비·네 tag·취소·원자 commit·host lease 수명
- [x] 직접 renderer handles·100회 lifecycle·실제 browser·설치 소비자 검증
- [x] 타입·Current·공개 문서·증거 동기화
- [x] B: native 비동기 replacement와 기존 executor/asset pipeline 통합
- [x] C: 명시 ResizeObserver mount 수명·CSS 크기 이벤트·host native resize 연결
- [x] D: 배타 native camera operation 명령·공통 preparation/history/frame 경계
- [x] E: 명시 native camera drag/wheel/pinch/keyboard binding과 취소·history 경계
- [x] F: native gesture의 exact asset-bound preview와 transient lease 수명
- [ ] animation/layout worker/camera 통합과 AT40/41 최종 matrix
- [ ] STEP074–077 전체 통합

기반은 bounded history `68d09461d`다. [승인 원문](../AUTHORIZATION.json)의 remainingApproval을 재사용한다.
새 authoring action, persisted schema, renderer 계산을 만들지 않는다. 새 private owner는
`interaction/preparation.js`이며, session이 native candidate/frame/단일 committed state/FIFO를 계속 소유한다.

## A 최소 공개안

`createInteractionSession`의 optional `assetResolver(request)`는 host 준비 callback이다.
request는 exact candidate `program`, AbortSignal `signal`, `sessionGeneration`, `transactionId`,
`baseRevision`, `resourceRevisionVector`를 가진다. vector는 composition childPath마다 모든 dataset
(kind/data logicalId 포함)과 stored resource의 exact ref를 저장 순서로 담는다. invisible resource와
facet retained source도 포함하며 현재 immutable program의 참조 identity를 함께 확인한다.

Resolver는 `{images?,fonts?,shadows?,dispose()}` 또는 그 Promise를 반환한다. handles는 기존
prepareImageRendering/prepareFontRendering/prepareShadowRendering 반환값이며 session은 인증을
위조하거나 decoder/font/raster 함수를 대신 만들지 않는다. renderer는 실제 render 때 자신의
기존 authentic/exact graphic identity 검증을 수행한다. lease dispose는 host 등록·bitmap·worker 등
callback이 취득한 수명을 해제한다. 부분 준비 실패는 resolver가 자체 해제하고 throw해야 한다.
Session은 완성 lease를 받으면 성공·실패·stale·교체·destroy에서 정확히 한 번 해제한다.

state.assets는 현재 accepted lease의 images/fonts/shadows 참조만 읽는 frozen projection이다.
state.preparation은 pending request의 네 tag 또는 null이며 별도 candidate program을 저장하지 않는다.
`whenSettled()`는 호출 당시 job Promise를 반환한다. result는 `{status:'settled'|'cancelled'|'error',
preparation?}`이다. resolver/validation 실패는 error event와 error result이며 committed state는 그대로다.
Subscriber/disposer의 host 예외는 Promise rejection으로 관찰한다. 내부 catch는 사용하지 않은 Promise의
전역 unhandled rejection만 방지하고 반환 Promise의 rejection을 감추지 않는다.

Resolver 미지정 시 기존 동기 commit→settled 동작을 유지한다. 지정 시 native action 및 hit frame을
먼저 완성한 뒤 assets를 준비한다. 준비 중 committed program/history는 그대로이며 dispatch는 queued다.
성공 시 새 handles와 native program을 한 reducer에서 수락하고 commit→settled를 한 번 보낸다.
실패는 error1/commit0, 새 후보나 update에 밀리면 cancel1/commit0이고 늦은 settle은 없다.
새 invalid command는 기존 pending 후보를 조용히 취소하지 않는다.

최초 program도 준비한다. 초기 준비와 외부 updateProgram은 `assets` event의 status settled/cancelled/error,
preparation 네 tag, diagnostics로 완료를 알린다. 외부 update는 준비 성공 때만 기존 program event와
history 정책을 적용한다. 초기 준비 자체는 revision/history를 늘리지 않는다.
Mount/inspect/frame은 committed state를 읽고, 준비 중 host transform이 바뀌면 commit 직전에 current
transform으로 후보를 재결합한다. assets는 exact program graphics용이며 animation scene용 준비는
후행 player 통합 의무다.

## 소비자 및 후행 경계

Renderer imports를 session에 추가하지 않는다. Full/Basic의 기존 native support와 codec 경계는 같다.
History는 prepared handle을 보관하지 않으므로 undo/redo/reset도 복원 후보의 assets를 다시 준비한다.
Root의 private animation controller는 import하지 않으며, 공개 planner/player가 완성된 뒤 명시 generation
및 current frame으로 연결한다. Layout workers/native camera/ResizeObserver 자동 연결은 이 A checkpoint의
구현으로 주장하지 않고 원066/067·AT40/41 의무에 남긴다.

## A 검증 기록

251 interaction/타입/source boundary/discovery가 통과했고 두 변경 owner의 lines/functions100%,
preparation branches90.48%, session94.67%로 각각95/90/100 floor를 유지했다. 추가17 focused는
실제 image handle/pixel, 100 inspect mount/destroy와100 active gesture capture/RAF teardown,
현재 host transform 변경의 사전 거부, native/undo/update failure 및 reentry cleanup을 검증한다.
실제5datasets×3recipes16개에서 AST parameter→선택/행 lineage와 준비 전 불변·undo 재준비를 확인했다.
문서의 동일 resolver fragment를 실제 Chromium bitmap으로 실행해 keyboard 교체/late abort/destroy 후
추가 DOM write0과 bitmap close4를 확인했다.

고정 tar3fc60f3b의 Node20/22/24각15 runtime+stricttypes+5bundle을 확인했다. Node20 최초command는
runtime/types 및 measurements를 마친 뒤 기존 interaction cap에서 실패했고, 같은 측정값을 최소cap으로
재검사했다. Node22/24 complete command는 exit0이다. 최초 docs208중205pass/3fail은 검색cap과
fragment hash 등록이며 changed owning49가 통과한다. 이후 source 변경 때문에 stale된 provenance
1건을 재생성해49 owning을 다시 통과했다. 시각검토에서 정상 cleanup 예제가 expected-error로 표시된
것을 발견해 try/finally로 정확히 고치고 동일 fragment browser를 재검증했다.

Source `57a2463deb9fca9f37af08684939bf696892c003`에 고정한 owning49, built172pages/1531LLM이
통과했다. 문서320/390/768/1440px에서 overflow0/Axe0이며320/1440px 화면을 직접 확인했다.
[qualification](preparation-evidence/qualification.json)은 최초 실패와 최종 source·tar·명령·화면을 함께 보존한다. 전체 normal/source/installed sweep이나066/067전체 완료를 주장하지 않는다.

## B 최소 공개안 — 준비형 updateProgram

A의 안정 source57a2463de/evidence63ef4ca2a 뒤, 같은 remainingApproval 아래 구현한다.
`updateProgram(prepare,{history?,origin?,transactionId?,causeTransactionId?})`의 prepare는
`({program,signal,sessionGeneration,transactionId,baseRevision,resourceRevisionVector})`를 받아
native action으로 완성한 immutable program 또는 Promise를 반환한다. callback의 program은
요청 시작의 committed snapshot이고 vector도 그 base의 정확한 scoped resource refs다.

기존 preparation owner의 단일 pending job을 재사용한다. 준비된 program은 기존 external replacement의
선택/링크/native binding/hit preflight를 통과한 뒤 optional assetResolver로 들어간다. 이 asset request는
candidate program과 candidate vector를 받으며 outer job은 base 네 tag 및 exact program identity로
계속 보호된다. 준비 중 program/history/accepted assets는 바뀌지 않는다. 성공 시 기존 program event
뒤 새 `update` status settled를 한 번, 실패 시 update error, supersede/destroy 시 update cancelled를
한 번 보낸다. callback형 update의 whenSettled는 native 계산과 asset 준비 모두를 기다린다.

Callback은 기존 prepareGraphEdgeRoutes/createGraphRouteExecutor 같은 native owner에 signal을
전달하고 자체 부분 자원을 finally에서 정리한다. session이 worker protocol/cache나 geometry 계산을
추가하지 않는다. producer failure·invalid program·invalid native binding·asset failure는 원자 실패다.
유효한 새 native edit/restore/external replacement/gesture는 이전 pending job을 취소하고, invalid command는
취소하지 않는다. 단순 inspect/mount/frame은 현재 committed state를 유지한다. 같은 ID의 subscriber
재진입은 기존 FIFO loop guard를 재사용한다. worker의 늦은 결과가 다른 revision을 덮을 수 없다.

직접 검증은 실제 native route worker 및 AbortSignal/listener/terminate, out-of-order completion,
같은 base의 수정 경쟁, undo/history와 assets 두 단계, hidden child vector, empty/invalid 결과,
subscriber throw/reentry 및100회 destroy를 포함한다. source-free/browser 증거를 뒤에 닫는다.
ResizeObserver 및 public player/current-frame 통합은 계속 후행 의무다.

B 구현은263 interaction/타입/source boundary/discovery, 추가14 focused(type포함), 실제5×3/16,
실제 browserworker+canonical 문서 fragment1이 통과했다. 두 변경 owner는 각각100/90.80/100과
100/94.55/100으로95/90/100 floor를 유지한다.100회 native worker abort/dispose 및100회 callback
취소 후 늦은 완료에서도 추가 program write가 없었다. 공개 scene·codec는 기존 native route owner를
사용하며 Canvas/SVG exact browser 및 real Node worker→native 동기 결과 동일성을 확인했다.

고정 tar51699d37를 세 Node에서16runtime+stricttypes+5bundle로 확인했다. Node20은 모든측정 뒤
기존 interactioncap 실패를 보존하고 같은 측정값으로 최소cap을 재검사했다. Node22/24 명령은 exit0이다.
Docs+packageboundary55중 검색cap2실패는 실측 최소cap으로 고쳐 owning49를 통과했다. 전체suite
통과로 바꾸어 쓰지 않으며 [B qualification](update-evidence/qualification.json)에 원본과 최종을 기록한다.
Source43f0f4fe0에 고정한 owning49·built172pages/1531LLM이 통과했다. 문서4폭320/390/768/1440px
Axe/overflow0이며320/1440px 화면을 직접 확인했다. exact source 및 최종 PNG는 B qualification에 고정했다.

## C 최소 공개안 — 명시 host resize 관찰

B source43f0f4fe0/evidencecc300db35 뒤 remainingApproval을 재사용한다.
`mount(element,{rootTransform?,observeResize?:boolean})`의 observeResize 기본은 false다.
true는 해당 element의 ownerDocument.defaultView.ResizeObserver를 사용해 content-box만 관찰한다.
지원하지 않는 host는 mount 사전 검증에서 명시 오류이며 이미 mounted된 surface를 그대로 둔다.

`resize` event는 `{type:'resize',size:{width,height},state}`이며 width/height는 finite non-negative
CSS content-box pixels다. DPR과 rootTransform을 다시 적용하지 않는다.0은 숨김/접힌 element의
측정치로 허용하고, 완전히 같은 연속 측정은 한 번만 알린다. Resize는 program/history/revision을
자동으로 바꾸지 않는다. Host가 event.size를 바탕으로 native editCanvas/navigateProjection 등
공개 정책을 선택하고 updateProgram callback을 명시 호출한다. Session이 width/height나 projection
동작을 추측하지 않는다.

Observer는 mount lease 소유이며 remount/unmount/destroy에서 disconnect를 정확히 한 번 수행한다.
Callback은 현재 lease와 disposed 여부를 확인하고 기존 FIFO로 들어간다. observe 도중 오류는 새
listener/observer/index를 모두 되돌리고 기존 mount를 유지한다. disconnect 오류가 있어도 나머지
capture/listener 정리는 계속한다. 늦은 notification, update 준비 중 resize, subscriber 재진입/destroy,
100회 attach/detach를 실제 또는 명시 host mock으로 검증한다. 기본 observer 미지정 동작은 보존한다.

### C 검증 경계

변경 source owner는 session.js 하나이며 교차273/273, lines100/branches95.01/functions100으로
기존95/90/100 floor를 유지한다. 신규resize8개는100회mount/detach,constructor/observe/disconnect
실패,duplicate/invalid크기,subscriber 재진입,비동기역전,해제후callback0을 포함한다.
실제5datasets×3recipes의16검사와 실제browser ResizeObserver/DPR2/Canvas·SVGexact1도 통과했다.
Source-free 동일archive의17interaction사례·strict types·5entrybundles를 세Node에서 검증한다.
전체normal/coverage/설치suite를 수행했다고 주장하지 않고 변경owner와 실제consumer 증거를 구분한다.
Source pin 뒤built links/4width/Axe/수동화면 증거는 qualification record에 추가한다.

첫docs owning검사를generator완료전에실행해 freshness4+size2가 실패했고 원본을 보존했다.
Generator완료후에는 size2만 남았으며 실제1,030,081bytes의최소cap을적용해55/55가 통과했다.
초기preflight는시스템Ruby2.6PATH를사용해실패했으며기존Ruby3.2PATH로수리해통과했다.
신규installedcase의manifest누락1개는정확case등록으로수리했고owning2/2가통과했다.

C source `4931f38f3`를 고정한 뒤 docs49/49, built172pages/1531LLM,
320/390/768/1440px Axe0·overflow0을 통과했다. 320px와1440px 화면도 직접 확인했다.
동일 tar 세Node검증 및 최초실패·최종한도·명령·fingerprint는
[resize qualification](resize-evidence/qualification.json)에 보존한다. Camera와 player 후행 의무는 유지한다.

## C 이후 Geo camera/labels 안정본 합산

Resize 최종 `5f6c94a23` 위에 Geo `295283729c4526b12bc8be7512ecb79c418a3f27`을 합친다.
공통 Text 생성·screen lineage·resource lineage·selection dataOptional/resourceBacked·legend의
원 데이터와 visibility 순서를 양쪽 모두 보존했다. Generated 파일은 canonical source로 재생성했다.
새 camera gesture API를 이 병합에서 추가하지 않고 기존 callback updateProgram과 setViewport를 쓴다.

Focused330, 새 혼합 Text/history/nested2를 포함한 viewport5, 실제 camera/selection32,
DPR1/2 Geo conditional/labels3와 실제 ResizeObserver1이 통과했다. 패키지 소비자는 같은 tar의
interaction18 + camera3 + labels3 및 strict types/5bundles다. 첫 Node20은 optional peer 설치가 없는
harness 때문에 실패했으며 canonical testOptionalDependencies를 재사용했다. 다음 TypeScript 실패는
InteractionProgram이 Basic도 포함하므로 Full guard를 fixture에 추가해 해결했다. 새 native 권한은 없다.
최종 runtime24/types 성공 후 기존 합산 bundle cap 실패만 남아 실측 최소cap으로 닫는다.

Docs55의 최초3실패는 검색크기2와 아직mergecommit에없는example source-link1이다. 검색실측으로
수리하고 source commit 뒤 provenance를 고정해 해당 링크를 검증한다. 전체coverage/normal/077
완료를 주장하지 않으며 native camera gesture·player·최종matrix는 후행으로 유지한다.

합산 source `04137a355`를 원격에 고정했고 최종 tar `10758e56…`의 Node20/22/24 각각
runtime24 + strict types + five-entry bundle 검증이 종료0이다. 이전 tar `5313f0df…`는
소스 말미 공백 한 바이트 제거 전이며 archive 비교에서 다른1058파일은 byte-identical이다.
현재 tar를 독립 재검증하여 그 차이를 숨기지 않았다. Source-pinned docs55, built172pages/
1535LLM, interaction/geometry/labels 세 경로×네 폭의 overflow0/Axe0도 통과했다.
원본 실패와 두 archive, 정확 명령·측정·그림은
[camera merge qualification](camera-merge-evidence/qualification.json)에 보존한다.

## D 최소 공개안 — native camera 명령 전달

`AUTHORIZATION.json` remainingApproval 및 2026-10-29 부모의 명시 방향을 재사용한다.
기존 `setViewport`의 payload에 배타적인 `{operation:GeoCameraOperation}` 경로를 추가한다.
원 절대 transform 네 필드와 operation은 함께 넣을 수 없고 unknown/accessor 입력을 거부한다.
명시 projection `{childPath,id}`를 기존 owner resolver로 찾고 receiver의 `navigateProjection`을
호출한다. Full 정적 import, 새 camera 저장 상태, 중복 pan/zoom 수학은 추가하지 않는다.

원 native pan/anchor zoom/pinch/rotate/fit/reset/resize 결과는 공통 transaction → preparation →
commit/history/frame 경로 하나로 전달한다. 준비 실패·취소에서 원 program/scene/history는 보존하고
늦은 lease는 해제한다. Reset baseline은 host가 `getProjectionView`로 명시 확보한다.
이번 checkpoint는 명령 경로이며 pointer/wheel/pinch gesture와 공개 player 연결은 뒤따른다.

D command source 검증: 집중279/279 및 변경 selection owner100/99.22/100, native camera 전 연산의
literal/위임/취소/불변성 회귀, 실제5datasets×3recipes+inventory16, canonical host button의
키보드/Canvas·SVG 브라우저1, docs55/manifest2 통과. 동일 tar `4deb6f2a…` Node20/22/24 각각
interaction18 + strict types + five-entry bundles가 종료0이다. 최초unpacked33bytes 초과와
검색3bytes 초과를 실측최소한도6,828,000/1,037,000으로 수정했다. Source pin 뒤 built 증거를 잇는다.

D source `e4715d55a` 고정 뒤 provenance/LLM 재생성, owning docs49, build172pages/1535LLM,
320/390/768/1440 화면의 overflow0/Axe0까지 완료했다. 320/1440 이미지를 직접 확인했다.
[정확 D qualification](camera-operation-evidence/qualification.json)에 source hash·동일 tar·초기실패·
명령·원본로그·공개 브라우저 그림을 보존한다. STEP046/066/067 전체와077은 아직 완료가 아니다.

## E 최소 공개안 — 명시 navigation binding

남은승인과 부모의 2026-10-29 구체안 확인을 재사용한다.
`{type:"navigate",target,mode:"pan"|"rotate",scaleExtent,initial,rotationStepDeg?}`를 기존
단일 editing pointer binding 집합에 추가한다. initial은 host가 getProjectionView로 얻은
명시 reset parameter다. Rotate에만 양수 rotationStepDeg(로컬 projection px당 degree)를 요구한다.
현재 projection 및 initial의 type이 일치하고 scaleExtent는 양수의 정렬된 두 값이어야 한다.
다중 편집 gesture 우선순위 조합은 아직 지원하지 않고 원 요구를 후행으로 유지한다.

Pointer capture/reducer는 navigation일 때만 두 번째 pointer를 받는다. Pan/rotate→pinch가 되면
기존 native action의 private phase candidate를 기준으로 삼고 원 committed program/history는
그대로 둔다. Preview는 RAF당 한 번, final up은 마지막 위치까지 계산한다. 공통 준비 owner에
넘기기 전에 표시 frame을 원 committed frame으로 복구하여 async 실패/취소도 일치시킨다.
Escape/cancel/lost capture/blur/source/frame revise/unmount/destroy는 모든 pointer와 RAF를 정리한다.

Wheel deltaMode0/1/2는 pixel/16px-line/surface-height-page로 정규화해 `2^(-deltaPx/300)`의
bounded factor와 native inverse anchor로 zoom한다. Keyboard Arrow는로컬10px pan/rotate,
+/-는두배/절반 zoom, Home은initial reset이다. 표면의 native focus/`tabindex`와 `touch-action:none`은
host가 명시한다. Modifier shortcut은 가로채지 않는다. 새로운 renderer/global camera/asset fetch는 없다.

E source의 관련 session/controller/type/boundary 집중290/290, 추가 navigation·공유 node 수리26/26,
실제5datasets×3recipes+inventory16, 실제 browser Canvas/SVG drag·wheel·touch pinch·keyboard 및
orthographic rotation2/2가 통과했다. 새 owner100/97.59/100, pointerCapture100/97.48/100,
session100/95.72/100으로 각95/90/100 floor를 유지한다. 최초remount/off scene 불일치를 실제로
수리했고 새 공통 node 회귀도 추가했다. Browser 첫 wheel 예상은 DPR2에서 전달된 CSS delta를
잘못 가정한 fixture였으며 실제 DOM delta와 독립 factor oracle로 교정했다. 최초discovery의
잘못된 test-ledger key와 검색cap 실패도 보존한다. 전체077/066/067 완료를 주장하지 않는다.

Asset-bound preview는 committed state.assets를 재사용할 수 없다. 이번 final 준비 대기/취소는
원 frame 복원으로 검증했고, 실제 preview별 준비·폐기와 공개 player/gesture priority 통합은
후행 의무로 남는다. Existing image/font/shadow authentic handle을 재사용할 때 별도 authoritative
asset cache를 만들지 않는 현재 architecture 경계를 유지한다.

E package archive c8d46732…를 고정해 source-free 설치 검증한다. Node20의 runtime19와 strict types는
통과했으며 interaction119,691gzip만 기존116,700cap을 초과했다. 동일 측정 bundle을119,700cap으로
검사했고 다른 네 entry 한도는 유지했다. Node22/24는 같은 tar로 runtime19·타입·five-entry를
독립 실행한다. 원본실패/최종실측/실제브라우저 및 문서4width 그림은 navigation-evidence에 보존한다.

E source `68ac482dd` 고정 뒤 문서 source pin49/49, build172pages/1535LLM을 검증했다.
320/390/768/1440의 overflow0/Axe0 및320/1440 직접확인 증거는 내용·CSS가 같은 pin 이전
화면을 재사용한다. [정확 navigation qualification](navigation-evidence/qualification.json)은
source/type fingerprint, 동일 tar, 3Node 결과, 최초실패와 원본로그를 구분해 보존한다.

## F 최소 공개안 — exact preview asset lease

같은 remainingApproval 아래 기존 assetResolver와 preparation owner를 재사용한다. 각 활성 편집
gesture는 private preparation 인스턴스 하나만 소유하고, RAF 후보마다 이전 pending 작업을 취소한다.
이전 accepted preview는 다음 준비가 끝날 때까지 표시한다. 성공하면 previewProgram·previewAssets·
hit frame을 함께 공개한다. state.assets는 committed program 전용이며 history는 변하지 않는다.
공개 추가 상태는 readonly previewAssets 하나다. preparation은 현재 pending preview 또는 native
commit의 기존 네 tag이고 whenSettled는 가장 최근 시작한 준비 Promise를 관찰한다.

Final up은 최신 좌표로 candidate만 계산하고 기존 native commit 준비로 전달한다. Preview 준비와
기존 accepted transient lease는 취소/교체/resize-source-update/unmount/destroy에서 해제한다.
초기 committed asset 준비 전에는 편집 capture를 시작하지 않아 복원 가능한 baseline을 보존한다.
새 renderer나 별도 권위 program/cache는 만들지 않는다. 실패 시 gesture error1·commit0, 늦은
lease dispose1·화면write0, previous program/trace/history equality와 실제 renderer stale 거부를
image/font/shadow 조합 및 독립 cancellation 순서로 확인한다. 공개 animation은 후행이다.

F runtime 집중302/302와 변경session owner100/95.75/100(95/90/100floor), 추가 owner·타입13/13,
실제5datasets×3recipes+inventory16/16, 정확 공개문서 fragment의 실제 browser bitmap2/2가 통과했다.
Image뿐 아니라 실제 font/glyph/shadow를 함께 준비하고 Canvas/PNG pixels와 SVG payload를 비교했다.
Node 이동·navigation·annotation·brush가 같은 owner를 쓰며 초기준비·지연교체·취소·100회수명·
동기 abort 관찰·subscriber 재진입·throwing disposer 회귀를 보존한다. 별도 PDF/전체 sweep 완료를
주장하지 않으며 기존 native renderer 증거는 해당 source가 불변인 부분만 재사용한다.

동일 tar7811b16f…는20runtime/strict TypeScript/five-entry bundle을Node20/22/24에서 검증했다.
Node20 최초명령은 runtime/types가 통과한 뒤 interaction119,991gzip의 기존119,700cap에서 실패했고,
동일 측정 bundle만120,000cap으로 재검사했다. Node22/24는 독립 명령 exit0이다. Package1060/
Node20packed1,504,715/unpacked6,842,266이며 unpacked만6,843,000으로 올리고 기존 entries/packed
한도는 유지한다. 최초 async-preview 기대·잘못된fixture·snippet hash·package/bundle 한도 실패는
최종 source pin 문서와 함께 preview-evidence에 별도 기록한다. 전체066/067/077 완료는 아니다.
