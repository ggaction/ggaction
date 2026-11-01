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

## 공유 theme 읽기 owner

부모가 채택한 구체 경계에 따라 `actions/theme/definition.js`의 pure normalize/resolve 본문을 `theme/definition.js`로 이동했다. 기존 `resolveEffectiveThemeFrame(state)`, `resolveEffectiveThemeTokens(state)`, `axisThemeOffset(state,component)`만 같은 owner로 옮기고 기존 내부 action state 경로는 named re-export를 유지한다. Mutation/typography/wrapped action·public exports는 그대로다. Native materialization이 action 모듈을 import하거나 token 검증을 복제하지 않는다. Source boundary는 이 정확한 파일의 paint/validation 의존만 허용하고 일반 theme 권한을 넓히지 않는다.

Full/Basic × light/dark/custom × theme-first/axis-first 12개 실제 공개 차트의 guide/config/graphics/theme/trace와 잘못된 theme 4개의 오류를 기존 allocation-independent 비교 owner로 대조했다. 원시 JSON은 실행마다 생성된 dataset/item identity 때문에 다르며, 해당 identity만 정규화한 의미·graphics·trace와 오류는 모두 동일하다. 기존 theme palette/spacing/state/defaults의 실제 공개 검사로 공유 definition의 100/100/100을 유지했다. 최초 좁은 subset의 palette 분기 미도달을 보존하고 기존 palette owner 회귀를 함께 실행했다. 패키지 module 개수 증감은 0이다. 새 public title admission은 다음 checkpoint다.

## 공개 고정 라벨 종속 제목 @9

Root가 R의 dynamic @8와 이후 union할 @9를 채택했다. 공유4는 수정하지 않고 native projection → guideTracks normalize/match/prepare/sample wrapper만 연결했다. Title recipe의 exact current label states를 같은 namespace+axis owner의 siblings와 검증한다. Label collection 누락·직접 수정은 title도 guide-edited이며 strict restore에서 누락/서로 다른 label recipe를 거부한다. 표시문자열 변경은 appearance fade, native 중간 fit 실패는 guide-layout다. 기존 frameProvenance의 guides vector를 그대로 보존해 양방향 재기준과 offline 같은 time equality를 유지한다.

테마 읽기 owner12b8f6e8a를 재사용한다. 수치 offset title/Polar/Parallel은 기존 owner에 남긴다. maxWidth/responsiveResult/사용자 지정 lineHeight 및 empty raw tick list는 아직 title-layout 밖이다. R의 native dynamic group interface로 이어야 하며, hidden display label과 hard-break는 고정 recipe 안에서 보존한다. @9가 전체 dynamic @8 구현을 포함했다는 뜻은 아니다. Inferred legend clearance/implicit lanes와 전체077는 계속 미완료다.
