# W2 C2 — Continuous legend option parity

[전체 승인](../APPROVAL.md) 아래 #103을 수정한다. 기준 `980e9b2b1a9c4f4823ca87be4fc16d182118d36a`의 21-case audit는 side alignment 무시8cases, titleStyle.offset 무시6cases, gradient top title edit 거절2cases를 재현했다.

1. Gradient/opacity의 side position은 기존 categorical/item legend와 동일하게 align center만 허용한다. Omission default center를 유지한다. Horizontal의 left/center/right는 계속 지원한다. Non-center horizontal legend를 side로 옮길 때 align center를 명시하지 않으면 오류다. 저장된 caller intent를 자동 제거하지 않는다.
2. 모든 legend titleStyle은 color/fontSize/fontFamily/fontWeight만 받는다. Offset은 labels의 간격 옵션이다. Continuous shared title normalizer로 gradient/opacity/interval/size/width와 편집의 검증을 통일한다. Categorical의 기존 동일 정책을 유지한다.
3. Gradient editLegend와 editLegendLayout은 titlePosition top을 받는다. Left는 create와 동일하게 거절한다. 지원되는 최종 상태가 생성/편집 경로에 따라 달라지면 안 된다.

이는 validation과 route parity 수정이며 유효한 기존 geometry/default/renderer에는 변화가 없다. 기존 primitive/public 쌍을 회귀 검증하며 새로운 시각 target은 필요하지 않다. Full/Basic 지원범위, create/focused edit/aggregate/content/scale/Canvas replay와 거절 atomicity, installed package/types/browser, docs를 함께 검증한다. 큰 symbol/font 내부 간격과 W2 전체 통합 및 후속 roadmap/release는 남는다.
