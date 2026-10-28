# P1 구조화 fill 공개 연결

## 진행 상태

- [x] P1/P2 `06e9eba8`와 ellipse의 기존 승인, 전체 남은 구현 승인 정본 재사용
- [x] 최신 통합 `a561ae1c`를 보존하며 pattern/radial 공개 fill 연결
- [x] Point/Bar/Rect/Arc/Area/Text create/edit·명시 materialization·codec·Full/Basic 연결
- [x] 7 pattern styles와 radial ellipse/focal-edge의 공개·primitive 동일 실행 픽셀
- [x] 조건부 appearance/position/Text·parameter revision과 paint 교차 회귀
- [x] 최신 통합 입력의 전체 unit 5404/5404·contract 710/711 및 실패한 문서 truth focused 3/3 수정
- [x] 영향 owner 10개의 canonical coverage floor·설치 Node20/22/24·문서 검증
- [x] 새 FillPaint 44개 nested option 포함 120 direct paths와 실제 데이터 15/15 witness 감사
- [ ] P2 outline/halo·blend·shadow, 실제 Text glyph mask 연결

P1 checkpoint는 STEP017 및 Roadmap9 전체 완료가 아니다. 정확한 현재 사용자 계약은
`contract/current/MARKS.md`의 shared structured fill과 `PRIMITIVES.md`, 공개 설명은
`docs/api/appearance/mark-style.md`가 소유한다. 이 기록은 구현 선택과 검증 증거만 보존한다.

## 경계와 구현

새 action/resource/entrypoint 없이 기존 fill에 정규화된 pattern/radial을 받는다. Pattern origin은
mark materializer가 명시 plot/object frame에서 저장하며 composition 이동도 같은 origin을 옮긴다.
Gradient stop 검증은 기존 linear와 radial의 공유 pure owner로 분리했고 legacy solid/linear 색 문법은 보존한다.

Text의 `fillBounds`는 기존 metrics/line-origin 계산에서 만든 회전 전 concrete bounds다. SVG는
native text/tspan과 vector paint를 쓰며 Canvas는 기존 fillText의 실제 glyph alpha를 유지한다.
타원 radial Text는 bounded paint texture만 준비하고 글자 모양을 사각 bounds로 대체하지 않는다.
Native glyph가 estimated metrics 밖으로 나오는 경우도 visible frame 전체 texture와 periodic tile로
채운다. 두 renderer에서 `WW`의 실제 glyph overhang 내부 픽셀을 별도 회귀로 고정했다.

닫힌 도형의 radial PDF는 native vector shading을 유지한다. Pattern의 foreground/background를
합친 glyph opacity는 기존 isolated-glyph owner가 한 번 적용한다. 그래서 opacity가 1 미만인 pattern과
Text paint의 PDF에는 bounded glyph/paint image가 포함될 수 있다. 이 출력 차이를 Current와 공개 문서에 명시한다.

조건부 통합에서는 Rect 초기 concrete 속성에 `undefined` opacity/stroke/fill을 쓰던 결함을 고쳤다.
선택된 값은 기존 final-output owner가 적용하며 초기 단계는 미지정 선택 속성을 생략한다. Area의
stroke-from-fill 검증은 아직 선택되지 않은 conditional fill을 거부하지 않으며 명시된 structured fill의
암묵적 solid stroke 전환은 계속 거부한다. 조건부 채널 지원 범위를 새 paint 때문에 확장하지 않는다.

## 재현 가능한 증거

- 공개 표본: `examples/structured-paints/program.js`, 9 variants
- 독립 literal/primitive/public 검증: `test/charts/structured-paints/`
- 기존 승인 slice 전체 승격: 위 경로의 `variants/pattern-paints/`, `variants/radial-gradient/`
- 실제 browser glyph/ellipse/periodic samples: `test/browser/structured-paint.browser.js`
- create/edit·selection·labels·composition·revision·conditional·codec: `test/unit/actions/marks/structured-fill.test.js`
- alpha·PDF shading·Text mask·scene·preflight: `test/contracts/structured-paint-rendering.test.js`
- 5 pinned datasets × 3 recipes(각 2 owners, 총 6) × 10 fill variants: `test/contracts/realistic-structured-paints.test.js`
- source-free Full/Basic/renderers/Text/fresh-process codec: `scripts/consumers/fixtures/node/structured-paints.mjs`

최종 실행 수, 원 로그 hash, package/bundle 실측은 후속 `structured-fill-evidence/manifest.json`에 기록한다.
미통과 검사를 통과로 기록하거나 이전 branch 입력의 전체 검증을 최신 통합 증거로 대신하지 않는다.

## 패키지 경계

통합 직후 기존 755-entry 한도는 새 6개 책임 owner로 761이 되어 실패했다. 최초 실패 로그를 보존한다.
Node22 최초 측정은 packed1,126,677/unpacked5,199,497bytes이며 기존1,118,000/5,160,000을 초과했다.
Node20 packed1,129,521bytes가 추가로 관측되어 허용치는 761/1,130,000/5,200,000으로 필요한 만큼만
조정한다. Installed Full/Basic gzip은 Node22에서554,881/331,553bytes, Node20에서555,702/332,290bytes다.
따라서 기존549,000/325,000 대신556,000/333,000만 허용한다. Node24 및 최종 설치 결과도 evidence에 별도로 기록한다.

## 검증 범위와 소비자 상태

최신 runtime source commit은 `dac51879a`이며 통합 기준 `a561ae1c`의 조건부 위치·appearance·Text 동작을 보존한다.
전체 unit은 5404/5404 통과했다. 전체 contracts는 711개 중 710개가 통과했으며 단일 실패는 bundle ceiling의
README/architecture 표 불일치였다. 해당 입력만 고친 뒤 `documentation-truth.test.js` 3/3을 통과했다.
이를 전체 711개 재실행으로 표시하지 않는다. 새 테스트 helper의 discovery는 별도로 16/16 통과했다.

Coverage는 전체 repository의 새 완료 주장이 아니다. 영향받은 10개 owner를 포함하는 70개 focused test를
계측했고 기존 canonical family/file floor를 그대로 적용해 모두 통과했다(97.24/95.07/100 aggregate).
최종 공통 통합의 전체 source coverage는 root가 소유한다.

| 소비자 | 검증 상태와 증거 |
|---|---|
| create/edit, Full/Basic | 6 filled mark 생성/편집 동등성, strict authored/concrete validation, 외부 입력 불변성 |
| color·selection·legend·labels | field color 우선순위/복원, inherited paint, label collision 이동 후 origin/bounds 재계산 |
| revisions·conditional | data/scale/canvas/parameter 변경, 조건부 위치/Text/appearance와 교차 39/39 |
| facet/repeat/concat | local object origin과 plot origin 이동, editable source와 lineage 유지 |
| scene/transition | graphic-only Canvas scene에서 Text의 actual glyph와 paint 유지; source geometry/identity는 효과로 바뀌지 않음 |
| codec/offline | editable/graphic codec, malformed concrete 거부, 새 process에서 편집 후 SVG 동일 |
| Canvas/SVG/PNG/PDF | 승인 7 pattern+ellipse+edge public/primitive 렌더 12/12; browser 실제 글자 표본 3/3 |
| TypeScript/package | 기존 export map 유지, FillPaint declarations, source-free installed 203 cases × Node20/22/24 |
| docs | source 166/166; built 150 pages와 1223 selective LLM artifacts; desktop/search/axe 및 320/390/768 sweep |

Node22·Node24는 같은 archive에서 node cases 203/203과 qualification 7/7을 통과했다.
Node20도 203/203이고 최초 qualification 5/7의 두 실패는 gzip ceiling 초과뿐이었다.
Node20의 세 bundle 측정을 수정 ceiling으로 재실행해 3/3 통과했으며 전체 qualification을 재실행한 것으로 쓰지 않는다.

세 Node가 실제 소비한 archive SHA256은 `65b3f8ddda6755382028635a9051d29e04edcdc816a1a8734af8797a8d80a043`이다.
최종 pack SHA256 `a20d6590c0d40766e6e6f4d7d79580f87c41b284ae063fdf59ed140a5be938b3`는 README의 Basic ceiling
수정만 다르며 761개 packed file의 내용 비교로 runtime/types/knowledge/manifest가 동일함을 확인했다.
최종 pack을 세 Node에서 직접 재설치했다고 주장하지 않는다. 이는 P1 구현 checkpoint의 증거 재사용이며
최종 통합/배포 후보의 exact archive 검증을 대체하지 않는다.

전체 P2 및 STEP017은 계속 미완료다. 다음 checkpoint는 outline/halo+blend이며, shadow는 승인된 image concrete/
prepare 경계를 공유한다. Text shadow의 실제 glyph mask는 font 준비와 명시 host raster 경계를 연결해야 한다.

옵션 감사의 최초 실행은 실제 120개 경로와 이전 76개 기대치 차이를 검출했다. Point/Arc 각각의 신규 22개
fill 경로를 TypeScript inventory로 열거하고, pinned penguin rows로 만든 실제 공개 편집 trace를 추가했다.
5개 pinned datasets의 3 recipes(각 2 mark owners, 총 6)에는 기존 9개 pattern/radial 표본과 linear를 함께 넣어
15/15를 통과했다. 특정 mark action마다 3개 recipe가 있다는 주장은 하지 않는다. Direct inventory test는
기존 assertion에 필요한 NEW_DIRECT_ACTIONS와 TARGET_ACTIONS 합집합만 TypeScript로 분석하며 모든 기존
120개 required path 및 broad maximal assertion을 유지한다. 최초 전체 inventory 실행 536205ms 로그와
수정 focused 27173ms 로그를 모두 보존했다. 변경된 timing ledger의 shard 단위 검사도 통과했다.

승인된 pattern/radial slice의 review PNG 36/41개는 stable capability 출력과 byte hash가 모두 같았으며,
해당 두 완료 review subtree만 정리했다. 원본 승인 기록과 stable 실행 소스는 보존한다.
