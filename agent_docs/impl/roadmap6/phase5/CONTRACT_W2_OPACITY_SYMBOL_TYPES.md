# W2 — opacity symbol TypeScript parity

[전체 승인](../APPROVAL.md) 아래 #107을 수정한다. 기준374b07c9에서 public runtime은 단일 `{type?:"point",radius?,fill?,stroke?,strokeWidth?}`를 지원하지만 선언은 line/swatch/layered만 허용하여 createLegend/editLegend/editLegendSymbols/createGuides 네 경로에서TS2353을 재현했다. Runtime은radius13/guideRadius9로 성공한다.

공통 LegendSymbolRecipe union에 기존 opacity 형태를 추가한다. Type은 optional point만, radius/strokeWidth는number, fill/stroke는string이다. Positive radius와 finite/non-negative 제약은 기존 runtime validator가 소유한다. Categorical point layer의 size와 opacity radius를 혼동하지 않는다. Family 선택에 따른 부적합한 recipe 거부는 기존 runtime 검증을 유지한다. Runtime/API action/geometry 변경은 없으며 새 시각 목표는 필요하지 않다.

Stable strict TypeScript positive/negative case와 installed artifact consumer로 생성·편집·집계 경로를 검증하고 docs/current contract를 동기화한다. Coverage source는 변경하지 않으므로 직전374b07c9의 source gate를 재사용하되 normal/consumer/docs는 현재 파일로 검증한다.
