# W3 C2 — Reference line/band 결과

기준: `4d84a5585cf667b8ccc02b8cb7a1f8cb8dde521f`. [계약](CONTRACT_W3_REFERENCES.md), [전체 승인](../APPROVAL.md).

## 구현

- `createReferenceLine({ y: 5 })`, `createReferenceBand({ x: [2, 6] })`를 Full API에 추가했다.
  기존 Rule/Rect와 position/appearance actions로 내려가며 전용 편집·재생·소유권 registry를 만들지 않는다.
- Data space는 explicit/current/unique eligible Cartesian source의 data/coordinate/scale/fieldType/temporalUnit을
  사용한다. 상수도 automatic domain에 참여하며 explicit domain을 동결하거나 복제하지 않는다.
- Plot space는 finite [0,1], x는 왼쪽→오른쪽, y는 아래→위다. `<id>-<axis>` named linear scale과 기존 dataset을
  사용하고 빈 dataset도 허용한다. 새 dataset은 없다. 동일 scale definition 재사용/충돌과 removeMark 뒤 scale
  유지는 기존 createScale/removeMark 계약이다. Source는 생성 시 binding 선택이며 종속 child가 아니다.
- 참조선은 gray dashed width 1, 구간은 gray .15 fill/stroke false. 위치/appearance/scale/label/highlight/삭제를
  기존 하위 owner로 편집한다. 전체 child chain의 discarded immutable preflight로 endpoint/style 실패 원자성을 보존한다.
- Shared eligible-layer selector는 호출자가 실제로 제공할 `source` 옵션명을 오류에 표시할 수 있다. 기존 target
  액션의 메시지는 보존한다. Direct inventory는 **197개 / user-facing 191개**다.

## 기존 문서 오류 #114

[Rule guide example omits required field type and misstates default appearance](https://github.com/ggaction/ggaction/issues/114).
기존 예제는 필수 fieldType과 Canvas setup이 없어서 복사 실행이 실패했다. 생성 시 style이 없다는 설명도 실제
default config와 달랐다. Import/Canvas/quantitative field type을 명시하고 기본 스타일 설명을 수정했다.
`test/contracts/reference-marks.test.js`가 문서의 두 JavaScript block을 직접 실행하고 실제 SVG 출력까지 검증한다.
최종 검증·commit/push 후 이슈를 닫는다.

## 검증

- 구현 전 `.artifacts/roadmap6-authoring/reference-facades-primitive.mjs`의 literal graphic을 렌더·검토했다.
  Stable pair는 `.artifacts/test/png/charts/references/line-and-band/plot/`이며 literal/public의 concrete objects,
  hierarchy/order, Canvas calls와 same-run decoded PNG가 정확히 같다. Public PNG도 직접 확인했다.
- Focused **23/23 PASS**(9 reference unit + 2 primitive/consumer + type/catalog). 이후 exact guide example regression을
  추가했고 reference/closeout **24/24 PASS**를 확인했다. Empty/multiple data, Cartesian ambiguity, category/time/log/reverse,
  explicit/inferred source, auto domain, labels, lower edits, selection, resize/removal, invalid second endpoint를 포함한다.
- 전체 source coverage **95.54% lines / 92.56% branches / 99.03% functions**, **88 critical floors PASS**.
- 최초 normal에서 검색용 snippet이 `{}`로 생성되는 두 오류와 package budget 초과를 발견해 sampleOverrides와
  실제 한도를 수정했다. Regression **40/40 PASS**. Bundle ceiling 문서도 실제 설정과 동기화했다.
- Canonical [패키지 결과](package-references-results.json): `ggaction-0.0.12.tgz`, SHA256
  `aff162ca951befc277d8f78c7e0dc18ecb2fce150820140ae9c3a00b713fa356`, **455 entries / 514971 packed / 2457614 unpacked bytes**.
- Installed Node/runtime/types/MCP/export PASS. Full gzip **256784**, Basic **140168**, SVG **6437** bytes;
  modules **402/244/15**. 실제 증가에 맞춰 entries 454→455, packed ceiling 514000→516000,
  Full gzip ceiling 256000→257000으로 조정했다. Basic/SVG ceiling은 유지한다.
- 같은 canonical tgz의 Chromium **1/1 PASS**. 실제 reference band와 line Canvas, SVG, width/y 위치를 확인한다.
- 최종 normal **2989/2989 PASS**. docs generate/preflight/build와 **125 built pages PASS**.
- 전체 docs browser는 desktop search/accessibility/navigation와 모든 페이지 **320/390/768px PASS**.
  마지막 Rule 예제의 import/Canvas 보완 뒤 최종 빌드에서 해당 페이지 responsive 및 전체 desktop/mobile interaction을 다시 실행해 **PASS**했다.
  `.artifacts/roadmap6-authoring/verify-references-docs.mjs`는 기존 docs browser harness의 페이지 목록만 Rule 1개로 제한하고 나머지 interaction 검증을 유지한다.
- 로그: `.artifacts/roadmap6-authoring/phase5-references-{focused,regression,normal,coverage,package,browser,docs-generate,docs-build,docs-browser,docs-final,closeout}.log`.

## 남은 범위

Annotation과 common formatter/rotation, W4 theme, W5 fitting, Phase 6–11 및 0.0.13 실제 릴리즈는 남아 있다.
이 변경은 W3 C2 reference facade 완료 범위이며 Phase 5 전체나 릴리즈 완료를 뜻하지 않는다.
