# Phase 5 W2 — Target 전체 범례 content 교체

기준 `0a5da6939b154df9bedf605aa59da829f7d364a2`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md) 아래 `editLegend({channels})`를 구현하고 [#92](https://github.com/ggaction/ggaction/issues/92)의 companion style 손실을 수정했다. 전체 W2 및 0.0.13 릴리즈 완료는 아니다.

## 사용자 계약과 구현

`editLegend({target?,channels,...patch})`의 channels는 해당 target 전체의 최종 non-empty content 집합이다. Child-block selector가 아니며 omitted channels는 기존 content를 유지한다. 지원 조합은 기존 createLegend의 경계를 따른다. Point color/shape/size의 7개 subset을 서로 교체하고 standalone continuous color/interval/opacity/size/width도 해당 encoding이 존재할 때 기존 creation owner로 재작성한다. Encodings, scales, marks, 다른 target은 보존한다.

같은 kind의 block은 기존 config/count/title visibility를 유지한다. Categorical color↔series revision은 layout/text/order/compatible caller recipe를 유지하고 자동 recipe는 새 channels로 계산한다. 제외한 block의 설정은 함께 제거하며 새 block은 creation defaults를 사용한다. 같은 호출의 style/layout patch는 최종 content에 적용한다. 이는 제거한 block의 의미가 다른 설정을 새 family로 이식하는 API가 아니다. 중복/빈/없는 channel, occupied resource, incompatible option/count/layout은 오류다.

Creation step→kind/config resolution을 `legends/creation.js`로 추출해 aggregate facade와 content editor가 공유한다. Family별 config 기반 생성 helper는 기존 wrapped semantic/graphics/materialization child를 조합한다. 일반 편집과 content 교체는 같은 pure option normalizer를 사용한다. Renderer 변경 및 새 direct action은 없다. Direct inventory는194개다.

## #92: companion의 별도 스타일 보존

기존 categorical editor는 제목이나 count만 바꿔도 companion size의 inheritAppearance를 true로 설정했다. Size에 따로 지정한 red label과 title fontWeight900이 categorical 기본색과 weight600으로 바뀌었다. Label의 fontWeight 하나만 바꾸는 경우에도 size label color까지 덮어썼다.

수정은 각 block의 유효 스타일을 기준으로 요청한 leaf만 병합한다. Title/count 변경에는 size의 자체 스타일과 기존 inheritance를 유지한다. Shared text patch는 현재 inherited appearance를 먼저 풀고 요청 leaf만 적용한다. Size의 inherited label offset28은 categorical offset10으로 바뀌지 않는다. 일반 edit와 channels 교체 모두 같은 규칙이며 Canvas/size-scale replay에서도 보존한다.

## 독립 primitive와 시각 검증

B1에서 이미 작성·실행한 독립 literal primitive를 다시 사용했다. 새 content-edit variants는 standalone size에서 color-only/color-size/shape-only로 교체하며 기존 target과 graphicSpec, drawing order, renderer calls, decoded pixels가 정확히 일치한다. 이번 변경 전에 새 primitive를 작성한 것처럼 기록하지 않는다.

예시: `base.createLegend({channels:["size"],count:3}).editLegend({channels:["color","size"],count:3})`.
경로: `.artifacts/test/png/charts/legend-layout/legend-content-editing/{color-only,color-size,shape-only}/`.
`test/contracts/legend-content-render.test.js`는 기존 explicit/inferred/partial-removal과 새 edit의 총12 variants를 검증한다.

## 검증 결과

로그 prefix: `.artifacts/roadmap6-authoring/phase5-legend-content-edit-`.

| 검사 | 결과 |
| --- | --- |
| focused unit/lifecycle/primitive | 26/26 PASS; point subset 7×7=49 전환 포함 |
| 최종 normal | 2,841/2,841; fail/skip0 |
| source coverage | lines95.36%, branches92.11%, functions98.92%;80 critical floors PASS |
| 대표 Cars/Polar PNG | 24/24 PASS |
| 실제 Cars | 392 rows; Origin/Cylinders ×left/right ×visible/hidden ×4 content sets =32/32 PASS |
| 실제 데이터 검사 | mark/encoding 보존, title/style, resize/scale-edit와 content 교체의 순서 수렴 |
| 설치 package | Node, PNG/PDF/SVG, strict types, MCP, tutorials, bundle budgets PASS |
| 동일 artifact Chromium | Canvas/SVG 1/1 PASS |
| docs | generate/preflight/build/125 built pages PASS |

초기 normal은 새 action card snippet이 channels를 문자열로 생성해 타입 검사2개가 실패했다. Canonical sample override에 명시적인 배열과 count를 제공하고 재생성한 뒤 final normal/coverage/package가 통과했다. Focused 초기 실패는 incomplete width fixture였으며 완전한 grouped Line fixture로 바꾸었다. 실제 product 회귀와 fixture 실패를 구분한다. Docs UI 변경이 없으므로 전체 responsive docs browser를 재실행한 것으로 주장하지 않는다.

[패키지 원장](package-legend-content-edit-results.json): SHA-256 `91a562b365ded43ade366807b79a4369d037462c2835f5f88ca667970d35aae6`, entries449, packed505519, unpacked2419210. Gzip Full251649/Basic138143/SVG6437. 새 shared file에 맞춰 entries448→449, 실제 Full 측정에 맞춰 ceiling251000→252000을 승인 범위 내 조정했다. Basic139000 및 packed/unpacked/SVG 한도는 유지했다. Creation/editor critical floors 두 개를 추가했고 기존 floor는 낮추지 않았다.

## 남은 범위

전체 automatic recipe의 data/scale/mark replay matrix, C2 family×edge 배치, W3–W5, Phases6–11과 실제0.0.13 릴리즈는 남는다. 현재 size/width/interval layout 제한은 확장하지 않았다. 0.0.12 artifact는 개발 검증용이다.
