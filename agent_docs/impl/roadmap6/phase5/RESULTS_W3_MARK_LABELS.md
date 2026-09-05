# W3 B2 — createMarkLabels 결과

기준: `e3ba727f414f378186f05661e31ad7c16bb05416`. [계약](CONTRACT_W3_MARK_LABELS.md), [전체 승인](../APPROVAL.md).

## 구현

- `createMarkLabels`가 existing source에 final-item text layer를 생성한다. 같은 source inference owner, `${source}-labels` identity, 기본 value content, center/middle 정렬과 explicit style override를 사용한다.
- `createTextMark → encodeText → optional layoutLabels`를 visible child로 호출한다. 각 child가 content/appearance/layout semantics와 materialization을 소유하며 facade 전용 state를 만들지 않는다.
- explicit incomplete source의 의미·style은 보존하고 completion 때 생성한다. layout object는 기존 complete-text 계약을 그대로 따른다. field/value/content 선택, format/normalization 및 source validation은 하위 owner가 검사한다.
- source별 ID, 추가 explicit label ID, source filter/resize replay와 하위 content/style/layout 편집을 검증한다. 기존 source-owner removal 계약상 attached label 단독 제거는 금지되고 source 제거 시 함께 정리된다.
- direct action은 195개, user-facing은 189개다. Basic에는 추가하지 않았다. 타입·현재 계약·catalog·intent·생성 reference·public docs·설치 consumer를 동기화했다.

## 증거

- 구현 전 Pie `[25%,75%]`와 Bar endpoint `[2,6]`의 literal graphical override를 작성·렌더·검토했다. `.artifacts/roadmap6-authoring/mark-label-facade-primitive.mjs`와 같은 이름의 Pie/Bar PNG가 로컬 증거다.
- `test/contracts/mark-label-content.test.js`: semantic content 2쌍과 facade 2쌍의 exact graphics/order/Canvas calls/PNG equality PASS. Stable facade variants는 Pie share와 stacked Bar semantic values다.
- focused runtime/type/primitive 11/11 PASS. 최단 호출·source priority·default identity·content·incomplete order·nested layout·lower editing/removal·invalid state/trace atomicity를 포함한다.
- 최종 normal **2969/2969 PASS**. Coverage **95.50% lines / 92.47% branches / 99.03% functions, 87 critical floors PASS**.
- 동일 canonical tgz Chromium **1/1 PASS**: createMarkLabels로 만든 Pie label `[25.0%,75.0%]`, source filter 뒤 `[100.0%]`, 실제 Canvas render와 browser-safe SVG를 확인했다.
- docs generate/preflight/build와 **125 built pages PASS**. desktop search/accessibility/navigation와 모든 문서 페이지의 320/390/768px responsive containment browser 점검 PASS.
- 최종 catalog/navigation/documentation closeout **21/21 PASS**.
- 최초 생성기 검사에서 call pattern 3개가 최대 2개 schema를 위반한 점을 수정하고 전체 생성·normal을 다시 실행했다. 실패 상태를 성공 증거로 사용하지 않는다.
- 로그: `.artifacts/roadmap6-authoring/phase5-mark-labels-{normal,coverage,package,browser,docs-generate,docs-build,docs-browser,closeout}.log`.

## 패키지

[동일 canonical artifact 측정](package-mark-labels-results.json): `ggaction-0.0.12.tgz`, SHA256 `328795c401f242a91605a9eb4677f81d795812f6b3ce5ee509b003ebc236498f`.
453 entries, 512573 packed bytes, 2446532 unpacked bytes. Installed Node runtime, strict types, MCP/export checks와 Full/Basic/SVG bundle PASS.
Full gzip 255110 / Basic 139916 / SVG 6437 bytes; module counts 400/243/15. Browser도 이 tgz를 재사용한다.

최초 pack 512553은 기존 512000 한도를 553 초과했다. 실제 추가 runtime/type/card에 따라 513000으로 조정했다.
Full gzip 255110은 기존 255000 한도를 110 초과해 256000으로 조정하고 architecture ceiling을 동기화했다.
Entry count, unpacked, Basic/SVG ceiling은 유지했다. 이는 전체 승인의 필요한 한도 조정 범위다.

## 남은 범위

W3의 reference line/band, annotation, common format/rotation, W4 theme, W5 fitting과 후속 Phase는 남아 있다. B2 완료가 Phase 5나 0.0.13 릴리즈 완료를 의미하지 않는다. 버전은 최종 릴리즈 준비 전까지 0.0.12다.
