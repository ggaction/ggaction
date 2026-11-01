# 종속 제목 배치의 native 계산 공유

[remainingApproval](../AUTHORIZATION.json#remainingApproval)의 남은 구현 승인을 재사용한다. 그룹 범례 `ada9c46eb`/pin `d92da9de0` 뒤 독립 준비 checkpoint이며, 새로운 공개 함수·저장 형식·shared4 변경은 없다. Root가 승인한 원 계산의 최소 추출이다.

`actions/guides/axes/titles.js`는 title meaning 추론, named resource 조회, theme42/52 preferred offset, 같은 axis side의 선행 오류, wrapped semantic/graphic 쓰기를 보존한다. `materialization/guides/axisTitleLayout.js`는 titleBounds와 inferred/label-relative 수식만 공유한다. 4px native gap, legacy Canvas available clamp, 명시plot/responsive의 unclamped 정책, 회전 Y fontSize/4 reserve와 실제 label 충돌 때의 legacy fallback을 원 순서로 유지한다.

- `axisTitleBounds(geometry,config,text,profile)`는 기존 line block/font metric owner를 호출한다.
- `resolveInferredAxisTitleOffset`는 channel/config/text/profile/frame/canvas, labels union, 각 실제 labelBounds, preferred, resolved scale, unclamped를 받는다. Label union이 없으면 기존 preferred를 유지한다.
- `assertLabelRelativeTitleSide`는 본래 side 오류를 bounds조회 이전에 발생시키며 pure 계산도 같은 owner를 재사용한다.
- `resolveLabelRelativeAxisTitleOffset`는 channel/config/text/profile/frame/along/labelPosition과 nonempty labelBounds를 받는다. Empty/side/nonfinite 오류가 같고 계산값을 별도 저장하지 않는다.

기존 공개 action12조합의 config·axis graphics·직접 action trace를 추출 전후 비교해 정확히 같은 SHA256을 확인한다. 독립 literal은 title20×10 측정, 네 side7px gap, 4px native inferred gap, Canvas clamp와 Y ink reserve/충돌 경계를 고정한다. 기존 Full/Basic·편집·Canvas·theme·metrics·source/facet·codec owning 회귀를 함께 실행한다.

후속 typed title-layout은 R의 native current label group/metric query closure에서 현재 occupied bounds를 받아 이 owner를 사용한다. Label의 마지막pixel을 raw 의미로 추정하거나 기존 guide @7/transition2를 여기서 변경하지 않는다. Root의 timeline3 및 R dynamic emission 연결은 별도 통합 의무다. Inferred legend clearance와 implicit lane도 아직 완료가 아니다.

## 고정 라벨 의존 제목의 private 계산

`axisTitleState.js`는 같은 승인을 재사용하는 다음 독립 계산 checkpoint다. 공개 projection/guideTracks에는 아직 연결하지 않았고 guide @7, transition2, 공개 선언을 바꾸지 않는다. Root의 timeline3와 R의 dynamic @8도 이 checkpoint에 합산하지 않는다.

닫힌 `title-layout`은 `frame/canvas`를 한 번만 저장하고, offset0인 기존 native title anchor, text/style/exact metrics, frame이 없는 native label recipe와 clearance를 보존한다. Clearance는 `{kind:'inferred',preferred,unclamped}` 또는 `{kind:'labels',gap}`다. 최종 계산된 offset이나 endpoint label pixel bounds를 원 의미로 저장하지 않는다. 현재 scale·frame으로 기존 label owner를 실행한 뒤 실제 nonempty label bounds/union을 제목 계산에 공급한다. 제목의 numeric `at`는 원 값을 scale로 사상하며, 원 font metrics/줄 분리·rotation·alignment를 보존한다.

`axisLabelState.js`의 기존 계산을 `normalizeAxisAnimationLayout`, `resolveAxisAnimationLabelBounds`, `prepareAxisAnimationLayoutPair`, `sampleAxisAnimationLayout`로 공유한다. 기존 label sampler는 이 함수를 호출한다. R의 동적 group은 같은 실제 occupied bounds 계약으로 확장하며 별도 pixel 보간을 도입하지 않는다.

검증은 네 side×inferred/relative에서 공개 native action의 다섯 시점과 정확한 geometry 대응, numeric at의 비선형 중간값, current-state 재기준, hard-break/hidden label, theme/default preferred와 labels없는 inferred 제목, getter/extra/잘못된 query closure 거부를 포함한다. 두 끝점 제목이 x50에서 정상이어도 중간 scale에서 x가 Canvas를 벗어나는 literal을 만들어 native와 똑같이 `guide-layout` fade로 처리한다. 위치를 잘라 맞추지 않는다. 새 owner는 100/92.57/100, 기존 label owner는 98.51/95.06/100이다.

다음 공개 연결에는 기존 theme preferred offset의 read-only owner 최소 추출, exact native dependency projection, 전체 endpoint proof와 offline/rebase/네 renderer/설치 소비자가 필요하다. 이 private 계산 통과를 공개 inferred title 완료로 집계하지 않는다. 처음 만든 fixture의 잘못된 `applyTheme({name})`와 flush+rotation 조합은 원 실패로 보존하고 실제 공개 계약에 맞게 수정했다.
