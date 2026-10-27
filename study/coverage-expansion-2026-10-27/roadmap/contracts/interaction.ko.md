# Semantic hit gesture와 session 계약

## 상태 소유권

ChartProgram은 committed chart state만 소유한다. InteractionSession은 committedProgram, previewProgram, activeTransaction, runtime bindings, focus, listener disposers를 소유한다. DOM element/PointerEvent/timer/RAF/worker는 session 외부로 직렬화하지 않는다. persistent selection/parameter/annotation은 명시 commit 시 program resource가 된다. hover는 기본 transient이며 저장하지 않는다.

proposed entry ggaction/interaction은 browser-safe controller와 host-independent reducer를 export한다. default authoring entry가 DOM을 import하지 않게 한다. createInteractionSession({program,bindings,clock,assetResolver})는 lifecycle handle을 반환하고 authoring action과 혼동하지 않는다. mount(element), updateProgram(program), dispatch(command), subscribe(listener), getState(), destroy()를 명시한다. mount 없는 headless reducer 시험이 가능해야 한다.

## Hit의 좌표와 결과

pointer clientX/Y→element client rect→CSS local→root transform inverse→child composition inverse→geometry 좌표 순서다. DPR을 CSS local에 다시 곱하지 않는다. non-invertible transform은 hit 없음+diagnostic이다. spatial index는 current scene bounds를 broad phase로 검색하고 exact geometry/clip 검사로 좁힌다. fillRule, stroke width+hit slop, dash gaps 정책, opacity/visibility, z-order를 반영한다.

hit 결과는 {itemKey,ownerId,role,childPath,rowKeys,resourceRefs,screenPoint,localPoint,distance,zIndex,candidates}다. 실제 그림의 decorative part는 item의 owner로 collapse한다. guide roles axis-tick/axis-title/legend-item/facet-header/chart-title도 명시한다. candidate 정렬은 frontmost zIndex→distance→stable itemKey. overlap bundle는 모든 후보 edge를 반환하고 nearest 한 개로 정보를 없애지 않는다. 동일 item의 두 primitive가 걸려도 이벤트는 한 번이다.

path hit는 flatten tolerance.25 CSS px, fill inside winding/evenodd, stroke min point-segment distance≤width/2+slop. default pointer slop3px, touch6px로 제안한다. transparent fill은 'none'과 구분하며 opacity0은 default hit 제외, hitInvisible:true만 예외다. clip 밖은 항상 제외다. current animation scene version으로 index를 묶고 stale endpoint index를 쓰지 않는다.

## Selection resource

selection kind items/range/predicate, targets는 owner/child scope다. items는 logical key 배열, range는 typed domain bound+inclusive flags, predicate는 data AST다. mode replace/add/toggle/subtract/intersect, empty policy none(default)/all을 explicit 저장한다. nearest는 screen metric 또는 declared data metric을 구분한다. linked resolve는 union/intersection/global(owner scope)로 명시한다.

point hover는 inspection, click은 single/toggle selection. brush x/y/xy, angular interval, free lasso를 지원한다. categorical brush는 화면에 걸린 band keys, log brush는 inverse scale domain, time은 epoch ms, angular wrap interval은 [a,2π)∪[0,b]로 저장한다. lasso는 screen polygon과 selected item keys를 저장하고 domain polygon으로 오인하지 않는다. resize 후 selection 의미는 keys로 보존하고 lasso overlay는 필요하면 recompute된다.

## Gesture arbitration

pointerdown에서 priority가 가장 높은 applicable binding 하나가 transaction을 차지한다. default priority는 resize/reorder handle > annotation handle > brush/lasso > node drag > pan > click inspect다. modifier 조건은 명시 binding schema로 받고 서로 같은 priority/조건이면 ambiguity error다. movement3 CSS px 미만은 click, 그 이상은 drag다. pointer capture를 취득하고 active pointer ID를 고정한다. pinch 전환은 두 번째 pointer가 navigation binding에 들어올 때만 허용한다.

| 상태 | 입력 | 다음 상태와 효과 |
|---|---|---|
| idle | pointerdown | armed, baseline snapshot, capture |
| armed | move threshold 미만 | armed, inspect만 |
| armed | move threshold 이상 | dragging, preview 시작 |
| armed | up | click commit 또는 no-op; capture 해제 |
| dragging | move | 같은 baseline에서 새 preview, commit 없음 |
| dragging | up | 최종 preview를 한번 commit, idle |
| armed/dragging | Escape/pointercancel/lostcapture/blur | baseline 복구, cancel 한번, idle |
| any | destroy | cancel if active, dispose, terminal |

cancel 뒤 늦은 pointerup은 no-op다. 클릭 no-op은 history를 늘리지 않는다. preview coalescing은 RAF당 최대1회지만 최종 pointerup 위치는 반드시 처리한다. long synchronous computation으로 Escape를 막지 말고 worker/chunk operation을 사용한다. keyboard command도 같은 reducer 경로로 들어온다.

## 명령과 이벤트

command 종류는 inspect, select, setParameter, filter, setVisibility, reorder, annotate, setViewport, focusHierarchy, moveNode, reset, clearSelection. 각 command는 type, target, payload, transactionId, origin을 가진다. origin은 user/programmatic/replay/linked이고 causeTransactionId로 연결된다. reset은 session 초기 baseline, clearSelection은 선택만 제거한다. filter clear를 reset과 혼동하지 않는다.

event는 {type,transactionId,origin,phase,revision,affectedOwners,previous,current,diagnostics}. phase는 preview/commit/cancel/settled/error. 성공 순서: preview0..N→commit1→settled1. 취소: preview0..N→cancel1. reject: error1, commit0. settled는 해당 revision의 required layout/assets/worker가 모두 적용된 뒤 발생한다. 취소된 transaction에 나중에 settled를 보내지 않는다. large program을 event마다 deep clone하지 않고 immutable snapshot refs 또는 bounded summary를 제공한다.

reentrant dispatch는 현재 reducer call이 끝난 뒤 FIFO queue로 처리한다. subscriber가 같은 transaction origin을 다시 연결했을 때 loop를 차단한다. linked selection은 transaction당 target owner에 한 번, dependency closure에서 순서대로 실행한다. cycles in binding graph는 initialization에서 거부하거나 declared fixed-point mode가 없으면 허용하지 않는다.

## Async와 history

각 async job에 sessionGeneration, transactionId, baseRevision, resourceRevisionVector를 붙인다. 완료 시 네 가지가 일치할 때만 적용한다. 새 updateProgram이 들어오면 active preview를 cancel하고 새 baseline으로 재base한다. concurrent same-property edit를 마지막 도착값으로 덮지 않는다. destroy는 idempotent, 모든 listener/capture/timer/observer/worker/asset subscription을 해제한다. destroyed session의 dispatch는 명시 disposed error다.

history는 successful commit당 한 항목이고 preview는 기록하지 않는다. undo/redo는 immutable previous/current program을 사용하고 runtime binding은 유지한다. node drag100 move가100 history entries가 되면 실패다. external updateProgram은 origin을 명시하고 history 포함 여부를 option으로 정한다. default external update는 history reset이다.

## 필수 직접 조작

legend click은 visibility 또는 selection 중 binding으로 구분한다. hide된 mark의 scale domain은 policy visible-data/all-data로 명시한다. reorder는 categorical domain을 바꾸고 axis/legend/marks 모두 동기화한다. annotation은 data/feature/item anchor+offset, text/style을 저장한다. data 없는 screen annotation은 screen-anchored임을 명시한다. context menu는 host callback에 actionable semantic targets를 넘기고 새 DOM widget library를 core에 넣지 않는다.

linked filter가 source rows를 바꾸면 data→stats→scale→graphics가 모두 갱신된다. 삭제된 child/row/edge selection은 drop 또는 keep-hidden 정책과 event로 처리한다. keyboard focus는 surviving stable item, 없으면 owner container로 복구한다. tooltip은 hover와 focus 모두 가능하고 Escape로 닫는다. touch는 hover가 없어도 inspect/selection에 접근 가능하다.

## 명시 시나리오

baseline values[a1,b2], brush move3회 뒤 Escape: baseline/trace/hash 동일, preview≤3, cancel1, commit0. 같은 입력 뒤 up: commit1, history+1, cancel0. pointer capture lost 후 up: cancel1만. linked A→B→A binding을 단순 callback으로 만들었을 때 무한 event 발생은 실패다. async job1 뒤 job2를 보냈고 job2가 먼저 끝나면 job1은 stale로 폐기한다. destroy 뒤 성공 callback에서 DOM/scene을 만지면 실패다.
