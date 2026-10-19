# Facet의 기존 위쪽 여백 공유

## 진행 상태

- [x] 현재 API 재현, 실제 부모·자식 크기와 최종 DOM 좌표 측정
- [x] 공개 primitive로 독립적인 목표 작성, SVG/PNG/DPR2/PDF와 plot ink 확인
- [x] 새 옵션이 현재 다섯 공개 경로에서 거부되는 baseline 증거
- [x] 구체적인 API·상태·배치·오류·검증 범위 확정
- [x] 검토 패키지를 원격 commit에 고정하고 직접적인 기존 사용자 승인 기록
- [ ] 공개 구현, 회귀·타입·예제·문서·패키지 검증
- [ ] 검증 checkpoint commit/push; 다음200-family 릴리즈까지 candidate 유지

이 문서는 구현 전 제안이다. 이슈: <https://github.com/ggaction/ggaction/issues/222>.
현재 라이브러리는 아래 옵션을 지원하지 않는다. 기존 동작·standalone unit의 경계 검증을 유지한다.

## 문제와 측정된 목표

136×262 unit의 plot은 `(40,43,40,200)`이고 위쪽 margin은43이다.
부모 제목과 헤더를 별도 예약하면 그 margin에 다시 더해진다.
7개 panel·plot gap22·명시적인 unit 범례 승격을 사용하는 현재 baseline은508×302,
plot Y82.609375다. Unit 안에 범례가 없는 별도 legacy-inference probe는658×304였다.
두 범례 경로는 기존에 서로 다른 계약이며 이 기능으로 혼동하거나 바꾸지 않는다.

목표는 부모508×262, 7개 plot `(40+62*i,43,40,200)`이다.
14개 입력 행·14개 bar·unit136×262·색상·축·범례·텍스트를 모두 보존한다.
13px 제목,10px 헤더와 축 레이블의 실제 DOM 경계는 다음과 같다.

| 요소 | 전역 Y 경계 |
| --- | --- |
| 부모 제목 |3..18|
| 첫 column header |20..32|
| 위쪽 Y endpoint label |36.5..48.5|

`baseline.mjs`는 기존 API만 사용한다. Title offset−2.953125,
header offset10.609375, Y label alongOffset0.890625는 먼저 측정해 고정한 기존 옵션이다.
제목·header 예약39.609375만 공유하므로 원래 unit top43을 줄일 이유가 없다.
`target.primitive.mjs`는403개의 명시적 primitive 호출로 된 고정 scene이며,
새 layout 함수·제안 API를 읽지 않는다. 기존 unit paint recipe에서 부모 slot의 Y·전체 높이만
독립적으로 지정했다. 공개 구현은 전체 graphicSpec·그리기 순서·같은 실행의 decoded pixels가
이 primitive와 정확히 같아야 한다. DOM·자동 RGBA 검사는 수행했지만 사람이 보거나 모델이
차트 pixels를 검사했다는 주장은 하지 않는다.

## 공개 API

기존 `facet`, `facetGrid`, `repeatCharts`, `editCompositionLayout`에만 다음 옵션을 추가한다.

```ts
topLane?: "stacked" | "shared";
```

```js
sourceUnit()
  .facet({ field: "panel", guides: { axes: "outer", legend: "shared" } })
  .editCompositionLayout({ spacing: "plot", gap: 22, topLane: "shared" });
```

- `stacked`는 기존 additive 배치다. 생성 시 생략/undefined/stacked의 저장 결과와 출력은 같다.
- `shared`는 `spacing:"plot"`인 facet/grid/repeat에서만 허용한다. Concat은 두 값 모두 거부한다.
- 편집에서 생략/undefined는 현재 정책을 보존한다. 명시적인 stacked가 공유 정책을 제거한다.
- 공유 중 canvas spacing으로 바꾸려면 같은 호출에서 `topLane:"stacked"`도 지정한다.
  생략한 정책을 몰래 초기화하지 않는다.
- null,boolean,number,임의 문자열,`"auto"`는 거부한다. 별도 action이나 unit 옵션은 추가하지 않는다.
- Cartesian·Polar·Parallel을 특별히 분기하지 않는다. 기존 facet/plot-spacing의 family 지원 범위는
  유지하며 최종 concrete 텍스트 경계로 검사한다. 기존 outer-axis 제한도 유지한다.

## 배치와 최종 검증

Shared에서는 자식 plot/Canvas 크기를 유지하고, 가장 바깥 top에 기존 child margin과 명시적인
parent padding을 그대로 사용한다. Title 높이와 첫 물리 행의 위쪽 header 예약을 그 margin에
다시 더하지 않는다. 내부 행 사이 header/gap 예약, 좌·우·아래쪽 header와 padding은 유지한다.
제목은 기존 title owner의 anchor/offset/line-height를 그대로 사용하고 header는 기존처럼 각
최종 translated plot에 붙인다. 기본 title/header 위치를 재해석하거나 폰트를 줄이지 않는다.

공유 모드에서만 모든 child snapshot·header·범례·제목 materialization이 끝난 뒤 검사한다.

1. 부모 title/subtitle과 바깥 top header의 backend-neutral logical text bounds를 수집한다.
2. Nested Canvas translation·회전·item별 text bounds를 기존 graphic-tree walker/textMetrics로 해석한다.
3. Canvas 밖으로 나가거나 plot 내부를 침범하거나 header/title·다른 최종 텍스트와 겹치면
   명확하게 거부한다. 빈 텍스트와 opacity0은 점유하지 않는다. 내부 title line-height처럼 같은
   owner 안의 명시적인 배치를 새 규칙으로 재해석하지 않는다.
4. 자식 standalone 축 검증과 기존 header/plot-spacing/공유 범례 검증은 그대로 유지한다.
5. 부족한 title/header 공간을 숨기거나 margin/Canvas를 늘려 통과시키지 않는다. 사용자가
   명시적인 padding·offset·font를 조절하거나 stacked로 되돌릴 수 있다.

공유 범례의 기존 외곽 예약·자동 부모 Canvas·필요한 전체 snapshot translation은 자기 owner가
계속 소유한다. Top 범례 등 다른 명시적인 guide가 추가 공간을 요구하는 기존 동작을 제거하지
않는다. 모든 owner의 이동 후 최종 경계를 확인한다. 목표의 오른쪽 승격 범례는 기존56px margin
안에 들어가므로 추가 translation·Canvas 확대가 없다.

## 상태와 소유권

- Canonical authoring intent는 기존 `compositionSpec.topLane?: "shared"` 한 곳에만 저장한다.
  Stacked는 field가 없는 상태다. 파생 layout에 실제 위치/예약을 다시 계산할 수 있으나 config에
  두 번째 mutable 정책·캐시·graphic ID alias를 저장하지 않는다.
- `core/vocabulary`가 닫힌 입력 vocabulary를 소유하고 `core/compositionState`가 facet/plot이라는
  canonical schema 관계를 검증한다. 저장 문서의 stacked/잘못된 조합은 거부한다.
- 순수 layout owner가 정규화·예약 정책과 rectangle 검사를 소유한다. Materialization owner가
  기존 tree walker로 최종 text records를 수집하고 pure 검사에 전달한다. Renderer는 변경하지 않는다.
- 기존 wrapped action이 명시적인 facet rematerialization을 실행한다. 반자동 compiler나 observer를
  넣지 않는다. 생성·layout/header/title/guide/source/scale/data/theme/textMetrics 편집이 같은 최종
  정책으로 수렴해야 한다. Facet source replay의 세 recipe 분기에 옵션을 보존한다.
- Editable persistence에 optional field만 확장한다. 과거 문서의 omission은 그대로 재현되며,
  editable export/import·불변 이전 프로그램·자식 identity/순서·retained source를 검증한다.

## 구현과 검증 계획

공개 구현은 이 검토 revision과 직접적인 standing approval을 기록한 뒤 시작한다.

- Pure layout: omission/stacked exact identity,shared coordinate budget,wrapped/grid rows,
  partial padding,closed values,spacing conflict/reset.
- 공개 lifecycle: shortest call,create/edit equivalence,mode reset,headers/title/guide/source/scale/data/theme/
  text-metric replay,persistence,불변 이전 프로그램과 실패 원자성.
- Bounds: upper endpoint를 보존하고 제목·header·옆 guide·밖으로 이동한 text·회전/여러 줄·충분하지
  않은 margin을 검증한다. 기존 standalone 작은 margin 거부도 그대로 확인한다.
- Facet/grid/repeat와 Cartesian/Polar/Parallel 대표 경로,ragged topology,shared legend 네 방향과
  authored/promotion/inference 경로를 검증한다. 데이터·자식 크기·의미를 바꾸지 않는다.
- 대표 공개 프로그램/독립 primitive의 exact graphicSpec·그리기 순서·SVG·decoded PNG/DPR2,
  PDF와 Chromium/Firefox/WebKit 비교를 수행한다. 차트 pixels를 눈으로 검사하지 않는다.
- 모든 기존 공개 예제의 default semantic/config/graphic/SVG를 baseline revision과 정확히 비교한다.
- Types(Full/Basic),canonical current contracts,예제,reference/action cards,LLM payload,문서 생성·링크·
  모바일·접근성,실제 packed-package consumer와 전체 필수 suite를 완료한다.
- 기존 package/card/bundle ceiling을 실제로 넘으면 기존 최소 단위 정책과 실측 근거만으로
  필요한 한도를 갱신하고 이전 한도 실패를 보존한다. 시각/수치 acceptance 오차를 늘리지 않는다.
- 검증 checkpoint는 commit/push한다. #222는 candidate 검증 사실을 게시하고 정기 통합 전까지
  열린 상태를 유지한다. 다음에는 #223을 별도의 conceptual checkpoint로 진행한다.
- 학교 번역 모델/API 호출은 이 라이브러리 작업에 사용하지 않는다. 1250-family checkpoint 이후
  남은250개 목표는 유지한다. 다음 정기 package/docs/dataset/viewer 릴리즈는1413families다.

## 재현

구현 전 검토 commit checkout과 설치된 개발 의존성을 사용한다.

```sh
node agent_docs/impl/facet-shared-top-lane/baseline.mjs
node agent_docs/impl/facet-shared-top-lane/prepare-target.mjs \
  .artifacts/test/png/review/facet-shared-top-lane/replay \
  .artifacts/test/png/review/facet-shared-top-lane/replay/target-proof.json
```

Committed primitive는 생성 내용과 같을 때만 재사용하며 덮어쓰지 않는다.
`TARGET_EVIDENCE.json`이 최초 숫자·SVG/PNG/DPR2/PDF hash·다섯 baseline 거부 경로를 기록한다.
기존 private probe의 실패·다른 범례 경로도 그 기록에 구분해 보존했다.
