# W2 C2 — 범주형 recipe·shape·font spacing 결과

[계약](CONTRACT_W2_CATEGORICAL_SPACING.md)과 [전체 승인](../APPROVAL.md)에 따라 #106을 수정했다. 기준 a8258c21의 categorical48case 중24overlap을 제거했다. Interval/width까지 포함한 기존80case audit은 errors0/overlap0이다. W2와 전체 Roadmap6 완료는 별도다.

## 변경과 원인

기존 categorical owner는 nominal width/height와 고정 side pitch를 사용하여 stroke40 swatch의 실제 label gap이−12px, width60 line의 gap이−20px였다. Mapped path와 miter는 nominal radius slot을 더 크게 벗어났다. 새 owner는 canonical point-shape graphics와 concrete bounds로 각 recipe layer의 local extent를 측정하고 공통 item layout에 전달한다. 모든 sample을 포함한 minimum slot, 공통 label column, 실제 높이 기반 side pitch/title gap12와 horizontal grid를 사용한다. Border도 visible bounds+padding으로 수렴한다. 중복 categorical 좌표 분기를 제거했고 renderer와 semantic/trace 경계는 보존했다.

Default stroke도 공간을 차지한다. 독립 references의 swatch half-stroke0.25, line half-width, shape area/path 좌표와 복합 block 간격을 갱신했다. Literal assertion은 유지하며 실제 좌표를 반올림하지 않았다. Offset 차이 invariant만 부동소수점 허용오차1e−9를 적용한다. Legacy-bottom은 labels=Canvas.height−28/title=height−52를 유지하면서 title/item 겹침, plot 침범과 Canvas overflow를 오류로 처리한다. Hidden title은 공간을 차지하지 않는다.

## 검증

- Public 변경 전에 right-large-text/top-inline-line/left-mapped-shapes/legacy-bottom 네 primitive target을 작성·렌더링·확인했다. Stable contract4종은 exact graphicSpec/order/same-run decoded PNG 일치. Top dashed line target의 초기 dash[6,4]는 실제 기본 계약[8,4]로 바로잡았으며 배치는 동일하다. 최종 top-inline-line PNG와 재생성 Cars multi-legend 문서 이미지도 육안 확인했다.
- 새 unit5개: Full/Basic 240case recipe×edge×title×font×border, all12mapped-shape×4edge×2stroke=96case, style/content/filter/scale/Canvas/remove/hidden-restore, combined size/shared opacity 및 immutable legacy overflow PASS. Shape scale probe는 domain별 distinct shapes, line probe는 series당2point를 제공한다. 유효하지 않은 초기 probe를 runtime 오류 회피로 허용하지 않았다.
- Guide/content focused383/383 PASS. 전체 normal2915/2915 PASS. 최초62fail과 이후5fail은 기존 nominal 좌표/오류 기대값이며 독립 산술로 갱신 후 재실행했다.
- Coverage lines95.46% / branches92.35% / functions99.02%; critical floors86개 PASS. 기존 기준을 낮추지 않았다.
- Cars finite392rows, color/line/shape/layered48case PASS. 네 edge와 horizontal inline/top title, 큰font/stroke, filter+Canvas authoring convergence를 검사했다.
- PNG49/49 PASS: Cars Density/Histogram/Line/Scatterplot/Multi-legend, Jobs grouped bar, Polar arcs/line-radar의 base와 variants. Primitive/public 비교 및 numeric assertions를 함께 유지한다.
- Installed canonical package의 Node/TypeScript/export/bundle consumer PASS. 동일 tgz Chromium1/1 PASS: Full/Basic categorical color/line 네 edge의 actual label gaps8/10, Canvas/SVG와 기존 consumer lifecycle 검증.
- Docs generate/preflight/Jekyll build 및 built125pages PASS. Categorical gap/default top itemGap24와 combined 모든 edge 지원을 문서에 동기화하고 stale side-only 설명을 제거했다.
- Catalog/navigation/documentation closeout21/21 PASS.

## 패키지와 남은 범위

[Canonical artifact](package-categorical-spacing-results.json): SHA256 `722d79da3c8daa31a86e3ed03ab78e7e01aed9881b81961fbb20743dca104cb4`, entries452/packed509106/unpacked2432197bytes. Browser gzip Full253346/Basic139625/SVG6437bytes. 기존 한도 안이며 추가 budget 변경은 없다. Version0.0.12 개발 checkpoint로서 최종0.0.13 release artifact가 아니다.

Ignored evidence: `.artifacts/roadmap6-authoring/phase5-categorical-*`, `verify-categorical-spacing-{cars,package}.mjs`, `package-categorical-spacing/`; stable tests는 이 경로에 의존하지 않는다. Opacity symbol type/runtime parity와 W2 전체 family×edge×lifecycle 통합, W3–W5 및 Phase6–11, 실제0.0.13 release는 남아 있다.
