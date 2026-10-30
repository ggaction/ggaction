# Native polar animation 검증

소스 `d72114d9d`는 Cartesian `608ac8122` 위의 독립 체크포인트다. 공개 함수 원형은 그대로이며,
[remainingApproval](../../AUTHORIZATION.json#remainingApproval)을 재사용한다. 정확한 지원 범위는
[ANIMATION](../../../../contract/current/ANIMATION.md)과 [POLAR](../POLAR.md)에 기록한다.

## 결과

- Native point/line/arc가 준비 시 보존한 θ·radius·frame·typed row-key grid를 보간한다. θ는 최단
  방향, 180도 동률은 양의 방향이다. Arc는 start+signed sweep으로 full turn을 유지한다. 같은
  ordered grid의 line만 연결하며 조건부 위치·정책/매핑/멤버/appearance 변경은 명시 fallback이다.
- `native-polar-coordinates@1`은 native mapping 결과를 소비한다. 임의 raw 값과 nonlinear scale을
  함께 보간한다고 주장하지 않는다. Mapping digest는 호환성 표식일 뿐이며 실제 angle/radius/frame,
  endpoint primitive와 asset bytes를 저장하여 네트워크 없이 복원한다.
- Animation192/192 및 기존95/90/100 바닥을 가진32 owner가 통과했다. 새로운 kernel/tracks는
  100/100/100, native projection은100/94.38/100이다. Point·Cartesian·graph·flat provenance를 보존한다.
- 실제 자료5/5, 동일 point/line/arc의 실제 Browser Canvas/SVG(DPR1/2)와 native PNG/PDF4/4가
  통과했다. 독립 내부 literal pixel, 양끝 native PNG 동일성, PDF vector를 검사했다.
- 같은 archive `0c32e2530889c607f993f1d06da9b9b87475b0287962ceee54c146c441ae63f3`를
  Node20/22/24에 설치하여 각각 공개9 runtime·strict 타입·실행 문서 snippet·optional peers·6개
  browser entry를 검증했다. Fresh process network guard 및 sampled frame 재기준을 포함한다.
- Native source/revision, nested20회 현재 frame 재기준, strict closed schema/kernel/geometry/row
  membership/accessor/oversize 거부를 확인했다. 이전 plan을 provenance에 다시 보존하지 않는다.
- Source pin18/18, owning 문서 수리66/66이 통과했다. Source pin 후 canonical repack SHA가 기존
  설치 archive와 동일함을 확인하여 metadata 변경 뒤 불필요한 재설치를 하지 않았다.

## 최초 실패 보존

기존 단위 검사의 polar는 항상 unsupported라는 기대 하나를 새 실제 지원에 맞췄고 다른 point
제약은 유지했다. 첫 coverage에서 새 projection의 categorical/aggregate 및 거부 분기가 빠져 있어
실제 native 회귀를 추가했다. Source-work 예산 회귀는3M×3행이10M 한도보다 작아 다른 오류가 먼저
났으므로4M×3행으로 입력을 바로잡았다. 실제 runtime 한도를 바꾸지 않았다.

첫 discovery는 신규 실제자료 owning 파일 때문에58→59였으며 정확한 파일명과 capability를 추가했다.
첫 package는 이전1141entries 상한을 초과했다. Node20/22/24의 실제 최대1144entries,
1636493packed/7404421unpacked에1144/1637000/7405000 상한을 적용했다. Animation bundle은 기존
200300보다 큰203265gzip이어서203300으로만 교정했다. 다른 entry 상한은 그대로다. 세 설치의
measurement receipt에 최종 상한을 다시 assertion했으며 동일 tar의 runtime/type 검사를 반복하지 않았다.

문서 첫231개는227pass/4fail였다. 검색 크기2개, stale provenance1개, 타입 주석 변경 후 미생성
runtime reference1개를 canonical generator와 실측1081301의 최소1081400cap으로 고쳤다.
Owning66/66과 source pin18/18로 닫았으며 전체231개를 재실행한 것으로 세지 않는다.

## 범위

후행 guide rule/circle, timeline, 다른 typed special layout 및 최종 STEP074/077 qualification은
열려 있다. 이 결과는 source-pinned focused checkpoint이며 package publish나 전체 release 증거가 아니다.
`COMMANDS.md`, 설치 harness, gzip 원본 로그와 JSON receipts를 함께 보존한다. Render artifact hashes는
ignored 로컬 출력의 검증값이며 실행 fixture로 재생성한다.

## 최종 문서

Source-pinned Jekyll build, built186페이지/1598 selective LLM artifacts, 실제 desktop search 및 전체
문서의320/390/768px responsive browser가 모두 통과했다. 관련 원본 로그를 보존한다.

## Package 문서 사실성 보충

Root의0118b1bd3 감사가 드러낸 별도 documentation-truth3개 중 package heading 누락과 낡은
bundle 표2건을 재현했다. 같은 animation entry 설명을 채택하고 현재 측정 상한 표만 정확히
동기화한 뒤3/3이 통과했다. Basic README는 이미422300과 일치해 바꾸지 않았다. 이 보충은
runtime/선언/설치 archive를 바꾸지 않으며 다음 public 체크포인트도 해당 검사를 포함한다.
