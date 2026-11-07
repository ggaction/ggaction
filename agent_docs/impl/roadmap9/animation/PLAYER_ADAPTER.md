# Typed player와 native frame hit 연결

## 진행 상태

- [x] [remainingApproval](../AUTHORIZATION.json#remainingApproval)을 재사용했다.
- [x] 기존 private controller에 실제 typed plan과 sampler를 연결했다.
- [x] 현재 semantic 값의 정방향·역방향·일시정지 interruption을 검증했다.
- [x] Native enter/exit·weighted·nested scope의 현재 geometry hit을 검증했다.
- [ ] 공개 entry·타입·Current·설치 소비자는 offline 소유자와 합산한다.
- [ ] Session publication·offline native metadata·준비 asset·전체 typed family와 timeline을 종료한다.

`createAnimationPlayer` adapter는 새 시간·run 상태를 만들지 않는다. 기존 controller의
play/pause/seek/reverse/rate/repeat/cancel/dispose 및 finished를 전달하고, interrupt만 현재
authentic sampled frame과 새 목표로 typed plan을 준비한다. 음수 rate의 새 plan은 현재 frame이
종료 쪽 endpoint가 되도록 방향을 바꾼다. 목표와 옵션은 기존 공통 owner에서 먼저 검증한다.
큐 안에서 sampler 준비가 실패해도 이전 run을 취소하거나 예약을 잃지 않는다.

Native hit의 metadata는 현재 그려진 node의 source/target index와 실제 endpoint owner에서
얻는다. key 문자열을 추측하거나 다른 dataset을 고르지 않는다. Weighted 표현은 모든 실제
source footprint를 같은 semantic item 한 개로 결합하며 Text metric도 source별로 적용한다.
정확한 endpoint, nested childPath, reorder/enter/exit, 중첩 interruption과 반례를 보존한다.

Animation와 hit/guide의 canonical owning156개, private controller와 adapter23개가 통과했다.
Adapter/controller coverage는100/94.44/100 및100/98.68/100이다. Frame provenance와 두 hit
owner는 line/function100이며 branch는100/93.80/93.22다. 이 기록은 공개 API 또는 STEP-063/070
전체 완료가 아니며, source pin·package와 최종 소비자 증거는 후속 qualification에서 고정한다.
