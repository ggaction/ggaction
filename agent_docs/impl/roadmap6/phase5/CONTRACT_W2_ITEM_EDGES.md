# W2 C2 — 항목 범례의 공통 content/edge 배치

[전체 승인](../APPROVAL.md) 아래 C2를 진행한다. 범위 전체는 [CONTRACT_W2.md](CONTRACT_W2.md)의 family×edge matrix이며 이 첫 구현은 interval과 재사용 가능한 item layout owner다. Size/width/combined 등 남은 family도 같은 owner로 이어서 수렴한다.

Interval은 createLegend/editLegend/editLegendLayout에서 네 position과 명시 layout:"edge", horizontal edge의 align/direction/columns/titlePosition을 지원한다. legacy-bottom은 categorical 전용이다. Side는 vertical single column, center align, titlePosition top이며 columns>1/다른 align을 오류로 알린다. Top/bottom은 기본 horizontal/all columns, 선택 vertical fill/columns와 top 또는 left title을 지원한다. ItemGap의 기존 side pitch28과 horizontal cell gap을 유지한다. Symbol/text/border defaults와 right x=plot.right+offset30, title y=plot.y+20, item y=plot.y+52+index*28을 유지한다.

공통 pure item layout은 먼저 text/symbol grid를 측정하고 edge에 배치한다. Left는 전체 visible content 폭을 측정해 plot.left-offset 바깥에 두며 labels는 symbol 오른쪽에서 읽는다. Horizontal은 foreground 전체 폭을 plot에 left/center/right align하고 top은 plot.top-offset 위, bottom은 plot.bottom+offset 아래에 배치한다. Top title과 grid 사이 gap12, inline title과 grid 사이 gap20을 사용한다. Hidden title은 측정/border/inline width에서 제외한다. Title visibility 자체는 config에 보존한다.

기존 gradient/opacity의 숨긴 title bounds 오류 #94도 함께 바로잡는다. 특히 inline opacity는 hidden title width/gap를 제외하고, 보이지 않는 title 때문에 Canvas resize가 실패하지 않도록 한다. 실제 visible content 또는 title 복원이 넘치면 기존 immutable error를 유지한다.

Multi-block lane은 config.position을 읽고 interval border를 group bounds에 포함한다. Whole-target content 교체도 최종 interval position/layout options를 보존한다. Renderer는 완성된 graphics만 읽는다. 다른 family의 layout이나 scale-family structural transition을 이 부분 결과만으로 완료로 기록하지 않는다.

Primitive target: Canvas1000×700, margins L/R240 T/B200, 두 interval <5/≥5, width14/height12/label offset8, font12 title13/600. 독립 좌표와 primitive를 먼저 렌더링한 뒤 public four-edge 결과를 대조한다. Final gate는 normal/coverage, current/type/docs/cards, representative PNG, real-data matrix, installed tarball과 동일 browser artifact를 요구한다.

기존 interval의 side align left/right는 받아 저장만 하고 실제 좌표에는 적용하지 않았다. C2 item-side 정책에서는 이 무효 값을 거부하고 center를 canonical 값으로 검증한다. 기존 transition style 회귀의 redundant align:left는 center로 migration하고, source gradient의 align:left가 interval로 넘어갈 때는 destination normalizer를 mutation 전에 호출해 명시적으로 거부한다. 실제 위치를 바꾸지 않는 값의 보존을 유효한 layout 지원으로 간주하지 않는다. 전체 family transition/side alignment 확장은 후속 C2에서 다룬다.

## Stroke-width 항목 배치

두 번째 변경은 stroke-width에 같은 edge/grid 계약을 적용한다. Size와 결합 범례는 후속 변경으로 남긴다. Width scale의 linear/log/pow/sqrt/symlog mapping, count5, line length32, labels offset12, 기존 font/color, side pitch32를 유지한다. Right title/item origin은 공통 item layout의 plot.y+20/+52로 통일한다(이전 +28/+62). Position/edge/align/direction/columns/titlePosition/offset/itemGap과 label/title styles 및 border를 create/edit 모두 지원한다. Side의 single column/vertical/center/top 제한은 interval과 같다. Per-sample 실제 stroke extent를 bounds에 포함하고 grid row는 최대 stroke width를 수용한다. 새 스타일 shorthand나 symbol recipe는 추가하지 않는다.

Primitive를 public 구현 전에 `.artifacts/roadmap6-authoring/stroke-width-edge-targets.mjs`로 작성·렌더링한다. Canvas1000×700, margin L/R240 T/B200, width samples2/10 및 label0/10, title m이다. Explicit count2인 네 방향 목표와 create/edit/Canvas/scale/filter/content replacement의 동일 최종 결과를 검증한다.

공통 side item 배치는 큰 sample/label/title이 기본 anchor 사이에 들어가지 않으면 첫 item을 내려 title 아래 gap12를 확보한다. Default dimensions의 기존 literal anchors는 유지한다. Width의 Basic 지원은 기존 registrar/encoding 경계상 해당 없음이며 이번 구현은 Full이다.

## Size item owner와 standalone 네 방향

Size materializer도 공통 item owner에 연결한다. 실제 maximum diameter를 측정하고, 최소 sample slot32에 circle을 중앙 정렬한다. Labels.offset은 다른 item family와 같은 sample slot 오른쪽 간격으로 통일하며 default12다(이전 center-relative28). 보통 radius≤16인 default는 기존 sample-label 상대좌표를 유지하고 큰 circle에서는 slot을 늘려 라벨이 원에 겹치지 않는다. Explicit offset의 기준 변경은 current/types/docs와 regression에 명시한다. Side title/item origin은 공통 +20/+52, default pitch40이다. Font/color/count5/area mapping/formatter를 유지한다.

Full/Basic standalone create의 네 방향과 Full editing/border/grid 지원을 먼저 검증한다. Categorical+size side는 각 owner가 독립 content를 만든 뒤 기존 lane에서 결합하고, size가 categorical layout의 private `.size` 좌표를 읽던 의존성을 제거한다. Combined top/bottom은 뒤이은 group layout 통합으로 남기며 이 부분 결과만으로 C2를 완료하지 않는다. Shared appearance도 size label offset12를 기준으로 한다.

Primitive target: Canvas1000×700, L/R240 T/B200, samples radius2/6, labels0/10, count2, title m. 네 edge를 public 구현 전에 렌더링한다. Size의 실제 circle bounds와 visible texts를 검증하고 숨긴 title은 제외한다. 기존 arbitrary standalone +78/+112 위치는 공통 anchor로 대체한다.

## Combined horizontal group

[#97](https://github.com/ggaction/ggaction/issues/97)의 생성 거부/편집 겹침을 수정한다. Categorical+size는 edge 네 방향을 공유하며 legacy-bottom 결합은 오류다. Horizontal에서 categorical의 position/align/direction/columns/titlePosition/offset/itemGap을 두 content의 effective geometry로 사용한다. Size의 자체 config는 보존해 categorical 제거 후 복원하며 count/label slot offset/자체 border/text visibility는 size owner에 남는다. Shared title edit의 기존 categorical title 의미는 유지한다.

Top/bottom은 categorical→size 순서, measured occupied block 사이 gap40으로 배치하며 폭을 넘으면 기존 horizontal lane처럼 다음 outward row로 wrap한다. 각 block의 top title과 element anchor를 정렬하고 inline title은 자기 content와 함께 이동한다. 두 content와 retained size background를 union하고 categorical border를 한 outer border로 다시 계산한다. 하나의 combined group만 있으면 outer occupied bounds를 plot width에 align하고 plot edge와 offset 간격을 확보한다. 여러 group의 edge lane에서는 이 결합 결과를 쪼개지 않고 atomic content로 배치한다. 다른 단독 family의 기존 multi-lane 정렬 계약은 유지한다.

Hidden title/실제 sample stroke/border를 포함한 최종 bounds를 검증한다. Group 내부 배치와 외부 lane 배치 모두 pure layout plan을 만든 뒤 wrapped rematerializer가 graphics를 옮긴다. Full/Basic 생성, Full 편집/content/remove/Canvas/scale/filter, nested border와 multi-lane, exact primitive/pixels/package/browser를 검증한다. 전체 C2의 다른 family collision/transition은 이 변경으로 완료 처리하지 않는다.
