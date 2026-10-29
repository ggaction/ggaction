# STEP066/067 — 준비 결과와 세션 수명

## 진행 상태

- [x] 원 카드066/067, interaction 계약 및 기존 session/asset preparation owner 확인
- [x] 전체 승인 remainingApproval 재사용, 부모와 최소 경계 확인
- [ ] A: candidate asset 준비·네 tag·취소·원자 commit·host lease 수명
- [ ] 직접 renderer handles·100회 lifecycle·실제 browser·설치 소비자 검증
- [ ] 타입·Current·공개 문서·증거 동기화
- [ ] animation/layout worker/resize observer 통합 및 AT40/41 최종 matrix
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

Source-pinned build·화면·최종 SHA는 [qualification](preparation-evidence/qualification.json)의
후속 evidence commit에서 확정한다. 전체 normal/source/installed sweep이나066/067전체 완료를 주장하지 않는다.
