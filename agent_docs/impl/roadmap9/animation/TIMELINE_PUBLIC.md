# 공개 timeline 연결의 구체 결정

[remainingApproval](../AUTHORIZATION.json#remainingApproval)의 남은 공개 API·저장·시각 결정 승인을 재사용한다. 이 문서는 구현할 계약이며 Current는 아니다. 순수 schedule의 기존 검증은 [TIMELINE_ADAPTER](TIMELINE_ADAPTER.md)가 소유한다.

## 공개 형태

새 함수를 늘리지 않고 기존 `planTransition({from,to,options})`의 options에 `tracks`, `markers`, `composite`를 추가한다. `durationMs/easing`과 두 native endpoint는 그대로다. 아래 track은 각각 닫힌 union이다.

```text
GeometryTrack = {
  target: {ownerKey}, property: 'geometry', kernel: 'native-progress',
  keyframes: [{timeMs, value: number in [0,1], easingToNext?}], priority?
}
ItemStyleTrack = {
  target: {itemKey, role?},
  property: 'fill'|'stroke'|'opacity'|'strokeWidth',
  kernel: 'color'|'number'|'positive-scale',
  keyframes: [{timeMs, value: CSS color string or number, easingToNext?}], priority?
}
GuideStyleTrack = ItemStyleTrack with target: {guideKey}
Marker = {id, timeMs}
```

Color kernel은 fill/stroke에만, numeric kernel은 opacity/strokeWidth에만 허용한다. Opacity는 모든 authored keyframe에서0..1, strokeWidth는 nonnegative이며 positive-scale은 양수다. Structured/host-dependent paint를 keyframe 값으로 받지 않는다. 생략 easingToNext는 plan easing을 따른다. 겹침 기본오류와 명시 priority composite는 순수 owner의 규칙을 재사용한다.

`ownerKey`는 exact native semantic owner의 opaque key다. Mark의 typed item identity 또는 guide identity에서 한 번 계산해 sample decision의 readonly metadata로 제공한다. Raw graphic ID/path나 pixel은 selector가 아니다. Mark item은 기존 공개 검사에서 얻은 itemKey를 사용한다. 같은 key의 여러 primitive role이 있으면 role 생략을 추정하지 않고 거부한다. Geo feature paint는 whole-feature grain을 유지하고 dynamic part index를 selector로 받지 않는다.

## 준비와 sampling

Geometry progress는 선택한 owner의 기존 typed kernel 또는 명시 concrete fallback에만 전달한다. Graph와 partition의 group을 item별로 서로 다른 시각에 계산해 anchor/cell 관계를 깨지 않는다. Geo는 현재 camera/stream을, guides는 현재 raw tick/coordinate mapping을 재사용한다. 매 frame solver/layout/aggregation을 재실행하지 않는다. Enter/exit와 fallback도 같은 owner 시각을 따른다.

Style track은 실제 양 endpoint의 property와 compatible identity에 연결한다. 없는/모호한 target, 지원하지 않는 primitive/static policy는 준비 중 원자적으로 거부한다. Geo style과 Geo Text의 현재 의미도 같은 sampled 값으로 갱신해야 하며 concrete paint만 바꾸고 prepared proof를 예전 값으로 두지 않는다. 현재 geometry/style vector와 native source는 flat frame proof에 남고 이전 plan/controller를 잡지 않는다.

전체 schedule을0과 duration에서 평가한 결과는 원 native endpoint의 값과 일치해야 한다. 따라서 exact endpoint graphicSpec/scene과 원 색 문자열을 보존한다. Composite의 중간 overlay 값은 허용하되 최종 resolved endpoint를 검증한다. 같은 시각 keyframe과 gap/끝값 hold는 순수 schedule 규칙 그대로다.

## Player와 offline

`createAnimationPlayer`에 `onMarker(event)`를 추가하고 `seek(timeMs,{emit?})`의 기본은 false다. Event에는 id/timeMs/iteration과 실제 current frame을 전달한다. Controller가 sampling 원인·이전/현재 시각·iteration을 private adapter에 알리고, adapter가 marker state를 소유한다. 건너뛴 iteration도 forward crossing을 한 번씩 내보내되 callback 수를 기존 generated/work 한도로 준비 후 제한한다. Reverse/seek/dispose, reentrant control과 실패한 interrupt에서 이전 marker 수명을 보존한다. Callback은 저장하지 않는다.

Transition version3가 새 decision metadata와 계산 규칙을 고정한다. Timeline이 있으면 manifest에 `keyframe-schedule@1`을 요구하며 실제 serializable track/marker 값과 selector를 payload에 넣는다. Runtime indices/caches/callback/clock은 저장하지 않는다. 같은 owner가 endpoint identity·경계값·kernel을 재검증하고 fresh process에서 schedule을 재구성한다. 미발행 구 transition version은 기존 unknown-version 원칙대로 거부한다.

## 검증과 현재 상태

공개 연결은 아직 미구현이다. 독립 target 준비 owner는 구현했다. Native endpoint identity·exact track·guide vector·Geo feature pair에서 대상과 경계값을 준비하며, 모호한 role과 fallback primitive의 style 연결은 거부한다. Geometry는 semantic owner 단위이고 Geo paint는 양 endpoint에서 보이지 않는 feature도 whole-feature 단위로 연결한다. Raw CSS 문자열을 저장하고 수치 schedule과 binding은 private WeakMap에 둔다. 이 준비 owner는 공개 entry에서 아직 import하지 않는다.

Geo Text shared source가 동결되면 planner/sample/player/offline seam을 연결한다. 원안의 typed geometry·current-frame·native selection·네 renderer·offline·3Node 설치 및 marker lifecycle을 같은 public checkpoint에서 검증한다. 이 설계나 준비 검사만으로 AT42 또는 STEP077을 완료 처리하지 않는다.
