# W3 reference 기반 — Rect datum/span 및 temporal selection

기준: `840f24f32721fb08e773ebae6ac39858eeaa27ce`. [계약](CONTRACT_W3_REFERENCE_RECT.md), [전체 승인](../APPROVAL.md).

## 구현 결과

- 기존 encodeX/Y/X2/Y2가 Rect의 field/datum 배타적 선택을 지원한다. Rule과 Rect는 `grammar/positionDatum.js`의 정규화 owner를 공유한다. Rect secondary는 primary fieldType을 기본으로 사용한다.
- x/x2만 있는 Rect는 plot 높이, y/y2만 있는 Rect는 plot 너비를 채운다. 범위는 실제 plot bounds에서 가져오며 다른 축의 임시 field·dataset·scale을 만들지 않는다.
- Field 또는 color가 있으면 유효 row grain, 없으면 dataset 크기와 무관한 한 항목이다. 혼합 constant는 유효 행에만 broadcast하며 missing row 때문에 존재하지 않는 constant 소비가 automatic domain에 들어가지 않는다.
- Selection과 text는 최종 Rect 항목을 공유한다. Constant-only membership은 전체 dataset이며 common field만 label로 사용한다. Complete span은 text source로 추론되며 기존 incomplete x/y Rect의 text inheritance도 유지한다.
- Scale/Canvas/margin 편집, reverse/custom range, logarithmic와 temporal 좌표, highlight 재생, zero extent, empty/missing dataset, raw field/constant 교체와 failure immutability를 검증했다.

## 기존 오류 #113

[Rect temporal selection channels bypass timestamp normalization](https://github.com/ggaction/ggaction/issues/113).
기존 ranged Rect는 화면 좌표를 시간으로 정규화하면서 selection channel에는 원본 ISO 문자열/연도 숫자를 사용했다. 따라서 epoch-millisecond channel 조건이 valid Rect를 선택하지 못했다.

Rect adapter를 이미 Point·gradient Rect가 사용하는 `channelMapFromRow`에 연결하고, materialization의 중복 raw-channel 계산을 제거했다. Raw field/member는 유지하고 temporal position/color channel은 epoch milliseconds다. ISO와 numeric year, 양 끝점·color, field/datum parity, select/highlight/filter와 scale/Canvas replay를 검증한다. 최종 commit/push와 패키지 검증 뒤 이슈를 닫는다.

## 실행 증거

- 구현 전 literal x Rect `[120,40,160,240]`를 작성·렌더·확인했다. `.artifacts/roadmap6-authoring/reference-rect-primitive.mjs`와 PNG.
- Stable `test/contracts/rect-span.test.js`의 x/y literal primitive/public 2쌍은 exact graphics/order/Canvas calls/PNG parity PASS.
- focused **24/24 PASS**: Rect 기존/신규, Rule 위치, primitive renderer와 strict type 계약. 마지막 source inference 보존 수정 뒤 다시 통과했다.
- normal **2977/2977 PASS**. 이후 incomplete Rect text inference의 보존 분기를 보완하고 focused를 재검증했으며 최종 source 전체는 coverage run으로 다시 검증해 통과했다.
- 최초 package 검사에서 신규 공통 grammar 파일로 entries 454와 packed size 513133을 측정했다. entries 한도를 453→454, packed bytes를 513000→514000으로 조정했다. Full/Basic/SVG ceiling은 유지한다. 전체 승인 범위의 실제 크기 증가다.
- 신규 정규화 owner의 nominal 정상/오류 경로를 public Rect 호출로 보강했다. Focused normalizer coverage **100% lines/branches/functions**. 최종 전체 coverage **95.53% lines / 92.55% branches / 99.03% functions, 88 critical floors PASS**.
- [Canonical artifact](package-reference-rect-results.json): `ggaction-0.0.12.tgz`, SHA256 `f855a2a3b2d5e6e44afc7acd574e55bc05267d401270ea78cc58eefcec40204c`, **454 entries / 513060 packed / 2448544 unpacked bytes**.
- Installed Node/runtime/type/MCP/export 소비자 PASS. Full gzip **255386**, Basic **140153**, SVG **6437** bytes; modules **401/244/15**. 기존 browser ceilings 안이며 동일 tgz Chromium **1/1 PASS**. 실제 constant band Canvas/SVG와 temporal-field filter를 확인했다.
- Catalog/navigation/documentation closeout **21/21 PASS**.
- docs generate/preflight/build와 **125 built pages PASS**. 최종 desktop search/accessibility/navigation와 모든 문서 페이지의 **320/390/768px responsive containment browser PASS**.
- 로그: `.artifacts/roadmap6-authoring/phase5-reference-rect-{focused,normal,coverage,normalizer-coverage,package,browser,docs-generate,docs-build,docs-browser,closeout}.log`.

## 남은 작업

createReferenceLine/createReferenceBand facade, data/plot anchor annotation과 common formatter/rotation은 아직 남아 있다. 이 commit은 필요한 하위 Rect capability를 완료하며 reference/annotation API 전체나 Phase 5 또는 0.0.13 릴리즈 완료를 뜻하지 않는다.
