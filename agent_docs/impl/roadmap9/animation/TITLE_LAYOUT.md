# 종속 제목 배치의 native 계산 공유

[remainingApproval](../AUTHORIZATION.json#remainingApproval)의 남은 구현 승인을 재사용한다. 그룹 범례 `ada9c46eb`/pin `d92da9de0` 뒤 독립 준비 checkpoint이며, 새로운 공개 함수·저장 형식·shared4 변경은 없다. Root가 승인한 원 계산의 최소 추출이다.

`actions/guides/axes/titles.js`는 title meaning 추론, named resource 조회, theme42/52 preferred offset, 같은 axis side의 선행 오류, wrapped semantic/graphic 쓰기를 보존한다. `materialization/guides/axisTitleLayout.js`는 titleBounds와 inferred/label-relative 수식만 공유한다. 4px native gap, legacy Canvas available clamp, 명시plot/responsive의 unclamped 정책, 회전 Y fontSize/4 reserve와 실제 label 충돌 때의 legacy fallback을 원 순서로 유지한다.

- `axisTitleBounds(geometry,config,text,profile)`는 기존 line block/font metric owner를 호출한다.
- `resolveInferredAxisTitleOffset`는 channel/config/text/profile/frame/canvas, labels union, 각 실제 labelBounds, preferred, resolved scale, unclamped를 받는다. Label union이 없으면 기존 preferred를 유지한다.
- `assertLabelRelativeTitleSide`는 본래 side 오류를 bounds조회 이전에 발생시키며 pure 계산도 같은 owner를 재사용한다.
- `resolveLabelRelativeAxisTitleOffset`는 channel/config/text/profile/frame/along/labelPosition과 nonempty labelBounds를 받는다. Empty/side/nonfinite 오류가 같고 계산값을 별도 저장하지 않는다.

기존 공개 action12조합의 config·axis graphics·직접 action trace를 추출 전후 비교해 정확히 같은 SHA256을 확인한다. 독립 literal은 title20×10 측정, 네 side7px gap, 4px native inferred gap, Canvas clamp와 Y ink reserve/충돌 경계를 고정한다. 기존 Full/Basic·편집·Canvas·theme·metrics·source/facet·codec owning 회귀를 함께 실행한다.

후속 typed title-layout은 R의 native current label group/metric query closure에서 현재 occupied bounds를 받아 이 owner를 사용한다. Label의 마지막pixel을 raw 의미로 추정하거나 기존 guide @7/transition2를 여기서 변경하지 않는다. Root의 timeline3 및 R dynamic emission 연결은 별도 통합 의무다. Inferred legend clearance와 implicit lane도 아직 완료가 아니다.
