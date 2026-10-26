# 0.0.25 통합 릴리즈

## 진행 상태

- [x] 최신 GitHub branch/PR/issue 및 공개 0.0.24 확인
- [x] overlay/composition branch와 보안 PR #275를 별도 통합 branch에 병합
- [x] 통합 baseline 검증과 테스트 감사
- [x] #274 categorical overflow summary symbol
- [x] #271 interval color/stroke + size + ordinal shape 단일 범례
- [x] 새 기능과 기존 composition/guide lifecycle 회귀 보강
- [x] 정확한 source provenance, 공개 타입/계약/문서 및 LLM 생성물 동기화
- [ ] 전체 source/coverage/realistic/browser/render/package/docs/platform CI
- [ ] main 병합, annotated tag, 동일 candidate의 npm/GitHub/Pages 배포 및 공개 해시 검증

## 승인과 범위

2026-10-26 사용자는 새 branch/PR/issue를 모두 반영하고 정리하며, 테스트를 다시 점검한 뒤
새 릴리즈를 게시하라고 요청했다. 구현·통합·PR·패키지/문서 배포를 포함하는 요청이다.
기존 [번역 지원 API의 포괄 승인](../facet-content-flow/PROPOSAL.md#승인과-범위)을
같은 source-neutral 범례 기능 확장에 재사용한다. 공개 기본값, 기존 저장 프로그램과
semantic/graphic/renderer 경계를 유지한다. 별도 모델 서비스 호출과 원본 corpus admission은
이 저장소 릴리즈와 구별한다. 실행 증거가 없는 외부 fidelity 성공을 선언하지 않는다.

## 동결한 통합 입력

- main / v0.0.24: `fd5c4073fc80295c513bd099ac0ff0aa83059371`.
- `codex/overlay-composition-v025`: `23847e1c630bef7f05688d973c267e4cbf8c3188`.
  기존 승인된 overlay, independent layer, adjacent/shared scales, scoped atomic edits,
  guide ownership/visibility/position, text alignment/overrides, immutable computation 재사용을 포함한다.
- 추가 사용자 요청으로 `913fca08d819584017d370afaeab35e69f5bcbf0`도 통합한다.
  원본 row provenance, 복합 mark highlight, text highlight 및 `getMarkItems` 확장이며,
  selection의 저장 복원·재평가·독립 geometry와 전체 CI를 새 source 기준으로 다시 확인한다.
- PR #275 / fast-uri 3.1.9: `583e8e6a7f3a813d5935c7cfe69057c2b79589a3`.
- PR #270 및 닫힌 #265–269/#272/#273은 이미 main에 포함되어 있다.
- #258 native content-flow는 0.0.23에서 출시되었다. 원본 family의 외부 번역 검증은 여전히
  별도 증거가 필요하므로, issue의 오래된 진행 설명만 보고 코드를 재구현하거나 완료 처리하지 않는다.

## 범례 계약

### #274

기존 `overflow`에 선택적인 `summarySymbol: "first-hidden"`를 추가한다.
Categorical line-only sample recipe에서 최종 정렬 domain의 첫 숨겨진 값으로 기존 색/선/opacity
mapping을 평가하고 summary row에 한 개의 sample을 그린다. 실제 domain/data/labels는 바꾸지
않는다. 생략은 기존 text-only summary이고 숨겨진 값이 없으면 추가 sample도 없다.
다른 legend family/recipe는 이 opt-in을 명확히 거부한다. 생성, 편집, reset, order/scale/data,
resize, persistence, shared layout 및 실제 painted symbol 개수를 검증한다.

### #271

`combine: "color-size-shape"`는 한 Cartesian Point owner의 동일 field/grain에 연결된
interval color 또는 stroke, interval size, ordinal shape를 하나의 block으로 표현한다.
`channels`는 `["color","size","shape"]` 또는 `["stroke","size","shape"]`이며 hue owner가
둘 다 있으면 명시 선택한다. 두 interval scale의 threshold 경계가 같아야 한다.
기존 `color-size`와 `size-shape`의 의미·기본값은 바꾸지 않는다.

Ordinal shape는 interval bin으로 재해석하지 않는다. 각 interval에 한 개씩 대응하는 오름차순
finite `values`를 명시하게 하여 모호한 shape 대표값을 추측하지 않는다. 각 실제 sample value를
세 원래 scale로 평가하고 interval labels를 유지한다. 기존 Point shape materializer를 사용하여
면적/shape geometry를 일치시키며 stroke/fill ownership과 opacity도 유지한다.
Mapped size/shape/hue를 고정 symbol override로 덮어쓰지 않는다. 잘못된 value 개수, interval
소속, field/grain, owner와 scale 변경은 원자적으로 거부한다.

## 테스트 검토 기준

검사 개수나 높은 coverage만으로 완전성을 주장하지 않는다. Literal expected values와 독립
geometry/paint 근거, immutable edit/restore, 부정 입력, 동일 최종 상태의 경로 수렴, packed
consumer와 browser/renderer parity를 검증한다. 새 옵션 때문에 기존 exhaustive literal witness가
줄어들지 않게 inventory를 확인한다. Coverage 기준/critical floors를 유지하고 실패를 skip하지
않는다. 실제 파일/압축 예산을 넘으면 측정값과 원인을 기록하며 무관한 한도는 바꾸지 않는다.

## #274 구현 checkpoint

- Full stroke와 Basic color line sample, 44개 series/906개 numeric row 보존, 29 labels + summary와 30 painted samples, final order/scale/resize/restore/reset/atomic rejection을 확인했다. 독립 추가 line primitive와 PNG bytes도 일치한다.
- 관련 22개 검사가 통과했다. 전체 baseline은 6,237개 중 runtime 6,236개 성공, stale action-card 1개 실패였으며 재생성 후 해당 검사가 통과했다.
- 새 grammar module 1개에 맞춰 package entry cap만 649→650으로 조정했다. 두 legend action-card budget은 새 typed policy를 담는 실제 크기에 맞춰 각각 40/50 bytes만 확장했고 전체 package bytes/coverage floor는 유지했다.

## #271 및 테스트 감사 checkpoint

- Native Full/Basic color·stroke + size + shape, threshold/quantize/quantile, ordinal fallback, 실제 symbol 면적, 상속 paint, shape scale 편집, shared facet/grid/repeat, clip/reflow, 저장 복원 및 잘못된 입력의 원자적 거부를 검증했다. Browser Canvas/SVG와 packed PNG/PDF consumer도 추가했다.
- Shape scale 편집이 결합 범례를 갱신하지 않던 dependency 누락과 resource reference의 shapeScale 누락을 고쳤다.
- 기존 2-channel 범례를 포함하는 guide 검사 1,118개가 통과했다. 새 lifecycle/부정 입력을 추가했고, 독립 geometry/PNG oracle을 유지했다.
- 생성 action 카드에서 누락된 createLayerPlot을 복구하여 public actions 291개, 옵션 경로 24,410개를 inventory에 반영했다. 실제 원본 데이터 3개에서 native constructor 28개의 독립 layer를 반복 생성하고 owner, 원본 행, 불변성, persistence를 확인했다. 경로 수 자체를 모든 옵션 실행 증거로 주장하지 않는다.
- 새 문서 예제는 완전한 실행 가능한 프로그램으로 등록했다. Related navigation을 마지막으로 옮겼고 search excerpt를 10자 줄여 기존 857 KB 제한을 유지했다.
- 기존 overlay branch부터 Full/Basic gzip은 488,691/247,648 bytes로 기존 482,000/245,000 제한을 넘었다. 새 범례를 포함한 측정값 490,524/249,238 bytes에 맞춰 492,000/250,000으로 제한을 조정했다. Packed tarball 966,885 bytes에 맞춰 packed cap만 970,000으로 조정했고 unpacked 4,560,000, SVG 25,000 및 coverage floor는 유지했다. 최종 candidate에서 다시 검증한다.
- Compatible security update: body-parser 2.4.0, zod 4.6.7, qs 6.16.1, content-type 2.1.0. npm audit 0 vulnerabilities.
- 2026-10-26 원격 branch/PR/issue 재조회에서 추가 입력은 없었다. #258 외부 원본 family의 fidelity 검증은 증거가 없으므로 계속 별도 추적한다.

## 통합 CI 수정 checkpoint

- 독립 layer/adjacent render를 canonical gallery metadata에 연결했다. 209개 gallery variant의 schema 및 review 검사를 통과했다.
- Direct encoding의 constant shape와 polygon normalization을 실제 5개 데이터셋에서 실행하여 310 paths, 305 path literals, 12 diversity requirements의 5/3 조건을 통과했다. Palette 객체도 independent layer를 포함한 136 paths/145 builds로 검증했다.
- Parent legend의 alongOffset을 독립 좌표 기대값에 포함했고 268 paths/188 literals/4 diversity requirements 검사를 통과했다. Polar facade fixture는 theta-axis text와 bottom legend 사이의 공간을 명시했다.
- Linux와 macOS의 설치 폰트 차이로 생긴 PNG 비교 오류를 수정했다. 같은 native font 자원으로 비교하며 byte-exact pixel 조건을 유지한다. 큰 typed-array 실패 출력은 bounded byte comparison으로 바꿨다.
- Coverage floors와 5회/3개 데이터셋 기준은 낮추지 않았다. 새 branch 통합 후 전체 CI 및 release candidate 검증은 여전히 필수다.

## 추가 push 및 row provenance 검증

- `7cbdaea2f3362970cd8e1289c5877d6b6a526892`의 immutable graphic-item lookup 재사용도 추가로 병합했다. Caller-owned array를 캐시하지 않는 회귀 검사가 통과했다.
- 복합 selection owner의 저장/복원 검증, component selection을 참조하는 label 삭제 보호, filtered duplicate-row의 정확한 원본 위치 복원을 고쳤다. Materialization cache에 원본 행 index를 기록하며 입력 table에는 숨겨진 필드를 추가하지 않는다. 기존 source/dataset reference와 같은 수명으로 정리한다.
- 행 선택·저장 복원·discovery/sharding 관련 27개 검사가 통과했다. 실제 5개 pinned dataset에서 13개 새 required option paths를 실행하고, 원본 보존·선택된 Text paint/font·editable persistence를 검증했다. Packed consumer에도 동일한 공개 동작을 추가했다.
- Cartesian exhaustive matrix에 가로 선 집계/분류축과 범례 정렬·위치 witness를 추가한다. Composition routing의 `facetSource:true`는 5개 실제 dataset에서 4개 facade의 persistent facet source와 저장 복원을 검사하는 scoped matrix로 분리한다.
- 최종 source 기준 Full/Basic gzip은 494,095/254,104 bytes, package는 654 entries, packed 974,141/unpacked 4,573,680 bytes다. 행 provenance/inspection 및 lookup 기능에 맞춰 각각 495,000/255,000, 975,000/4,580,000 caps로 제한한다. SVG와 coverage floor는 유지한다.
- 전체 source/coverage/realistic/browser/render/package/docs/platform 및 tag candidate 검증은 진행 중이다. 앞선 source의 성공 결과를 최종 source의 전체 성공으로 간주하지 않는다.

- CI의 Node 22/24에서 같은 source를 pack한 압축 크기는 976,241 bytes였다. 로컬 Node 23의 974,141 bytes와 압축 구현 차이가 있어 packed cap을 978,000 bytes로 조정한다. 실제 source/unpacked 한도는 그대로 유지한다.

## 최종 source 및 실제 실행 보강

- 880 Cartesian facade charts에서 모든 배정 path/literal/diversity의 5회/3개 dataset 조건이 통과했다. 합법적인 가로 집계와 단일 범주 데이터의 원본 행 순서 사례를 포함한다.
- 추가 profile 때문에 advanced minimum/declared targets는 1,555/1,577로 늘었다. 3,600-chart 총량과 기존 모든 required recipe를 유지하며 단순 tier의 여유 슬롯 하나를 advanced로 이동해 dataset당 simple/intermediate/advanced/composite를 6/27/32/7로 배정했다. Capacity 계약이 통과했다.
- 전체 source 6,274개 중 기능 검사 6,272개가 통과했으며 source import boundary와 새 lookup 테스트의 capability 등록 2건을 수정했다. 관련 35개 검사가 통과했다. Import boundary는 완화하지 않고 순수 ownership 조회를 selectors로, 저장/실행 공통 row bounds 검증을 grammar로 옮겼다.
- Coverage는 line 95.78%, branch 93.34%, function 98.72%였다. Critical floor 별도 점검으로 interval center의 source-row 재평가 실행 누락을 찾아 point와 owned error bar가 함께 바뀌고 복원/해제되는 회귀 검사를 추가했다. 수정된 최종 source로 전체 coverage를 다시 실행한다.

## 최종 렌더 검증

- 최종 source `4281e73a`에서 6,275 tests/0 failures/0 skips, line 95.80%, branch 93.36%, function 98.73%, 182 critical floors가 통과했다.
- CI의 source와 295 browser 검사는 통과했다. Render에서 확인한 PDF literal fixture의 폰트 자원을 native renderer와 같게 맞췄으며, 실패 출력은 bounded byte comparison으로 제한했다. 픽셀 허용 오차를 추가하지 않았다.
- CI의 Linux Polar PNG 3개를 내려받아 직접 검토했다. 텍스트 잘림 없이 의도한 차트가 그려지며, 각 primitive/public decoded pixels가 byte-exact 일치했다. Native fallback 폰트가 바꾼 잉크 외곽만 Linux baseline에 반영했고 기존 tolerance와 ink-density/region 조건은 유지했다. 관련 PDF/PNG 검사 5개가 통과했다.

## 계층형 facade의 실제 옵션 실행 보강

- CI에서 확인한 극좌표 축/범례 정렬, 범례 alongOffset, Strip/Beeswarm/Raincloud missing 및 Radar wide summary/normalize 실행 누락을 실제 데이터 profile에 추가했다. 평균과 중앙값은 원본 반복 그룹에서 계산하고, 각 wide Radar witness의 기본 theta/radius 자원을 제거해 정규화 유무에 따른 이름 충돌을 막는다.
- Strip/Beeswarm/Regression에는 stroke encoding 입력이 없으므로 color-size-shape 범례의 mapped fill을 고정 값으로 덮어쓰는 symbol.fill은 실행할 수 없다. 해당 3개 facade 타입에서만 이 잘못된 허용을 제거하고, 유효한 stroke/opacity 및 Scatter의 mapped-stroke fill을 보존하는 컴파일 회귀를 추가했다. 테스트 제외를 추가하지 않았다.
- 재계산한 public inventory는 24,424 option paths, 16,904 required paths, 30,363 ledger requirements다. 나머지 literal/diversity 및 5회/3개 데이터셋 기준은 유지한다. 최종 전체 CI와 annotated-tag candidate 검증은 여전히 필요하다.
- 8개 실제 데이터셋의 계층형 facade 전체 path/literal/diversity 검사가 391.3초에 통과했다. 공개 inventory 검사, facade 타입 회귀, 문서 158개 검사가 통과했다. 새 타입 기준 package는 654 entries, packed 974,397/unpacked 4,574,796 bytes로 기존 한도 이내다. `b1b36589` source/type commit을 기준으로 release provenance와 공개/LLM 생성물을 다시 동기화했다.
