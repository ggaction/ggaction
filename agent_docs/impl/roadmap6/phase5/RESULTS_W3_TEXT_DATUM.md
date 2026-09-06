# W3 annotation 기반 — independent Text datum position 결과

## 구현

- Independent Text의 `encodeX`/`encodeY`가 field 또는 datum 중 정확히 하나를 받는다. Shared position datum
  grammar가 quantitative/temporal/nominal 값을 정규화하고 일반 scale consumer로 automatic domain에 포함한다.
- x/y/text 중 field가 하나라도 있으면 dataset row grain을 사용하며 constant position을 broadcast한다.
  세 encoding이 모두 상수면 빈 데이터와 다중 행 데이터 모두 정확히 한 Text item을 만든다.
- Field↔datum 재할당은 stale branch를 제거하고 grain, scales, graphic을 다시 계산한다. Source-owned Text의
  #115 indirect ownership과 직접 position 거부는 유지한다.
- Public declaration에 일반 이름 `DatumPositionEncodingOptions`를 추가하고 기존
  `RulePositionEncodingOptions`는 호환 alias로 유지했다. Annotation 전용 dataset/schema/config는 추가하지 않았다.

## 시각·회귀 검증

- 구현 전 literal primitive target을 렌더하고 직접 확인했다:
  `.artifacts/roadmap6-authoring/text-datum-primitive.{mjs,png}`.
- `test/contracts/text-datum-position.test.js`가 480×320, margin 40, [0,10] scales의 datum (8,9),
  dx=8, dy=-16을 (368,48)에 두는 literal/public graphic, Canvas 호출과 decoded PNG parity로 고정한다.
  Public PNG도 직접 확인했다.
- Focused Text position/source/domain/type suite **27/27 PASS**. Quantitative/category/time, empty/multi-row,
  mixed binding, field content, shared domain, resize, immutable error를 포함한다.
- 전체 suite **3004/3004 PASS**. Coverage **95.56% lines / 92.59% branches / 99.04% functions**,
  **88 critical floors PASS**.

## 배포 경계

- [Canonical package evidence](package-text-datum-results.json): SHA256
  `e6996684406f9e689dfeed6d3d1867357f53604f2cfff0a84d0db0746a4700b2`,
  **455 entries / 515865 packed / 2461114 unpacked bytes**.
- 같은 tgz의 installed Node/runtime/types/MCP/export와 Chromium **1/1 PASS**.
  Full/Basic/SVG gzip은 **257216 / 140517 / 6437 bytes**, modules **402/245/15**다.
- Full gzip이 이전 257000B 한도를 216B 넘어 승인 범위에서 **258000B**로 조정했다.
  Basic 141000B, SVG 25000B와 package 455/516000/2500000 한도는 유지한다.
- Docs generate/preflight/build와 **125 built pages PASS**. Desktop search 및 전체 문서의
  320px, 390px, 768px browser 검증도 PASS했다.
- Catalog/navigation/documentation closeout **21/21 PASS**.
- 로그: `.artifacts/roadmap6-authoring/phase5-text-datum-{focused,normal,coverage,package,bundle,browser,docs-generate,docs-build,docs-browser,closeout}.log`.

## 남은 범위

`createAnnotation` facade와 공통 formatter/rotation, W4 theme, W5 fitting, Phase 6–11,
0.0.13 실제 릴리즈는 남아 있다. 이 하위 기반만으로 W3, D13, F14 또는 Phase 5 완료를 주장하지 않는다.
