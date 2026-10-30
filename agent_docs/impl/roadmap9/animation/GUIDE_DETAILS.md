# 남은 native guide 의미 준비

## 진행 상태

- [x] [remainingApproval](../AUTHORIZATION.json#remainingApproval)로 남은 API·저장·시각 결정을 재사용한다. 재질문하지 않는다.
- [x] [원 animation 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)의 guide 값 대응 및 AT-42/44를 현재 native 소유자와 대조했다.
- [x] Band edge membership, axis title anchor, Parallel field geometry의 native 계산 소유자를 분리했다.
- [ ] 이 준비를 typed guide 의미·current frame·strict offline에 연결하고 consumer를 검증한다.
- [x] Native label의 settled wrapping과 measured edge/flush/rotation 계산을 공유했다.
- [ ] 준비된 label group의 closed animation 의미·title ink dependency와 legend를 공개 연결한다.

## 현재 소유 경계

Shared `planner/sample/frameEndpoint/frameProvenance`는 root의 timeline 통합이 소유한다.
본 준비는 native geometry/read-only meaning에 한정하며 새 공개 API·저장 필드·guide kernel version을 추가하지 않는다.
기존 [공개 guide slice](GUIDES.md)와 원격 `312026112`의 증거는 그대로 유지한다.

1. `grammar/gridGeometry.js`는 selected band의 start/end를 native scale center와 bandwidth로 계산하고
   같은 좌표를 중복 제거한다. 원 dash는 기존처럼 첫 selected band가 소유한다. 의미 대응용으로는
   겹친 edge의 **모든** `{value,edge}`를 보존한다. Boundary identity는 이 전체 typed membership이며
   배열 index·첫 범주의 이름·pixel 좌표가 아니다. Padding이나 subset 변경으로 membership이 달라지면
   다른 topology로 보고 enter/exit 또는 명시 fade한다.
2. `grammar/axisGeometry.js`는 title의 `start/center/end` range 역할과 명시 `at`의 기존 scale mapping을
   그대로 소유한다. Log 수치는 원 transformed-space 정책을 따른다. Label-relative offset과 inferred
   clearance는 실제 label ink dependency이므로 마지막 x/y 차이를 raw offset으로 위장하지 않는다.
3. `grammar/parallelGuides.js`는 field 축의 native slot과 line/tick/label/title geometry를 소유한다.
   Native Parallel mark와 guide가 같은 slot 계산을 호출한다. 의미 key는 namespace+target+field+
   component+typed tick이고 field 순번은 identity가 아니다. 같은 field의 reorder는 현재 native normalized
   slot에서 이어지며 차원 제거/삽입 및 scale 변경의 지원 여부를 별도로 검증한다.
4. 문자열·font·실제 줄배치가 바뀌는 label/title은 text morph가 아니라 safe fade다. 같은 문자열과
   준비된 잉크 정책에서 scale/frame만 바뀌는 경우에만 native placement로 이동한다. Wrapping을 매 frame
   실행하거나 concrete Text의 차이를 의미로 추정하지 않는다.
5. Legend는 현재 categorical/interval/continuous sample과 summary/title/label role을 읽는 소유자를
   공유해야 한다. 다른 raw category나 interval을 표시 문자열·sample index로 대응시키지 않는다.
   Legend layout의 geometry를 임의 pixel tween하는 공통 우회 경로는 만들지 않는다.

## 검증 경계

이번 준비 checkpoint는 기존 native action 출력·trace의 보존과 독립 literal geometry를 증명한다.
공개 transition endpoint/sample/재기준/offline/네 renderer를 새 범위에서 통과했다고 세지 않는다.
후속 연결은 위 준비값의 closed validation, finite/work budget, native forward equality와
raw identity를 함께 검증하고 기존 guide manifest owner에 version을 한 번만 선언한다.
전체 STEP061/062/063/077 완료와는 별개다.

독립 계산 추출의 실행·원 출력 동등성·설치 근거는 [anchor 증거](guide-anchor-evidence/README.md)에 둔다.

## Closed anchor 의미 준비

`grammar/animation/guideAnchors.js`는 제목·band 경계·Parallel field guide의 세 closed shape를
정규화하고 native owner로 geometry를 재생한다. `materialization/animation/guideAnchors.js`의
`guideAnchorItems`는 한 child scope에서 exact graphic ID와 owner/field/raw value를 연결한다.
이 준비 checkpoint는 공용 guide vector/planner에 아직 연결하지 않으며 공개 manifest version도
변경하지 않는다. `remainingApproval`은 이 결정을 포함하지만 공개 소비자 검증을 대신하지 않는다.

- Cartesian title은 명시 numeric offset, side, alignment/baseline 및 range의 start/center/end 또는
  numeric `at`+정규화된 native scale을 보존한다. 값 보간 후 같은 scale owner로 매핑하며 log 화면
  좌표의 중간점을 의미값이라고 취급하지 않는다. Native에서 허용하는 음수 offset도 유지한다.
  Inferred offset과 label-relative offset은 아직 ink dependency를 보존하지 못하므로 `guide-layout`
  상태다. Polar title은 theta의 frame 역할과 radial inside/outside·offset·shortest angle을 재사용한다.
- Band boundary는 `{value,edge}`의 canonical typed set을 보존한다. 선택 순서·객체 property 순서·
  동일 member 중복으로 key가 달라지지 않는다. 서로 다른 edge를 한 boundary로 주장하는 입력을
  거부한다. Range를 샘플링한 뒤 기존 band owner에서 경계를 재생하며 domain/padding/direction 또는
  membership 변경은 기존 scale/guide fallback이다.
- Parallel은 field를 identity로 보존하고 native slot의 `{index,count}`를 별도 geometry 의미로 둔다.
  중간에는 두 값을 연속 보간해 기존 `width/(count-1)*index` 연산을 그대로 호출한다. Endpoint의
  연산 순서를 바꿔 ULP 차이를 만들지 않는다. Field 추가·삭제·reorder 시 같은 field만 대응하며,
  tick은 같은 typed raw value를 같은 scale owner로 다시 매핑한다. 줄·tick·label·title의 native
  geometry를 재사용하며 표시 문자열·font·줄 배열 호환성 검사는 후속 track owner가 담당한다.
- 모든 shape는 descriptor-safe own data, closed fields, finite geometry와 item/work 한도를 검사한다.
  Source preparation은 semantic/config를 읽기만 하며 trace·materialization을 실행하지 않는다.
  현재 native Parallel tick 선택만 `materialization/guides/tickValues.js`로 공유해 계산 복제를 막는다.

실행 증거는 [closed anchor 증거](guide-anchor-state-evidence/README.md)에 기록한다. Title/legend/
Parallel/reflow/band-boundary 공개 전환, namespace 대응·재기준·strict offline·4 backend의 후속
통합 의무를 이 독립 준비로 완료 처리하지 않는다.

## Native label 배치 준비

`materialization/axisLabelLayout.js`의 `prepareAxisLabelLayout`은 이미 검증된 native 값과
선택 indices, scale, frame, config, text metric profile을 받는다. 원 값·indices와 표시 문자열을
분리하고 empty label을 숨긴 뒤 기존 wrapping owner를 한 번 호출해 줄을 고정한다.
`resolvePreparedAxisLabelLayout`은 그 줄과 같은 native 측정 profile만 사용하여 회전·edge clearance·
flush·명시 align 및 occupied/collision bounds를 계산한다. `maxWidth`나 responsive 폭을
매 frame 다시 선택하지 않는다. Native action이 Canvas/label/title 충돌을 검사하는 순서는 유지한다.

이 private 함수는 검증된 native 입력을 위한 계산 경계다. Config/profile 전체를 새 animation
payload로 저장하지 않는다. 후속 closed group state는 같은 raw values와 line roles, 필요한
준비 metric·font identity·배치 정책만 정규화하고 endpoint forward equality를 검증해야 한다.
줄·문자열·font 또는 responsive 선택이 달라지면 safe fade하며, 이를 final x/y offset 보간으로
우회하지 않는다. Schema1의 기존 측정 정책과 schema2의 missing exact metric 오류를 그대로
유지한다. Inferred/label-relative title은 이 label bounds와 title 측정의 의존성을 함께 보존한 뒤
연결해야 하며 아직 새 공개 typed 범위로 집계하지 않는다.

실행 증거는 [label 배치 준비](guide-label-layout-evidence/README.md)에 둔다.
