# W2 C2 — 구간색·선 굵기 sample stroke spacing 결과

[계약](CONTRACT_W2_ITEM_STROKE_SPACING.md)과 [전체 승인](../APPROVAL.md)에 따라 #105를 수정했다. 기준 d3eb4ca0에서80case 중32overlap을 재현했다. 이번 범위인 interval/width의8case는 수정 후0이며 categorical24case는 #106으로 남긴다. W2와 Roadmap6 전체 완료를 뜻하지 않는다.

## 변경

`layout/legendItems.js`가 local stroke bounds를 먼저 측정하고 nominal minimum slot과 union한다. Swatch는 width/height+strokeWidth, line은 양끝 half-stroke와 full stroke height를 예약한다. Sample origin을 slot 안으로 옮기고 label은 slot right+offset에 두어 동일 column을 유지한다. Side pitch/title gap와 horizontal grid가 같은 extent를 사용하고 기존 border/Canvas/final lane validation을 보존한다. Size의minimum32 slot, area/scale mapping, renderer와 trace 경계는 바꾸지 않는다.

기본 stroke도 포함하므로 interval gap7.75→8, width의32px sample에 thickest stroke extent를 추가한다. 독립 four-edge references, Cars weighted-rule과 Gapminder discretized-color의 old geometry를 명시적으로 갱신했다. Shared side lane의 최대 stroke8에서는 label column604→608이다. 실제 geometry의 부동소수점을 반올림하지 않고 literal dimension 산술로 reference를 작성했다.

## 검증 증거

- Public 변경 전 interval-right와 width-top primitive를 작성·렌더링·육안 확인했다. 이후 exact graphicSpec/drawing order 및 same-run decoded PNG pair PASS.
- Focused25/25: 새72case matrix(Full interval/width, Basic interval), 네 edge와 title top/inline, 큰font/stroke, border, hidden/restore, style/count/filter/scale/Canvas/content/remove replay 및 shared-lane geometry/immutable overflow. Basic에 없는 editors는 적용하지 않는다.
- Full normal2909/2909 PASS. 최초9fail은 기존 interval/width geometry references와 그 간접 계약이었으며 새계약 산술로 수정한 뒤 전체 재실행 PASS.
- Coverage: lines95.45%/branches92.30%/functions99.03%, critical floors86개 PASS.
- Cars finite392rows/24borderedcases PASS. Width series는 Weight_in_lbs로 grouping하여 series별 굵기 일관성을 유지했다. 초기 Origin grouping은 한 series 안의 다른 width 때문에 올바르게 거부되어 probe를 수정했다. Filter+Canvas 재배치도 direct authoring과 수렴한다.
- PNG runner8/8 PASS: Gapminder3, Cars weighted rule1, Cars multi-legend2, size four-edge4variants와 새stroke2variants(총12variants). 별도 interval/width four-edge8variants도 focused에서 PASS.
- Canonical staged tgz의installed Node/type/export/bundle consumer PASS. 같은 tgz의Chromium1/1에서 interval gaps[8,8,8,8],width gaps[12,12,12,12], Canvas/SVG와 기존 package probes PASS.
- Docs generate/preflight/Jekyll build/built125pages PASS. Changed color-transitions PNG도 육안 확인했다.
- Catalog/navigation/documentation closeout21/21 PASS.

## 패키지

[측정](package-item-stroke-spacing-results.json): SHA256 ea409de44021b4292e02f0695fed56d8e45b20a633d46a12ce11b159ec796818. Entries452,packed510254,unpacked2438513bytes. GzipFull254192/Basic140339/SVG6437bytes. 기존 한도 내이며 추가 budget 변경은 없다. Version0.0.12 개발 checkpoint이며 최종0.0.13 release artifact는 아니다.

Ignored 상세 로그와 audit/target은 `.artifacts/roadmap6-authoring/phase5-item-stroke-*`, `phase5-item-spacing-{baseline,after}.json`, `*-stroke-target.png`에 있다. 해당 artifacts는 stable tests의 의존성이 아니다. Categorical 큰font/stroke/shape, legacy-bottom, opacity recipe type parity와 W2 전체 통합, 이후 W3/W4/W5·Phase6–11·0.0.13 release는 남는다.
