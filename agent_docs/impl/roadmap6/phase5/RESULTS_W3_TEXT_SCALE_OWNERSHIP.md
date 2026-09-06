# W3 annotation 선행 — source-owned Text scale ownership #115

기준: `79cdaf81a97ecad77409b7e0e699a986f49d793b`. [계약](CONTRACT_W3_TEXT_SCALE_OWNERSHIP.md), [전체 승인](../APPROVAL.md).

## 재현과 수정

[Source-owned text pollutes scale domains and blocks source rebinding](https://github.com/ggaction/ggaction/issues/115).
Point y=[1,3]을 other=[100,1000]으로 바꾸면 라벨 없는 차트는 [100,1000], source-owned Text가 있는 차트는
이전 y를 포함한 [1,1000] domain이 됐다. Source를 새 scale ID에 연결하면 자기 라벨을 다른 consumer로 보아
axis/grid rebinding도 거부했다. Attached Text의 직접 encodeY는 source relation을 보존한 채 inherited field를
덮어써 서로 다른 위치를 남겼다.

- `grammar/text.js`의 `isSourceOwnedText`를 단일 ownership 판별로 사용한다. Attached Text는 독립 scale/domain
  consumer가 아니며 inherited encoding은 provenance다. Source final item과 source-dependent plan이 실제 anchor를 소유한다.
- Scale consumer, direct mark/Canvas/detach plan, axis/grid inference 및 title/consumer 검증, guide rebinding과
  orphan cleanup, layered mark와 reference source 추론에서 stale label aliases를 제외한다.
- Grid placement는 domain consumer와 달리 source-dependent Text/leader도 관련 graphics로 포함한다.
  첫 normal에서 발견한 leader-before-grid regression을 이 relation으로 수정했다. 기존 approved graphic hierarchy와
  crossing-leader pixel/order assertions를 그대로 통과시킨다.
- Attached Text의 encodeX/Y는 child 실행 전 거부한다. Source의 위치를 바꾸거나 dx/dy를 사용한다.
  Explicit-data independent Text는 scale values와 genuine shared-guide constraint를 그대로 가진다.
- 새 API/데이터/registry를 만들지 않았다. 기존 signature와 source lifecycle을 유지하며 설명·오류 계약을 갱신했다.

## 검증 증거

- 구현 전 literal y=[280,40], label y=[272,32] target을 렌더·확인했다.
  `.artifacts/roadmap6-authoring/text-scale-owner-primitive.mjs` 및 PNG.
- Stable `test/contracts/source-text-scale.test.js`는 semantic/graphic/order/Canvas와 same-run decoded PNG가 일치한다.
  `.artifacts/test/png/charts/labels/source-scale/field-replacement/`의 public PNG도 직접 확인했다.
- Focused **37/37 PASS**. Point x/y, category/time, Rule/Rect, source/independent Text, 새/기존 scale,
  guide 추론·재연결·삭제, layered mark/reference 추론, source removal, resize/reverse, offsets, immutable errors,
  기존 Bar/Pie/Histogram semantic labels 및 Gapminder label leader hierarchy를 포함한다.
- 최종 normal **2998/2998 PASS**. 첫 normal의 네 실패는 하나의 grid/leader 배치 regression에서 파생됐으며
  source relation에 기반한 related-graphics 처리를 복구한 뒤 전체 suite가 통과했다.
- Canonical [package evidence](package-text-scale-results.json): SHA256
  `df315857b2633c726fd956e0c46485d394caa6db139a988ddc8bb04349750b2c`, **455 entries / 515432 packed / 2459248 unpacked bytes**.
  Installed Node/runtime/types/MCP/export PASS. Full gzip **256946**, Basic **140480**, SVG **6437**, modules **402/245/15**.
  모든 기존 ceiling 안이므로 한도를 변경하지 않았다.
- 동일 tgz Chromium **1/1 PASS**. 새 scale domain [100,1000], label y=[260,60], Canvas/SVG와 guide 생성·resize를 확인한다.
- 최종 coverage **95.56% lines / 92.60% branches / 99.03% functions**, **88 critical floors PASS**.
- Catalog/navigation/documentation closeout **21/21 PASS**.
- docs generate/preflight/build와 **125 built pages PASS**. Docs browser도 desktop search 및 전체 문서를
  320px, 390px, 768px에서 검증해 **PASS**했다.
- 로그: `.artifacts/roadmap6-authoring/phase5-text-scale-{focused,owner,primitive,order,normal,coverage,package,browser,docs-generate,docs-build,docs-browser,closeout}.log`.

## 남은 범위

Text datum 좌표와 createAnnotation, 공통 formatter/rotation, W4 theme, W5 fitting, Phase 6–11, 0.0.13 실제 릴리즈는 남아 있다.
이 변경은 새 annotation이 기존의 잘못된 scale ownership을 확대하지 않게 하는 선행 수정이다. Phase 5와 전체 릴리즈 목표는 진행 중이다.
