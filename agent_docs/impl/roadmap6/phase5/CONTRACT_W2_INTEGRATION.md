# W2 — family×edge×lifecycle 통합

[전체 승인](../APPROVAL.md) 아래 기준e8c88162에서 W2 A/B/C의 전체 소비자 행렬을 검증한다. 새 geometry/API를 도입하지 않으며 기존 독립 primitive pairs를 좌표 기준으로 유지한다.

Color swatch, line-series, mapped shape, gradient, interval, size, stroke-width, opacity, categorical+size9종을 네 edge·border 유무에서 검사한다. Full은 create/focused editing/title hide-restore/content revision/remove-recreate/scale/Canvas/encoding replay 및 모든 edge 전환을 direct authoring과 대조한다. Basic은 공개된 생성 채널7종(color/line/shape/gradient/interval/size/combined)의 같은 생성 결과를 Full과 비교한다. Opacity/strokeWidth encoding과 lifecycle editor는 Basic에 없으므로 제외 사유를 명시한다.

Actual bounds의 Canvas fit과 original program 불변성을 검증한다. Collision/transition/order/large typography/legacy-bottom은 기존 focused matrices와 primitive evidence를 함께 대조한다. Stable 통합 검사에서 새 오류를 발견하면 재현·이슈·독립 개념 수정 후 재검증하며, 남은 실패가 있으면 W2를 닫지 않는다. Same canonical artifact의 Node/types/MCP/browser와 current catalog/docs를 확인한다.
