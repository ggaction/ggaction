# Legends and marks implementation checkpoints

승인: [PROPOSAL.md](PROPOSAL.md), remote `bad3f346`, approval record `f53dd78a`.
번역 작업 및 유료 모델 호출은 중지 상태다. 이 문서는 구현 진척이며 전체 12개 완료 선언이 아니다.

## Checkpoint 1 — existing legend block selectors

- `editLegend`와 focused 5종의 단수 `channel`을 기존 descriptor/family validator에 연결했다.
- target ambiguity, absent channel, selector-only request 및 plural-content/group controls 충돌을 거부한다.
- 선택된 categorical/size 편집에서만 현재 유효 size typography를 보존하고 legacy 공유 상속을 분리한다.
- selector 없는 기존 우선순위/상속은 유지한다. 저장 config의 owner를 추가하지 않는다.
- 완전한 공개 enum/옵션을 유지한 `editLegend` compact card 실측은 3,531 bytes다.
  해당 카드만 3,600 bytes로 제한하고 나머지는 기존 3,360 bytes를 유지한다.
- 검증: 기존 guide unit 650 PASS; 새 selector/persistence/data-scale-Canvas 독립성 6 PASS;
  선택 관련 contract/render/type 30 PASS; installed package consumer PASS;
  실제 고정 데이터 3종 각각 5회 Cartesian lifecycle + SVG 렌더 15 PASS.
- 고정 데이터 cache는 저장소 `/Users/hyeonjeon/Projects/ggaction/.artifacts/datasets/tidytuesday`를
  `GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT`로 지정했다. 테스트가 canonical manifest/hash를 검증한다.
- types, Current, ACTION_INDEX, public reference, generated cards/signatures/machine docs를 동기화했다.
- 전체 새 옵션 literal의 realistic witness 소비자 행렬은 후속 기능 checkpoint와 함께 최종 검증한다.

## Checkpoint 2 — directional named point shapes

- `wedge`/`arrow`를 기존 named shape grammar 끝에 추가했다. 기존 12종의 automatic range 순서는 유지한다.
- 독립 raw vertices/area/0·90·270도 회전/arrow bounding-box 중심을 검증했다.
- constant create/edit, field shape range, highlight, legend 및 Full/Basic 타입을 동기화했다.
- 기존/확장 unit 34 PASS; shape/type/legend geometry 10 PASS; 실제 Chromium 8조합의
  Canvas pixels가 독립 polygon과 정확히 일치한다. Node PNG도 독립 primitive와 정확히 일치하고
  SVG/PDF/저장·복원/Canvas replay가 통과했다. 이미지를 눈이나 VLM으로 보지 않았다.
- packed installed consumer에 Full/Basic 두 shape의 실제 생성·PNG·persistence 호출을 추가해 PASS했다.
- unpacked 실측 3,909,563 bytes가 기존 3,908,000 bytes를 초과해 한도만 3,910,000으로
  좁게 갱신하고 architecture budget 기록을 남겼다. 다른 예산은 유지한다.


## Checkpoint 3 — Canvas no-paint correction

- 실제 Chromium에서 `stroke:"none"`가 invalid color assignment라 기존 불투명색을 유지하는 버그를 재현했다.
- 기존 shared fill owner가 exact `"none"`만 transparent color로 바꾸고 stroke/circle/text/background가 재사용한다.
- geometry, stroke bounds, graphicSpec, opacity, 일반 color와 API/schema는 유지한다.
- 원·사각형·path·line·빈 fill·text의 실제8bit interior/outline 픽셀과 SVG raster를 비교했다.
- 전체 renderer + 새 atomic preflight/native/browser regressions 73 PASS, docs120 PASS.
- unpacked 실측3,910,160 bytes에 따라 해당 한도만3,911,000으로 조정했다.

## Checkpoint 4 — numeric size sample labels

- continuous sampled size의 기존 block override에 finite numeric display map을 허용했다.
- exact key(0/-0 중복), empty-label text-only 생략, inactive key 보존, []/auto, formatter fallback을 검증한다.
- opacity/strokeWidth/discrete size/gradient/interval은 계속 거부한다. malformed stored numeric map도 거부한다.
- 기본/empty-map graphic identity, domain/raw/area/symbol identity, edges4종, theme/sharedfacet/persistence와
  data/scale/Canvas 관련 기존 회귀685 PASS, 추가 label-map4 PASS, 실제3데이터셋×5 public/SVG15 PASS.
- unpacked3,911,967 bytes→3,912,000 ceiling, search814,532 bytes→815,000 ceiling만 좁게 갱신했다.
  공개 옵션/enum이나 검색 내용을 숨기지 않았다. 기존 한도 통과로 보고하지 않는다.

## Checkpoint 5 — dashed legend borders

- border.strokeDash의 finite/nonnegative/even dense-array grammar와 stable-ID rect↔closed-path materializer를 추가했다.
- 한 닫힌 경로의 네 변 전체에 단일 dash phase를 유지한다. 기본/[]는 기존 rect graphic과 정확히 동일하다.
- 모든11family×4edge geometry/bounds, mutable input clone/freeze, invalid/sparse/odd atomic rejection,
  reset/remove/group/sharedfacet/persistence를 검증했다. guide/persistence/browser 회귀676 PASS.
- 실제 Chromium4edge의 전체 pixels가 독립 continuous-path primitive와 정확히 일치한다.
  실제3데이터셋×5 public lifecycle/SVG15 PASS, installed consumer 실제dash/Persistence/PNG PASS.
- 실측569entries/798,338packed/3,914,211unpacked로 해당한도569/799,000/3,915,000만 갱신했다.
  search815,026bytes에 한도816,000, browser기존한도는 유지한다.

## Checkpoint 6 — independent gradient direction and bottom titles

- #200 A/B: gradient/stroke-gradient accept direction independently from all8anchors,
  optional gradientDirection persists intent; edit-only auto restores edge default.
  Symbols keep a separate direction and restore inactive gradient intent on return.
- Bottom titles clear strip/tick/label fullbounds by native12px, preserve hardbreaks,
  hidden titles and explicit align. Side multi-block lanes retain rigid ramp geometry.
- Existing and new guide/type/card/facet regression679 PASS, docs120 PASS;
  new group/transformed/log/sqrt/symlog/reverse/opacity/Canvas/facet/persistence5 PASS.
- Actual Chromium8edge/direction strip pixel outputs EXACT independent fill rectangles;
  actual real3datasets×5 public/SVG lifecycles15 PASS. Installed consumer actual
  direction/bottom/auto/persistence/PNG and complete package checks PASS.
- Canvas width0 bug discovered by that oracle was separately fixed in d8d9e7e0;
  no default concrete graphic or stored placement fields were rewritten.
- Complete editLegend card3609B→onlyits limit3620B. Package569entries,
  799016packed/3917456unpacked→800000/3918000limits; search/browserlimits unchanged.
- Full final realistic option/literal coverage suite remains required before integration;
  these repeated real-data lifecycles are actual calls, not a claim of full matrix closure.

## Checkpoint 7 — unit block-local positions (#193)

- Existing blockOverrides[key].position owns8anchors; inherit removes only that leaf.
  Selected editLegend/focused layout delegate to the same owner. Existing family
  frame stays separate; local native frames remain transient.
- Local blocks partition before inherited group packing, including group position/at
  or shared appearance edits. Corners retain8px inset, native edge gaps and existing
  explicit family offset/alignment controls reuse their existing owner. Full occupied
  guide bounds detect collisions/overflow atomically. No Canvas growth/new coordinate API.
- Ten existing families×8anchors, alias/merge conflict/reset, wrong persisted owner,
  styles/Canvas/scale/persistence replay5tests and guide/block/type/card/facet regression698 PASS.
  Docs120 PASS; actual3datasets×5 Cartesian public/SVG calls15 PASS; installed consumer PASS.
- Full/Basic installed browsergzip measured393508/190409 above old393000/190000;
  narrowceilings394000/191000. Package569entries/800270packed/3922635unpacked,
  limits801000/3923000. Complete editLegend card3617B stayswithin3620.
- #206 agent owns final facet parent-union local partition/placement using exports
  localLegendPosition(config)/localLegendPlacement(config). This unit checkpoint does
  not claim that remaining parent integration or the full realistic matrix is closed.


## Checkpoint 8 — categorical size-shape fusion (#171)

- 기존 categorical series owner에 explicit size-shape policy를 저장하고 같은
  typed domain의 shape/physical area를 함께 materialize한다. 별도 color owner를
  보존하고 alias edits/removal, split/recombine, scale/Canvas replay를 검증했다.
- split 시 target group owner를 보존해 많은 실제 category도 겹침 없이 pack한다.
  서로 같은 독립 local anchor를 복사해 실제 겹치면 기존 immutable collision
  rejection을 유지한다. local override를 inherit으로 되돌리면 group pack한다.
- axes f3f85def의 순수 block/local query/core property 경계 정리를 동일하게
  적용했다. snapshot의 paired mapping 검증은 pure grammar를 재사용한다.
- 기존 guide/color transition695개, focused4개, source-boundaries8개,
  독립 Chromium 전체 glyph pixels, 3개 실제 TidyTuesday 각5회 lifecycle PASS.
  Full/Basic installed consumer와 docs120/contracts19 PASS.
- create/edit card3438/3704B만3440/3710으로 조정했다. Package573 entries,
  803727/3934180 bytes, browser395897/191800 gzip 실측에만 좁게 조정했다.
- 전체 realistic 옵션별5회/3dataset matrix는 최종 통합 의무로 남아 있다.


## Checkpoint 9 — recipe layer opacity (#208)

- 사용자 승인 faba5a7b/92b4235f normal concrete signal을 구현했다.
  명시 recipe layer만 opt-in하며 기존 block opacity/fallback을 추론하지 않는다.
- root ad99e879/16724999 source-once helper와 viewport fix를 통합했다.
  정상 합성은 완성 glyph source에 destination-in mask를 한 번 적용하여 native
  drawImage(globalAlpha)의2단계 quantization을 피한다. Default/difference 경로는
  변경하지 않는다. Circle은 normal만, rect/path는 normal/difference만 허용한다.
- 독립 literal bounds/pad/clip로 Node432조합, DOM+Offscreen864조합 전체RGBA
  exact, source alpha8bit 식 exact. Transparent/intrinsic alpha, fractional
  DPR1/1.5/2, nested clip, fill/stroke 교차를 포함한다. PDF27조합은 독립 bounded
  glyph를 native PDF로 embed한 결과와 Poppler 전체RGBA exact. 새 tolerance0.
- fullSurface와 boundedSurface의 native intrinsic circle AA/RGB 차이는 Gate
  증거에 남긴다. 독립 reference는 runtime bound/spec을 읽지 않고 literal
  geometry의 stroke bounds와 device1px padding을 계산한다.
- 지원 capability 부족은 target clear/resize 전 거부하며 persistence/replay,
  opacity0/.7/1, recipe reset, 기존 block default의 불변을 검증한다.

- SVG54 literal whole-element references also decode exact in Chromium; legacy
  12cases compare to16724999 with GraphicSpec JSON/SVG bytes and decodedRGBA
  unchanged. Actual3datasets×5repetitions×3opacities exercise all3recipe layers.
- Cumulative merged package578entries/811763packed/3968822unpacked measured;
  limits578/812000/3969000. Full399940/Basic195539gzip→400000/196000 only,
  search819631→820000; all existing cards/coverage floors retained.

- Docs120/compact-boundary-type19/installed consumer all PASS. Full unit3158
  runtime tests passed; the single new-file sharding inventory failure was fixed
  by recording its actually measured1338ms and the3scheduling tests then PASS.
  Focused straight/premultiplied source-over12cases also PASS without tolerance.

## Sample windows (#176)

- Positive finite clipHeight is one canonical block option; whole/focused/block
  editors preserve omission and reset with auto. Unsupported non-point samples
  reject it atomically. Typed samples, mapped areas, paths, glyph IDs and
  opacity-zero geometry remain intact; each composite sample shares one window.
- Nested Canvas visible bounds intersect ancestor windows while root overflow
  remains strict. Asymmetric shapes use their actual glyph anchor, not bbox
  midpoint. Common translation is byte-identical to axes checkpoint d213eaab.
- Focused lifecycle/bounds11 PASS; previous guide regressions702 PASS. Chromium
  DOM/Offscreen36, NodePNG12 and nativePDF4 entireRGBA pairs are exact, with
  independent literal geometry. Stable symbol-window public/primitive PNG+trace
  also exact. Three authentic datasets×five repetitions×three recipe opacities
  cover create/whole/focused/block clip edits, reset, split/remerge and persistence.
- Measured package581/815276/3982153→limits581/815500/3983000; bundles
  401727/197312→401800/197400, search820275→820500. Complete cards
  3507/3838→3510/3840. All other limits and coverage floors remain intact.

- Final full unit3173/3173 PASS; installed Full/Basic/runtime/type/renderer/MCP/
  tutorial consumers PASS. Basic retains its existing creation/rematerialization
  surface; only Full calls its focused editors. Both canonical browser examples
  pass; legend-appearance additionally has exact independent concrete state.
  New example source-link docs checks run immediately after the first commit
  because their canonical branch URLs cannot resolve an uncommitted new file.

- Restored #171 authored local-position conflict checks: group-derived defaults
  no longer masquerade as an explicitly requested reset. Actual public conflicts
  reject atomically; inherited matching anchors and explicit reposition pass.
  Private call intent adds no public/stored fields. V8 confirms the formerly
  uncovered equality callback executes6times in genuine lifecycle regressions.
- Final reset+representation replacement validates final intent together. Updated
  measurements815323packed/3982388unpacked and Full401927/Basic197371gzip
  remain within815500/3983000/402000/197400.

- Coherent final source: full unit3175/3175 PASS, installed consumer suite PASS,
  source-boundaries/compact/type20 PASS. Docs119/120 PASS before first commit;
  only canonical branch source URLs for new examples require that commit.
  Stable symbol-window uses area5000/full circle, H30 crop, radius15 comparator;
  legend-appearance has exact state+pixels and both examples use shared browser
  host/status/accessibility. No image was inspected by eye or VLM.


## Quantitative combined legend source checkpoint

- Added the explicit color-size numeric owner with independent continuous scale
  evaluation, one sampler, aliased color/size block selection, focused/whole/block
  edits, numeric labels, windows, local placement and gradient+size split/reset.
  Persistence recomputes eligibility and both live scale references; incompatible
  shape/field/grain/domain edits and mapped fill/area overrides reject atomically.
- Full unit3183/3183 PASS, then the sampled-color-to-combined edge passed its
  focused regression. Two additional pure eligibility/symbol tests also exercise
  malformed grains, transforms, endpoints and appearance. Installed Full/Basic
  runtime/type/renderer/MCP/tutorial suite PASS, with final source recheck below.
- Stable combined-legends numeric0/5/10 target independently specifies black,
  gray and white samples with radii1/2/3. Graph/order/native calls/fullRGBA exact,
  Chromium DOM/Offscreen x3DPR x3background=18 exact, SVG all6circle positions
  exact, independently drawn native PDF exact. Three real datasets x5 actual
  lifecycle repetitions PASS (canonical exhaustive corpus closure remains pending).
- Restored root's completed bar-compositing slice from8bfd70ff, preserving its
  6862f486 native trace comparison. No bar source behavior changed here.
- Current docs119/120 before source commit; sole failure is the new canonical
  example's source URL not yet existing in this branch commit. Provenance is
  regenerated immediately after commit. No eye/VLM image inspection performed.
- Pending overall scope: canonical full legend-appearance layout target, parent
  color-size integration, and exhaustive realistic option/literal witnesses.
  Named-shapes stable target is delegated by ROOT to data/color owner.

- Postcommit source d2b49552: docs120/120 PASS and the exact final-source
  installed consumer suite PASS (Full404646/Basic199430gzip measurement as
  recorded by the consumer log; final integration remeasures cumulative size).
  Full/Basic numeric combined creation and Full aliases/map/clip/split persisted
  and rendered from the installed tarball, not source-relative imports.
