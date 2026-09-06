# W3 D — createAnnotation 결과

## 구현

- `createAnnotation`은 세 anchor branch를 구분하는 create-only facade다. Mark anchor는
  `createMarkLabels`의 final-item grain과 source lifecycle을 그대로 사용한다. Data anchor는 명시적/current/유일한
  complete Cartesian layer의 data, coordinate, x/y scale, field type과 temporal unit을 공유하되 독립 Text로 생성한다.
  Plot anchor는 [0,1] x/y와 일반 named linear scale `<id>-x`, `<id>-y`를 사용한다.
- 필수 constant text, format, Text appearance와 target-free optional label layout을 하위 `createTextMark`,
  `encodeText`, `encodeX/Y`, `layoutLabels`로 전달한다. 기본 ID는 `annotation`이며 이후 편집과 제거는 하위
  Text/encoding/scale/layout/mark 액션이 소유한다. 별도 annotation registry와 editor는 추가하지 않았다.
- Branch conflict, incomplete/ambiguous source, non-Cartesian source, plot fraction 범위, content/style/layout 오류는
  전체 하위 chain을 discarded immutable branch에서 preflight한 뒤 거부한다. Source-owned Text alias는 data anchor
  source inference에서 제외한다.
- Runtime, root TypeScript export, Current contract, compact card, intent, API/reference/LLM 문서와 installed
  package/browser consumer를 함께 갱신했다. Direct action은 **198개**, user-facing action은 **192개**다.

## 시각·회귀 검증

- Data anchor (8,9), dx=8, dy=-16의 `Peak · 9.0` primitive target을 먼저 렌더하고 확인했다.
  Public/lower/literal program은 480×320 Canvas에서 exact (368,48), 같은 semantic/graphic/Canvas와 decoded PNG
  pixel hash를 만든다. Public artifact는
  `.artifacts/test/png/charts/annotations/annotation-facade/data-anchor/user-facing.png`다.
- Focused annotation·Text·reference·catalog suite **43/43 PASS**. Mark/data/plot, aggregate grain,
  quantitative/category/time, domain/reverse/resize, layout/leader cleanup, invalid branch atomicity와 strict types를 포함한다.
- 전체 suite **3012/3012 PASS**. Coverage **95.57% lines / 92.60% branches / 99.04% functions**,
  **88 critical floors PASS**.

## 배포 경계

- [Canonical package evidence](package-annotation-results.json): SHA-256
  `570461a834282f5c4c0c09034a142b4364da6a6ab68a8993e83e825e45fcd82d`,
  **455 entries / 517340 packed / 2469617 unpacked bytes**.
- 같은 tgz의 installed Node/runtime/types/MCP/export와 Chromium **1/1 PASS**.
  Full/Basic/SVG gzip은 **258058 / 140517 / 6437 bytes**, modules **402/245/15**다.
- Packed size가 기존 516000B를 1340B 넘어 승인 범위에서 package packed 상한만 **518000B**로 조정했다.
  Full gzip도 기존 258000B를 58B 넘어 Full만 **259000B**로 조정했다. Package entries/unpacked와
  Basic/SVG 상한은 각각 455/2500000, 141000/25000으로 유지한다.
- Docs generate/preflight/build, **47/47 source docs**, **125 built pages**, desktop search 및 전체 문서의
  320px/390px/768px Chromium 검증이 통과했다.
- 로그: `.artifacts/roadmap6-authoring/phase5-annotation-{focused,full-test,coverage,package,browser,docs}.log`.

## 남은 범위

W3의 common formatter/rotation, W4 theme, W5 fitting, Phase 6–11과 0.0.13 실제 릴리즈는 남아 있다.
이 facade만으로 W3, D13, F14 또는 Phase 5 전체 완료를 주장하지 않는다.
