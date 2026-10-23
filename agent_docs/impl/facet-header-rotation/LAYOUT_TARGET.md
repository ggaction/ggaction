# 회전 헤더의 구체적 배치 목표

## 승인 근거와 자동 검증

`PROPOSAL.md`의 직접 사용자 상시 승인 범위에 포함된다. 추가 질문이나 수동 이미지
검사를 하지 않는다. `TARGET_EVIDENCE.json`은 공개 옵션 구현 전에 기존 text primitive로
검증한 목표다. 185×195 Canvas, 120×60 plot 두 개, plot 원점 (50,20)/(50,105),
헤더 중심 Y=50/135, -90도 헤더 X=9, decoded pixel 144,300바이트와 ink 3,121을 기록했다.
공개 프로그램과 비교할 concrete graphics/order/pixels의 기준이며 기존 데이터와 축을 사용한다.

## 공간을 중복 예약하지 않기

plot spacing은 이미 각 child의 바깥 margin을 보존한다. 새 회전 헤더의 전체 바깥 폭을
그 margin에 다시 더하면 세로 헤더가 들어갈 충분한 공간이 있어도 plot과 Canvas가 밀린다.
회전된 **바깥쪽** 헤더는 필요한 bounds 중 기존 margin을 넘는 부분만 추가 예약한다.

- nonzero `rotation`을 명시한 헤더에만 적용한다. 생략과 0도는 기존 예약을 그대로 복원한다.
- 첫 column의 left, 마지막 column의 right, 첫 row의 top, 마지막 row의 bottom만
  기존 child plot margin과 합집합으로 계산한다.
- 내부 row/column 사이의 헤더 두께·offset은 기존 gap 검사에 전부 포함한다.
- 실제 header/axis/plot 간 충돌과 Canvas 경계 검사는 그대로 수행한다.
- 원본 데이터, child Canvas/plot 크기, 다른 가이드의 소유권과 자원을 변경하지 않는다.
- `topLane` 등 기존 명시 정책을 대체하는 새 공개 옵션은 추가하지 않는다.

primitive 목표의 left margin 50에는 회전된 헤더 폭 12와 offset 35가 이미 들어간다.
따라서 추가 예약은 0이며 plot X=50, 전체 폭 185를 유지한다. 회전 전 문자열 폭은
기존 측정값 29.880000000000003으로 고정했고, 이 폭을 세로 헤더의 가로 두께로 쓰지 않는다.

## legacy 호환

명시적 role 헤더와 plot-spacing legacy 헤더는 회전된 블록을 edge의 바깥에 놓는다.
canvas-spacing legacy 헤더는 기존의 child Canvas 안쪽 anchor 의미를 유지한 채 회전한다.
이 경우 기존 margin/offset으로 회전된 글자가 들어가지 않으면 기존 경계 검사가 거부한다.
새 회전 옵션이 기존 legacy offset의 의미를 바꾸지는 않는다.

0도는 concrete rotation을 제거하고 기존 위치·예약·그래픽으로 복원한다. common 또는
role의 생략은 기존 회전 의도를 보존한다. 모든 finite radians/명시 단위는 기존 회전
정규화를 거친다. 불변성, 저장 재생, 오버플로·충돌 거부의 일반 수치 허용을 늘리지 않는다.
