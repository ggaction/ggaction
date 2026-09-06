# W2 C2 — 범주형 sample/font 실제 간격

[전체 승인](../APPROVAL.md) 아래 #106을 수정한다. 기준 a8258c21에서 color/shape/line의48case 중24case가 큰font/stroke에서 겹친다. 구간색·width #105와 달리 categorical은 nominal symbol dimensions와 고정side pitch를 사용한다.

Categorical action은 실제 recipe의 line/circle/rect 및 mapped point-shape graphics를 원점 주위에 구성하여 canonical concrete bounds로 측정한다. Path miter도 포함하고 shape 크기 공식을 복제하지 않는다. Nominal symbolWidth는 layered recipe의 공통 center 위치 정의로 유지한다. 이 local per-item bounds를 `layout/legendItems.js`에 전달해 minimum nominal slot과 actual bounds의 union을 예약한다. Label은 slot 오른쪽+labels.offset이며 서로 다른 shape의 공통 column을 보존한다. Side pitch는 max(itemGap, actual symmetric sample height, label height), first item은 plot.y+52 이상이면서 visible title 아래 gap12를 확보한다.

Top/bottom도 같은 item grid가 실제 slot/label/title을 측정한다. Inline title이 큰 경우 title과 grid를 공통 높이 안에 중앙 정렬한다. Border는 모든 visible bounds의 union+padding을 사용하여 기존 left만의 floor/ceil 및 nominal background 계산을 제거한다. Final horizontal occupied align/offset/shared lanes, Canvas fit와 immutable lifecycle를 유지한다. Default stroke0.5/line2도 실제 간격에 반영하며 외관 차이는 reference/type/docs와 동기화한다.

Explicit legacy-bottom은 labels centerY=Canvas.height−28, title centerY=height−52를 보존하고 실제 sample slot 폭으로 단일 row를 배치한다. Hidden title은 공간에서 제외한다. Actual content와 border의 Canvas fit, plot bottom 이후 공간을 검사하고 고정 title row가 item row와 겹치면 오류다. 자동으로 anchor를 옮기지 않는다. 새 direct action이나 public parameter는 없다.

Public 변경 전에 네 literal primitive target을 작성·렌더링·확인했다: right-large-text, top-inline-line, left-mapped-shapes, legacy-bottom. Canvas2400×2000/margin600. 독립 graphics/order/pixels, 모든 mapped shape와 layered recipe, edges/title/border, create/edit/content/scale/Canvas/filter/remove 및 combined/shared lanes를 검증한다. Real Cars, package/browser, 전체 tests/coverage/current docs도 검증한다. W2 및 나머지 roadmap 완료는 별도다.
