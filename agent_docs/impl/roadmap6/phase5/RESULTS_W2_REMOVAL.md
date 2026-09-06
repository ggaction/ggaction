# Phase 5 W2 — 범례 content 부분 제거와 hidden title 보존

기준 `957ef31d1830ed3bb2306c66113088aaab59df8b`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md) 아래 partial channel 제거를 구현하고 [#91](https://github.com/ggaction/ggaction/issues/91)을 수정했다. Content 교체 편집과 전체 W2 완료는 아니다.

## 의미와 구현

기존 removeLegend의 channels는 complete block만 제거했다. 이제 color/shape 또는 color/strokeDash combined categorical block의 일부 채널을 제거하면 남은 설명으로 범례를 재작성한다. 마지막 채널을 제거하면 block을 지운다. Mark encoding, scale, data와 concrete marks는 그대로 유지하며 함께 선택한 size 등 독립 block은 별도로 제거한다. Missing/duplicate/unknown/empty 선택은 기존 validation을 유지한다.

공통 owner `src/actions/guides/legends/lifecycle.js`에 resource-kind cleanup, categorical definition/recipe revision과 config 기반 component 생성을 모았다. createLegend, partial removeLegend, removeEncoding이 같은 생성을 사용한다. 기존 wrapped editSemantic/editGraphics와 symbol/label/title/background child action을 그대로 호출하며 renderer가 의미를 추론하지 않는다. 새 direct action은 없고 inventory는194개로 유지된다.

Revision은 titleVisible, custom/inferred title, labels/titleStyle, layout/border/order와 caller recipe를 보존한다. Automatic recipe만 남은 represented channels를 사용해 다시 계산한다. 저장된 offset 등 appearance는 kind가 series→color로 바뀌어도 유지한다. Item order는 기존 palette 배정을 변경하지 않는다. Partial removal의 layout preflight는 제거할 sibling config가 빠진 immutable view를 사용한다.

재작성 후 categorical components가 retained size 뒤로 밀리는 drawing order도 발견했다. Categorical components는 active noncategorical companions 앞에 attach하며 symbol→label→title 내부 순서를 유지한다. Interval과 categorical이 raw color IDs를 공유하므로 placement selector는 실제 active policy만 사용한다. Primitive와의 drawing order 비교로 이 alias 조건까지 검증했다.

## #91 재현과 수정

`createLegend().editLegend({ title: false }).removeEncoding({ channel: "shape" })`가 숨긴 제목을 되살렸다. 기존 encoding cleanup은 createLegend용 options 일부만 복사하여 titleVisible:false를 잃었기 때문이다. 이제 최종 config의 visibility를 보존한 채 직접 기존 component owner를 호출하므로 hidden title graphic은 생성하지 않는다. Color/shape 제거, 네 categorical edge, legacy-bottom, custom title, auto 복원, order/palette와 Canvas/scale replay를 검사했다.

## Primitive와 public 결과

`test/contracts/legend-content-render.test.js`의 partial removal variants를 먼저 렌더링했다. Source는 color/shape/size point이며 target calls는 다음과 같다.

- Color-only: `base.createLegend({ count: 3 }).removeLegend({ channels: ["shape", "size"] })`.
- Color-size: `base.createLegend({ count: 3 }).removeLegend({ channels: ["shape"] })`.
- Shape-only: `base.createLegend({ count: 3 }).removeLegend({ channels: ["color", "size"] })`.

경로는 `.artifacts/test/png/charts/legend-layout/legend-partial-removal/{color-only,color-size,shape-only}/`다. 기존 독립 createGraphics/editGraphics primitive의 literal geometry를 사용했고 color-only의 label x는 기존 series label offset10을 보존하므로532다. Color-size는 swatch x539, size center x546/y181,221,261이며 size radius는 `sqrt([24,110,196]/π)`다. Public 구현 전에 target 이미지와 exact calls를 표시했다. 수정 후 graphicSpec/drawing order/renderer calls/decoded pixels가 정확히 일치한다.

## 검증

로그 prefix: `.artifacts/roadmap6-authoring/phase5-legend-removal-`.

| 검사 | 결과 |
| --- | --- |
| 수정 전 새 회귀 | 8 중6 실패로 partial removal/hidden title 문제 재현 |
| focused lifecycle/primitive/encoding | 28/28 PASS |
| 전체 normal | 2,833/2,833, fail/skip0 |
| final source coverage | lines95.33%, branches92.06%, functions98.91%;78 critical floors PASS |
| 기존 Cars scatter/regression/multi-legend/window-rank와 Polar PNG | 24/24 PASS |
| 실제 Cars | 유효392 rows; Origin/Cylinders ×left/right ×visible/hidden ×4 removal sets =32/32 PASS |
| 실제 데이터 검사항목 | mark/encoding 보존, title/style 유지, resize/removal·filter/removal 순서 수렴 |
| 최종 설치 package | Node/renderers, strict types, MCP, tutorials, bundle budgets PASS |
| 동일 final artifact Chromium | Canvas/SVG 1/1 PASS |
| docs | generate/preflight/final build/125 built pages PASS |
| catalog/navigation/truth closeout | 21/21 PASS |

Coverage 첫 실행에서 README의 옛 Basic ceiling 설명이 발견돼 실패했다. README를 canonical139000에 맞춘 뒤 final coverage와 package를 다시 실행했고 통과했다. `coverage.log`는 초기 실패 기록, `coverage-final.log`가 최종 성공이다. Docs UI 변경이 없으므로 full responsive docs browser를 이번에 재실행했다고 주장하지 않는다.

[최종 패키지 원장](package-legend-removal-results.json): `.artifacts/roadmap6-authoring/package-legend-removal-final/ggaction-0.0.12.tgz`, SHA-256 `c90d9b049809787635c8258a651bc3d9c33ad8d33b92ebfde8fc63819c681374`. Entries448, packed503855, unpacked2411789. Gzip Full250788/Basic138111/SVG6437. 승인된 한도 조정은 새 lifecycle file에 맞춰 entry447→448, Basic gzip138000→139000이다. Packed/unpacked/Full/SVG ceiling은 유지했다. README와 architecture numeric record도 맞췄다. README 수정 전 artifact는 최종 증거로 사용하지 않는다.

## 남은 작업

`editLegend({ channels })`를 통한 target content 교체, automatic recipe의 전체 data/scale/mark replay matrix, C2 family×edge 배치, W3–W5, Phases6–11과 실제0.0.13 release는 남아 있다. Size 등 비범주형 block 자체의 현재 layout 제한과 editor 경계도 아직 그대로다. 현재0.0.12 artifact는 개발 검증용이며 릴리즈 완료가 아니다.
