# STEP065 — Committed snapshot history

## 진행 상태

- [x] 원 STEP065–067 / interaction 계약과 기존 session·selection·preview owner 확인
- [x] [전체 승인](../AUTHORIZATION.json)의 remainingApproval 재사용과 아래 최소 공개안 기록
- [x] A: bounded undo/redo/reset 및 외부 update history 정책 구현·검증
- [x] pointer preview/cancel·linked selection·hidden/drop·native annotation 교차
- [x] 타입·Current·공개 예제·browser·동일 tar 소비자 증거
- [ ] STEP066 async settlement / STEP067 asset-worker-player 수명 연결
- [ ] AT39–41 및 STEP074/077 최종 통합

기반은 E9 `eef9ee9ad`이며 새 authoring action이나 저장 schema를 만들지 않는다.
Runtime controller가 immutable program과 private selection records / linked projections를 함께 보관한다.
이 기록은 전체 STEP065–067 완료 주장이 아니다.

## A 공개 최소안

- `createInteractionSession({program,bindings?,selectionPolicy?,historyLimit?})`: limit 기본100,
  정수0..10000. 0은 undo/redo 기록만 끄고 초기 reset baseline은 유지한다.
- `dispatch({type:"undo"|"redo"|"reset",transactionId?,origin?,causeTransactionId?})`:
  전체 session snapshot 복원이며 target/payload는 거부한다. 기존 transaction metadata 검증·FIFO·loop guard를 재사용한다.
- `getState().history={undoCount,redoCount,limit}`: 읽기 전용 개수만 공개한다. program을 매번 clone하지 않는다.
- 성공한 native commit은 이전 snapshot 한 항목을 추가하고 redo를 비운다. preview/cancel/error와
  native no-op은 기록하지 않는다. undo/redo는 기존 runtime bindings를 유지하고 저장된 program·선택상태를 정확히 복원한다.
- reset은 세션 생성 당시 snapshot으로 복원하며 clearSelection과 다르다. 변경되면 undo 가능한 한 commit이다.
  empty undo/redo 또는 이미 초기 program인 reset은 active preview만 취소하며 새 commit을 발행하지 않는다.
- `updateProgram(program,{history?:"reset"|"record",origin?})`: 기본 history reset.
  record는 program 참조가 바뀐 경우만 이전 snapshot을 기록한다. 둘 모두 기존 외부 교체 lifecycle로 preview를 취소한다.
  origin 기본 programmatic, 기존 origin vocabulary만 허용. `program` event에 origin/history 정책을 명시한다.
  외부 교체가 세션 최초 reset baseline을 바꾸지 않는다.
- 복원 전에 counters·현재 host transform·전체 hit frame을 준비한다. 실패 시 committed program·trace·history는 그대로다.
  복원도 revision/generation을 증가시켜 이전 frame 결과를 stale로 만든다.
- undo/redo는 해당 transition의 affectedOwners를 보존한다. whole-program reset 및 외부 snapshot transition은 []이며
  previous/current가 전체 교체 의미다. 복원은 새로운 selection reconciliation을 실행하지 않으므로 selectionChanges는 []이고
  정확한 이전 선택 의미/linkedSelections를 state에서 읽는다. 이후 native edit/update는 복원된 private records를 기준으로 reconcile한다.
- destroy는 초기 baseline과 양 stack 참조를 해제한다. getState는 기존처럼 마지막 committed program을 읽을 수 있다.

## 소비자 경계

기존 native actions가 materialization/selection/trace를 소유하며 history는 결과 참조만 복원한다.
Codec에는 runtime history가 들어가지 않는다. Full/Basic의 현재 authoring 지원은 바꾸지 않는다.
같은 program snapshot의 scene/renderer/inspection을 다시 쓰므로 새 primitive나 renderer가 없다.
정확한 pointer/keyboard와 installed/browser 증거를 추가하고, camera/player/asset async settlement는 동료의 안정 owner와 후속 연결한다.


## A 검증 checkpoint

Source와 tests/types/current/docs를 동기화했다. [qualification](history-evidence/qualification.json)은
235개 interaction/타입/경계 및 최신 history·nested annotation13개, changed owners4개 critical floor,
실제5datasets×3recipes16개, real browser3개와 동일 tar `52f448f8` 3Node각14runtime/strictTS/5bundle을 기록한다.
새로 측정한 node20 interaction114,086gzip 외 Full/Basic/SVG/graph는 E9와 같다.
초기 package/bundle cap 및 문서207중3실패를 보존하고 owning166·architecture1·images4·새snippet1을 확인했다.
Built172pages/1531LLM 및320/390/768/1440 Axe0,320/1440 수동화면확인을 끝냈다.

기존 pointer100move는 history1, Escape는0이며 empty undo/redo/reset이 active preview를 취소한다.
Linked/hidden selection records, Basic 외부snapshot, nestednegative/rotatedCSStransform, stale frame,
cap0/2/10000, externalrecord/reset, erroratomic과same-transactionFIFOloop를 확인했다.
History는 검증된 program참조를 복원하므로 renderer·codec 저장결과는 새로 만들지 않으며 E9의4backend
exact primitive/codec증거를 재사용한다. 065의 async선행·066/067및077전체완료를 주장하지 않는다.
