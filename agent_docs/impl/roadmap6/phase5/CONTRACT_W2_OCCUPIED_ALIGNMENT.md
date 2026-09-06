# W2 C2 — Single horizontal legend의 실제 occupied alignment

[전체 승인](../APPROVAL.md) 아래 #102를 수정한다. 기준 `17e3691fa5450e9f39762d135389a42d1d9b2285`다. 7family×2edge×3align×2border84cases에서 actual alignment error66,offset error48을 재현했다.

Single top/bottom edge legend는 최종 concrete foreground와 background의 union bounds를 기준으로 align/offset을 적용한다. Left/right는 plot의 해당 x edge, center는 plot center에 전체 block 중심을 맞춘다. Top offset은 occupied bottom과 plot top의 거리, bottom offset은 occupied top과 plot bottom의 거리다. Visible text·actual shape/line stroke·collection children·border stroke까지 포함하며 hidden title은 제외한다. Margin/Canvas를 자동 확대하지 않고 최종 requested bounds가 Canvas 안에 들어가지 않으면 immutable error다.

Single legend와 multi-block lane은 같은 wrapped horizontal materialization boundary를 사용한다. Family는 intrinsic content geometry를 만들고 horizontal 최종 Canvas fit은 이 boundary가 책임진다. 초기 intrinsic coordinates의 overflow 때문에 최종 유효 배치가 거절되면 안 된다. Pure layout helper가 전체 block translation을 계산하고 기존 wrapped graphic translation이 실행한다. Renderer/core action wrapper에 guide 의미를 넣지 않는다.

Legacy-bottom의 명시 fixed sample anchors는 이번 정렬에 포함하지 않는다. 기존 multi-block packing 및 combined atomic group 계약은 보존한다. Multi-block에서 align이 개별 절대위치를 의미하지 않는 기존 규칙도 유지한다. Side layout/default와 block 내부 large-symbol/font spacing은 별도 C2 검증이다.

이는 horizontal geometry/default의 observable correction이다. 독립 literal primitive를 구현 전에 만들고 대표 color/gradient/size 경계값·top/bottom와 exact public graphics/order/pixels를 검증한다. 84cases와 Full/Basic 지원 family, hidden/visible title, boundary-fitting/no-margin positive와 overflow negative, create/edit/content/remove/Canvas/scale/encoding, same-target combined와 independent multi-block을 검사한다. 변경된 이전 nominal-coordinate fixtures는 실제 contract delta를 설명하고 primitive/oracle/doc example과 함께 이동한다. 원래 alignment 목표를 기존 green snapshot에 맞춰 축소하지 않는다.
