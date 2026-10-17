# 막대 difference 합성 구현

## 승인과 범위

- 28개 설계 `bad3f346` 및 사용자 승인 기록 `f53dd78a`의 #203과
  difference-source 시각 목표를 재사용한다. 새 시각 목표나 허용 오차를 추가하지 않았다.
- 공개 흐름: `chart.editBarMark({blend: 'difference'})`,
  `chart.editBarMark({blend: 'normal'})`. creator·다른 mark·Basic에는 확장하지 않는다.
- normal reset은 optional semantic/concrete blend를 제거한다. 생략은 현재값을 보존한다.
  authored owner는 `layer.mark.blend` 하나다. appearance config에 복제하지 않는다.
- concrete rect/path만 optional `blend:'difference'`를 받는다. collection 상속이나
  circle/line/text blend는 없다. 범례 explicit opacity의 normal 신호는 별도 #208 Gate다.

## 구현 경계

bar domain action이 명시적으로 기존 rect/rounded-path를 다시 materialize한다.
renderer는 concrete graphicSpec만 읽는다. Canvas는 fill·outline을 하나의 임시 source로
그린 뒤 glyph opacity를 한 번 적용한다. 중첩 clip·stroke bounds·pixel ratio를 반영한다.
임시 source와 factory는 program에 저장하지 않는다. capability와 source allocation은
대상 canvas clear/resize 전에 검사한다. 기존 32767px/16777216px 한도를 유지한다.
SVG는 element difference와 root isolation을 명시한다. PDF는 해당 glyph source만
raster로 포함하며 나머지 내용은 vector다. PNG/PDF backend가 native factory를 전달한다.
정상 기존 렌더에는 새 backend capability를 요구하지 않는다.

같은 primitive 대조로 발견한 기존 닫히지 않은 rectangle outline은 별도
`dcaf6040` 및 [복구 기록](../rect-outline/IMPLEMENTATION.md), 이슈 #214가 소유한다.

## 검증 결과

- `node --test test/contracts/bar-blend.test.js`: 12개 통과.
  immutable/reset/저장복원·atomic failure·nested fractional clip·offscreen bounds·
  gradient·겹치는 bar·theme/data/Canvas/facet/highlight lifecycle을 포함한다.
- Chromium의 실제 Canvas/OffscreenCanvas 및 SVG: 4배경×4opacity×2outline의
  32조합에서 각각 독립 primitive와 전체 RGBA 정확히 일치. interior/outline의
  Canvas/SVG 표본도 정확히 일치한다. 이미지 육안/VLM 검사는 하지 않았다.
- Poppler PDF: 4배경×2opacity의 8조합. opaque RGB/alpha 정확히 일치,
  반투명 RGB만 기존 승인된 1단계 범위다. PDF white paper는 같은 white paper로
  합성한 PNG와 비교했다. CI의 test-render에도 실제 Poppler를 설치한다.
- helper focused coverage: lines100%, branches98.61%, functions100%.
- 누적 unit3134개, metadata/type/card14개 통과. 마지막 preflight 정렬 후 관련17개와
  최종 bar12개를 재검증했다. 최종 통합 누적검사는 통합 branch가 소유한다.
- 설치 tarball의 runtime·TS positive/negative·PNG 정확한 픽셀·PDF·MCP·tutorial
  전체 consumer 통과. 로컬 검증 artifact SHA256:
  `b3e14bb5621552c1755e601b6913ed2b80b35465421e3948f3ad2ed9a9ad2a6f`.
  이것은 개발 검증 artifact이며 canonical release/npm 출판 증거가 아니다.
- 실제 3개 TidyTuesday 데이터셋×5회에서 normal/difference 각각15회 실행,
  최종 concrete items와 SVG 검증. `realistic-evidence.json`은 실제 provenance와
  source selection hash를 기록한다. 160개 penguin 선택은 전체 원본이라고 주장하지 않는다.

재현:

```sh
node --test test/contracts/bar-blend.test.js
node test/browser/bar-blend.browser.js
node test/charts/bar-compositing/pdf.render.js
GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT=/path/to/tidytuesday node agent_docs/impl/bar-difference-blend/verify-realistic.mjs /tmp/bar-realistic.json
npm run test:package
```

일반 SVG omission/reset의 byte 보존과 기존 렌더의 생략 동작도 회귀검증한다.
최종 combined inventory/strict realistic 및 release는 전체 기능 통합에서 수행한다.
