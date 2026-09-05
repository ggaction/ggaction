# W2 C2 — 항목 범례의 공통 content/edge 배치

[전체 승인](../APPROVAL.md) 아래 C2를 진행한다. 범위 전체는 [CONTRACT_W2.md](CONTRACT_W2.md)의 family×edge matrix이며 이 첫 구현은 interval과 재사용 가능한 item layout owner다. Size/width/combined 등 남은 family도 같은 owner로 이어서 수렴한다.

Interval은 createLegend/editLegend/editLegendLayout에서 네 position과 명시 layout:"edge", horizontal edge의 align/direction/columns/titlePosition을 지원한다. legacy-bottom은 categorical 전용이다. Side는 vertical single column, center align, titlePosition top이며 columns>1/다른 align을 오류로 알린다. Top/bottom은 기본 horizontal/all columns, 선택 vertical fill/columns와 top 또는 left title을 지원한다. ItemGap의 기존 side pitch28과 horizontal cell gap을 유지한다. Symbol/text/border defaults와 right x=plot.right+offset30, title y=plot.y+20, item y=plot.y+52+index*28을 유지한다.

공통 pure item layout은 먼저 text/symbol grid를 측정하고 edge에 배치한다. Left는 전체 visible content 폭을 측정해 plot.left-offset 바깥에 두며 labels는 symbol 오른쪽에서 읽는다. Horizontal은 foreground 전체 폭을 plot에 left/center/right align하고 top은 plot.top-offset 위, bottom은 plot.bottom+offset 아래에 배치한다. Top title과 grid 사이 gap12, inline title과 grid 사이 gap20을 사용한다. Hidden title은 측정/border/inline width에서 제외한다. Title visibility 자체는 config에 보존한다.

기존 gradient/opacity의 숨긴 title bounds 오류 #94도 함께 바로잡는다. 특히 inline opacity는 hidden title width/gap를 제외하고, 보이지 않는 title 때문에 Canvas resize가 실패하지 않도록 한다. 실제 visible content 또는 title 복원이 넘치면 기존 immutable error를 유지한다.

Multi-block lane은 config.position을 읽고 interval border를 group bounds에 포함한다. Whole-target content 교체도 최종 interval position/layout options를 보존한다. Renderer는 완성된 graphics만 읽는다. 다른 family의 layout이나 scale-family structural transition을 이 부분 결과만으로 완료로 기록하지 않는다.

Primitive target: Canvas1000×700, margins L/R240 T/B200, 두 interval <5/≥5, width14/height12/label offset8, font12 title13/600. 독립 좌표와 primitive를 먼저 렌더링한 뒤 public four-edge 결과를 대조한다. Final gate는 normal/coverage, current/type/docs/cards, representative PNG, real-data matrix, installed tarball과 동일 browser artifact를 요구한다.

기존 interval의 side align left/right는 받아 저장만 하고 실제 좌표에는 적용하지 않았다. C2 item-side 정책에서는 이 무효 값을 거부하고 center를 canonical 값으로 검증한다. 기존 transition style 회귀의 redundant align:left는 center로 migration하고, source gradient의 align:left가 interval로 넘어갈 때는 destination normalizer를 mutation 전에 호출해 명시적으로 거부한다. 실제 위치를 바꾸지 않는 값의 보존을 유효한 layout 지원으로 간주하지 않는다. 전체 family transition/side alignment 확장은 후속 C2에서 다룬다.
