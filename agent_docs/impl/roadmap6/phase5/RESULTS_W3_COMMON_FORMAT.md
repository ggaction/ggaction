# W3 E — 공통 value formatter 결과

## 구현

- `grammar/valueFormat.js`가 numeric `.0`–`.12` `f/%/e`와 UTC
  `%Y/%m/%d/%b/%%`의 검증·변환을 한 곳에서 소유한다. Axis, Text, continuous
  gradient/opacity/size/stroke-width/interval legend가 이 owner를 사용한다.
- 각 surface의 `"auto"` 출력은 유지했다. Axis는 tick precision, Text는 정확한
  `String(value)`, continuous legend는 distinct samples/time ticks를 계속 자체 소유한다.
- Axis의 legacy `{ decimals }`만 호환 경로로 유지한다. Text와 legend는 이를
  거부한다. Numeric/temporal/discrete family mismatch, precision>12, invalid date,
  non-finite number와 percent overflow는 immutable failure다.
- Continuous legend는 `labels.format`과 `editLegendLabels({ format })`으로 명시
  포맷을 저장·재생한다. Focused label editor가 runtime에서 빠뜨렸던 `offset`도
  공개 타입·문서와 함께 지원하도록 맞췄다. Categorical identity labels는 explicit
  format을 거부한다.
- `NumericFormatString`, `UtcFormatString`, `ValueFormat`을 root types에서 공개하고
  Axis/Text/legend declarations가 같은 vocabulary를 참조한다. Direct/user-facing
  action 수는 **198/192**로 변하지 않는다.

## 검증

- Formatter·Axis·Text·continuous/discretized/combined legend·focused editor·type/contract
  집중 검증 **61/61 PASS**.
- 전체 suite **3016 tests**에서 최초 3014 PASS/2 expected drift를 확인했다.
  새 source file에 따른 package entry cap과 갱신 전 generated guide reference가
  원인이었고 각각 조정·재생성했다. 해당 실패 파일의 재검증 **32/32 PASS**.
- 결합 categorical+size 경계 검증을 추가한 최종 전체 suite **3017/3017 PASS**.
- Coverage **95.58% lines / 92.62% branches / 99.01% functions**, **88 critical
  floors PASS**.
- Docs source **47/47**, build **125 pages**, desktop search 및 전체 페이지의
  320px/390px/768px Chromium 검증 PASS.
- Catalog/navigation/documentation closeout **21/21 PASS**.

## 배포 경계

- [Canonical package evidence](package-common-format-results.json): SHA-256
  `1f810227934d061e852654df8fad49c03684fb8cf14e8f5350502238688390e9`,
  **456 entries / 518320 packed / 2473673 unpacked bytes**.
- 같은 tgz의 installed Node/runtime/types/MCP/export와 Chromium **1/1 PASS**.
  Full/Basic/SVG gzip은 **258516 / 141070 / 6437 bytes**, modules **403/246/15**다.
- 새 common grammar module 때문에 entry cap을 455→456으로 조정했다. Packed
  측정 518320B에 맞춰 ceiling을 518000→519000B로, Basic gzip 141070B에 맞춰
  141000→142000B로 조정했다. Full 259000B, SVG 25000B, unpacked 2500000B
  ceiling은 유지한다.
- 로그: `.artifacts/roadmap6-authoring/common-format-{full-test-final,docs,closeout}.log`,
  `.artifacts/roadmap6-authoring/package-common-format-consumer.json`.

## 남은 범위

W3 rotation unit, W4 theme, W5 fitting, Phase 6–11과 0.0.13 실제 릴리즈는
남아 있다. Common formatter만으로 W3, F14/F18 또는 Phase 5 전체 완료를
주장하지 않는다.
