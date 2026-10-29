# STEP049 — private current frame bridge

## 진행 상태

- [x] [전체 승인](../AUTHORIZATION.json),047/048 및 안정 main f1800607d 통합 재사용
- [x] current scene index를 원자적으로 교체하는 host-independent lifecycle
- [x] synthetic 중간 위치, enter/exit/crossfade, stale completion, dispose 검증
- [x] 기존 Canvas renderer의 실제 DPR1/2/3 중간 geometry pixels와 동일 hit 확인
- [x] Node20/22/24 각47개, source/discovery/package33개, 새 owner100% coverage
- [ ] concrete mark/guide provenance adapter 및 STEP035 composition 통합
- [ ] 공개 interaction entry/types/session/browser/animation sampler와 AT33/34 전체 인수

이 private checkpoint는 animation sampler나 공개 InteractionSession 구현이 아니다.
STEP047–049 및 AT33/34 또는 전체077을 완료로 표시하지 않는다. 독립적으로 가능한 계산과 lifecycle만
먼저 구현했으며 실제 public 소비자 의무는 그대로 유지한다.

## 최소 경계

`interaction/hitFrame.js`의 `createHitFrameBridge({scene,entries,version})`는
`updateFrame({scene,entries,version})`, `hit(point,options)`, `getState()`, `dispose()`를 가진 private handle이다.
Scene/entries는 기존048 prepared index의 explicit 입력이며 version은 nonnegative safe integer다.
현재 scene/index/version을 한곳에 보유하고 hit은 항상 그 현재 상태만 사용한다. Program/trace/codec에
runtime handle, event, timer 또는 scene을 저장하지 않는다. Public package entry는 추가하지 않는다.

새 frame은 version이 증가할 때만 준비한다. 새 index 준비가 전부 성공한 뒤 current pointer를 바꾼다.
실패하면 이전 frozen snapshot, geometry, provenance와 query가 그대로 남는다. 늦게 끝난 version이나
동일 version은 stale-frame 결과로 무시하고 과거 geometry를 다시 계산하지 않는다. Envelope의 own-data와
version은 그 전에 검증한다. 이 규칙은 외부 sampler/async caller가 명시 frame sequence를 제공한다는 경계다.

Dispose는 idempotent이며 현재 state/index 참조를 해제한다. 이후 hit/getState/updateFrame은 disposed 오류다.
이 owner는 listener/RAF/worker를 만들지 않으므로 그런 host 자원 정리는 후속 session owner의 책임이다.

## 독립 증거

시작x20→중간x70→종료x120의 literal table에서 각 단계의 현재 위치만 hit이고 나머지는 miss다.
중간 scene을 기존 renderTransitionScene으로 DPR1/2/3에서 그려 native alpha와 CSS hit가 일치함을 확인했다.
이는 실제 Canvas scene/renderer 통합이고 browser PointerEvent 전체를 거친 증거는 아니다.

Enter/exit opacity0은 기본 제외되고 crossfade의 두 decorative primitives는 같은 semantic key 한 후보로
합쳐진다. 다른 overlapping owner는 보존한다. 두 Promise의 완료 순서를 뒤집어 늦은 frame이 현재를
덮지 못하게 했고 dispose 뒤 callback은 거부했다. 잘못된 revision 입력 실패 후 old program/trace JSON,
exact snapshot reference와 이전 hit가 그대로임을 검증했다. 테스트는 roadmap 파일을 import하지 않는다.

`frame-evidence/`는 최초 discovery/package 실패와 수정후 owning 검사,5개 owner의95/90/100 floor,
Node별 검사 및 package 실측을 구분한다. Published source는868entries/5,840,161unpacked,
packed Node22 1,268,280와 Node20/24 1,271,149bytes이므로 cap868/1,272,000/5,841,000이다.

## 남은 소비자

선행035의 child composition/scene metadata, 실제 mark와 axis/legend/header/title materializer role,
row/resource provenance 자동 수집, 공개 interaction 함수·타입·문서·설치 및 browser event,
animation sampler와 session의 stale asset/transaction bridge가 남아 있다. 현재 private index의
명시 metadata를 public API의 자동 inference로 표시하지 않는다.

최종 검토에서 scaleX1e-308 선의 slop-only point가 local inverse overflow 진단을 index에서 잃는 실제
재현을 발견했다. b36280156 이전 index와 수정 index를 같은 입력으로 실행한 expected/actual/diff를
`frame-evidence/overflow-regression.json`에 보존했다. Query 진단은 semantic key별 한 번 전달하며
기존 static 진단 복사도 query work budget에 포함한다. No-hit와 후속 정상 query는 그대로 유지된다.

최종 source `6d07bf122`로 provenance/machine/LLM을 고정한 뒤 docs19/19와 built160pages/1390artifacts를 통과했다.
Full/Basic/SVG/scene import graph에 private hit owner가 없음을 실제 import traversal로 확인했다.
Source provenance만 변경했고 UI assets/layout은 main f1800607d와 동일하여 해당 browser 증거를 재사용한다.
