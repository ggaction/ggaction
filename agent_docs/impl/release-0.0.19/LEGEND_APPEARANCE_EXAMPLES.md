# 승인된 legend appearance 목표의 정식 연결

승인 revision `bad3f346` / 기록 `f53dd78a`의 #173/#193/#200/#208을 기존 public
API만으로 연결한다. 새 runtime/API/schema/renderer 경계는 추가하지 않는다.

## Canonical 작성과 독립 primitive

`examples/legend-appearance/program.js`의 기존.7single-point factory는 그대로다.
추가 factory는 각각 `examples/legend-layout/program.js`와
`examples/legend-recipe-opacity/program.js`에서 registry/browser/catalog/docs가 재사용한다.

- `createGradientBlockProgram`:480×270 Canvas,120×16 horizontal color ramp,
  bottom title의 strip/tick/label 전체 union 기준12px clearance, 닫힌 한 경로의
  `[4,2,6,1]` dashed border, 형제 size block만 bottom-left로 이동한다.
- `createRecipeOpacityProgram(opacity)`:0/.7/1 각각 하나의 명시 recipe다.
  한 categorical block에 per-item opacity가 있다고 위장하지 않는다. 각각40px line,
  radius6 outlined orange point와 opaque label을 보존한다. Line #555는 categorical
  color range이고 orange point fill과 #333 outline은 승인된 explicit recipe paint다.
  공개 line recipe에 없는 stroke 옵션은 새로 만들지 않는다.
- 승인 diagram의 여러 독립 조작은 별도 안정 variant로 제시한다. 설명용 heading은
  chart API 출력이라고 주장하지 않는다. 그 diagram에 없는 size 위치 조작도
  별도 gradient/local-size variant에서 실제 공존·독립 소유권을 보여 준다.
- `test/oracles/legend-appearance-scenes.js`는 숫자 폭.61em, native intrinsic frame,
  full painted bounds/padding/stroke extent, free/local anchor의 이동을 산술로 계산한다.
  RGB 60 midpoint samples는 두 endpoint byte의 독립 선형 보간이다.
  Literal 첫/마지막 색·면적/radius/좌표/12px clearance를 고정 assertion으로 검증한다.
  Runtime bounds, geometry, text-metric helper, public state/snapshot을 import하거나 복사하지 않는다.
- Primitive는 이 scene만 소비하는 explicit createGraphics/editGraphics chain이다.
  Manifest는 canonical source와 전체 실제 top-level trace 인수를 exact 비교한다.
  각 함수의 보통 핵심 action 옵션은3개 이하이며 필요한 composite recipe의 중첩
  paint/geometry 필드는 생략하여 의미를 잃지 않는다.

## 검증

- 기존.7single-point 포함 graph/order/nativeCanvascalls/wholeRGBA, PNG, SVG, PDF
  **22/22 PASS**. Normal glyph는 실제 Canvas source surface가 필요하므로 일반 mock
  context를 성공한 것으로 위장하지 않는다. Native trace helper로 구조·호출·픽셀을
  모두 검사하고 해당 variant metadata는 기존 `programEquivalence:'render'` 경로다.
- Canonical browser4cases, registry/vertical/discovery 결합 **40/40 PASS**.
  Browser는 Canvas 전체RGBA, Node와 동일 SVG, status·크기·접근성 이름·오류 없음을 검사한다.
- Root 담당 registry IDs:`legend-layout`, `legend-recipe-opacity`.
  두 chart는 각자의 canonical programDirectory를 가지며 testDirectory는 기존
  `legend-appearance` capability slice를 공유한다.
  기존 `legend-appearance` chart와 single-opacity variant도 제거하지 않는다.
- artifacts:`.artifacts/test/png/charts/legend-appearance/` 아래 chart/variant별
  primitive.png,user-facing.png,표시한 exact public call chain의 variant.json이다.
- Search payload 실측829884bytes에 cap만830000으로 좁게 갱신한다. 나머지
  budget/inventory/coverage 기준과 모든 기존 테스트를 유지한다.
- 기존 gradient/dash/local/opacity/source-boundary 계약 **26/26 PASS**.
- Source `91ae232b` 이후 docs 전체 재생성, **120/120 docs PASS**.
  descriptor/capability/example-index freshness도 PASS했다.
  Ruby3.2 Jekyll build 및150builtpages의 link/asset 정적 검사가 PASS했다.
- Stable 검사 파일은 appearance-primitive.program.js, appearance-vector.render.js,
  layout-and-recipe.test.js이며 review 이력을 정식 실행 이름으로 유지하지 않는다.
  파일명 정리 뒤 같은40개 실행도 모두 PASS했다.
- 이미지 관찰/VLM/유료·학교 모델 API 호출은 하지 않았다.
