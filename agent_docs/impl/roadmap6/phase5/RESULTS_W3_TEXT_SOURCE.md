# W3 A — Explicit text source와 dependency replay 결과

상태: 구현·검증 완료. [계약](CONTRACT_W3_TEXT_SOURCE.md), [전체 승인](../APPROVAL.md)을 따른다. W3 전체, W4–W5 및 0.0.13 릴리즈는 아직 완료하지 않았다.

## 구현

- `createTextMark({ source })`가 current mark/data와 무관하게 지정한 point/bar/rule/rect/arc를 사용한다. Source/data 동시 지정과 잘못된 source는 거부한다. Source 생략의 기존 inference와 독립 data mode는 유지한다.
- Source 종류의 capability를 한 owner로 모으고 incomplete source에 연결한 content/appearance를 보존한다. 소스 위치 완성 시 final item의 anchor로 라벨을 만든다. Gradient Plot은 자체 owner가 완성한 strip도 소스로 인정한다.
- Position encoding plan과 scale edit에 source-dependent label을 포함한다. Text가 이전 scale ID를 상속한 상태여도 현재 source의 위치를 따른다. Position 제거 시 stale label을 지우고 복원 시 다시 만든다. Plan의 중복 step은 공통 builder로 제거한다.
- `editTextMark`는 appearance-only다. 타입·현재 계약·문서·생성 catalog/card·architecture·installed consumer probe를 함께 갱신했다. Direct action inventory는 194 direct / 188 user-facing으로 유지된다.

## 발견한 기존 오류

[#110](https://github.com/ggaction/ggaction/issues/110): 소스가 새 position scale을 사용하면 attached text가 이전 위치에 남았다. 기존 `55aa2de7`의 editScale 모듈을 격리 실행하여 point x `[104,136]`, label x `[168,232]`를 재현했다. 수정본은 모두 `[104,136]`이다. Source 지정 옵션과 별개로 기존 자동 추론 사용자에게도 적용되는 수정이다.

## 검증

- Focused 32/32: five source families의 early/late/inferred concrete parity, incomplete content, explicit/current/data precedence, ambiguity, invalid input, Polar point, Gradient Plot strip, Canvas/filter와 새 scale binding/edit, position 제거·복원, 원본 보존.
- Normal 전체 2942/2942 PASS.
- Source coverage 95.48% lines / 92.38% branches / 99.02% functions, 86개 critical floor PASS.
- Annotated IMDb와 Gapminder labels primitive/public PNG 2/2 PASS. 기존 anchor geometry를 재사용하며 새 배치 정책은 추가하지 않았다.
- Canonical installed Node runtime/TypeScript positive·negative/MCP/export/bundle consumer PASS.
- 동일 tgz의 Chromium browser consumer 1/1 PASS.
- Docs generation, environment preflight, build, built pages 125 PASS.
- Catalog/navigation/documentation closeout 21/21 PASS.
- 초기 누적 검사에서 Gradient Plot의 별도 strip readiness를 빠뜨린 회귀 1건을 찾아 수정했다. 명시적/추론 parity 검증을 추가한 최종 전체 검사와 coverage를 다시 통과했다.

## Artifact

[Package evidence](package-text-source-results.json): SHA-256 `c6d014c31cd0dab7389d661a3a5fae2d4c8c65e2e90186cc04dda23e87872bc6`, 452 entries, packed 509669 bytes, unpacked 2434212 bytes. Browser gzip: Full 253471 / Basic 139757 / SVG 6437 bytes. 기존 budget 이내이며 증액하지 않았다.

실행 로그는 `.artifacts/roadmap6-authoring/phase5-text-source-*`에 보관한다. Runtime artifact는 개발 버전 0.0.12이며 전체 로드맵 완료 릴리즈 증거가 아니다.

## 남은 작업

W3 B의 category/aggregate/share final-item labels와 percent denominator, reference line/band, annotation, 공통 format/rotation 계약을 구현해야 한다. 이후 W4 theme, W5 fitting, Phase 6–11과 0.0.13 실제 릴리즈를 계속한다.
