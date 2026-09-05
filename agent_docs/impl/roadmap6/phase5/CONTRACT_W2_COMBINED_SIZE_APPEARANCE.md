# W2 — combined size appearance의 edge 독립성

[전체 승인](../APPROVAL.md) 아래 #109를 수정한다. 기준213b7eac에서 신규 combined size의 inheritAppearance가 left 또는 explicit typography 존재 여부에 따라 바뀐다. Left는title#334155, 다른 edge는#0f172a이며 edge 이동이 이 flag를 유지해 직접 생성과 달라진다.

새로 생성한 categorical+size는 모든 edge에서 categorical의 labels/titleStyle을 공유한다. 기존 left 및 explicit typography의 자연스러운 그룹 상속 계약을 네 방향으로 통일한다. Standalone size의 고유 default#0f172a 및 기존 standalone에서 가져온 저장된 style/config는 유지한다. Size label offset은 별도 default12를 보존하며 caller가 지정한 offset은 기존 계약을 따른다. Partial text editing은 기존 실제 스타일을 바탕으로 병합한다. Renderer/geometry는 변경하지 않고 right/top/bottom 신규 combined의 size title 기본색만#334155로 맞춘다.

오직 position 조건을 제거하여 기존 false/true flag의 생성을 통일한다. 임의로 side 이동 시 color를 재설정하지 않는다. 별도 inherited/explicit style lifecycle는 유지한다. 변경 전 primitive title-color target을 작성·render한 뒤 same-run graphic/order/PNG와9family 통합 audit, explicit/partial style·retained standalone·hidden/restore·Canvas/scale/encoding/edge replay를 검사한다. Docs/type/current contract와 installed package를 동기화한다.
