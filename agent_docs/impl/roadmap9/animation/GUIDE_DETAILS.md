# 남은 native guide 의미 준비

## 진행 상태

- [x] [remainingApproval](../AUTHORIZATION.json#remainingApproval)로 남은 API·저장·시각 결정을 재사용한다. 재질문하지 않는다.
- [x] [원 animation 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)의 guide 값 대응 및 AT-42/44를 현재 native 소유자와 대조했다.
- [x] Band edge membership, axis title anchor, Parallel field geometry의 native 계산 소유자를 분리했다.
- [ ] 이 준비를 typed guide 의미·current frame·strict offline에 연결하고 consumer를 검증한다.
- [ ] Label ink/flush/rotation/reflow, legend의 나머지 의미를 연결한다.

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
