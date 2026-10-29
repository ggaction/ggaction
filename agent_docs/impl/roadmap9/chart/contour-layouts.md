# Grid contour와 point-density contour

## 진행 상태

- [x] STEP023 및 structure-recipes 계약 대조
- [x] 남은 설계·시각 Gate의 기존 명시 승인 기록
- [x] 순수 grid/marching/ring 계산과 독립 수치·위상 oracle
- [x] 명시 histogram/KDE → 같은 scalar grid
- [ ] 공개 resource/action·저장·revision·소비자 계약 구체화와 구현
- [ ] 모든 renderer·타입·문서·실제 자료·설치 검증 및 checkpoint

승인은 [AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`을 재사용한다.
사용자의 STEP077까지 남은 설계·시각 결정을 포함한 명시 승인으로 질문을 반복하지 않는다.
승인은 구현 완료나 검증 성공을 의미하지 않는다. Flow의 source checkpoint `9d59bafe4`를
기준으로 별도 worktree에서 독립 계산을 준비하며 Flow의 최종 coverage 의무는 그대로 남긴다.

## 순수 계산 계약

`src/grammar/contour/`는 프로그램·trace·renderer 없이 명시 입력을 받는 순수 owner다.
regular nodal grid는 `{origin:[x,y],dx,dy,width,height,values}`이며 양 축 최소 두 점,
양의 finite step, row-major finite scalar 또는 명시 `null`을 받는다. `null` corner를
포함하는 quad 전체를 제외하고 그 경계가 hole/domain boundary가 된다. sparse/undefined,
accessor, 비정규 배열·레코드, 비유한 scalar와 좌표 표현 불가능은 오류다.

오름차순·중복 없는 finite thresholds의 `z >= threshold` superlevel을 계산한다.
cell edge crossing은 같은 grid edge와 threshold에 단일 canonical identity를 부여해
공유한다. endpoint 반올림 오차는 vertex identity로 합치며 멀리 떨어진 영역을 tolerance로
붙이지 않는다. ambiguous saddle은 scaled determinant의 asymptotic decider를 적용하고,
정확한 tie에서는 TL–BR 대각선의 연결을 유지한다. bilinear center sign만으로 결정하지 않는다.

clockwise directed cell boundary와 threshold segment를 합친 뒤 역방향 shared edge를
소거하고 closed ring을 만든다. point-touch는 별도 ring으로 보존한다. normalized grid
좌표의 winding과 containment로 outer/hole을 분류하며 disconnected islands를 연결하지
않는다. domain extent와 missing mask에서 닫힌 경계도 같은 결과에 포함한다.

filled band는 `[lower,upper)`이고 마지막 band만 upper inclusive다. lower와 upper의
동일 threshold crossing/segment owner를 재사용하며 cell edge의 band 구간을 합쳐 닫는다.
한 threshold, all-missing, constant grid의 빈 polygon 결과도 명시 level metadata를 유지한다.
기존 generated-item/work budget으로 입력·출력·반복 계산을 제한하고 caller 입력은 보존한다.

### Point-density 계산

`estimateContourDensity(points, options)`는 `{x,y,weight?}`의 닫힌 record 배열과 명시
`estimator:'histogram'|'kde'`, `normalization:'unit'|'count'`, grid frame을 받는다.
weight 생략값은1이며 finite 비음수다. empty/0 total weight는 전부0인 grid다.
결과는 resolved grid·estimator·normalization·sourceCount·totalWeight를 반환한다.

histogram의 origin은 bin 중심이자 scalar sample 위치다. bin extent는 sample 양끝에서
각각 반 step 확장되며 마지막 upper edge만 포함한다. 기존 `findHistogramBinIndex`를
재사용하며 bin extent 밖의 입력은 오류다. count는 weight sum/binArea,
unit은 weight sum/(totalWeight×binArea)로 density 단위를 보존한다. KDE용 옵션은 거부한다.

KDE는 명시 bandwidth `[hx,hy]`와 gaussian/epanechnikov/uniform/triangular kernel을 받는다.
기존 1D density와 단일 `densityKernels.js` table을 공유하는 product kernel이며
sum(weight×K(dx/hx)×K(dy/hy))/(hx×hy)에 unit이면 totalWeight도 나눈다.
grid 밖의 point도 kernel support에 따라 기여한다. 이산 grid를 재정규화하거나 halo를
자동으로 추가하지 않는다. 큰 좌표 차이와 bandwidth 곱의 중간 overflow/underflow를
피하고 최종값이 finite로 표현되지 않으면 오류다. 기존1D 공개 API와 수치는 그대로다.

### 독립 계산 checkpoint의 검증 범위

canonical focused unit는 contour와 기존 density의 source/action/encoding/mark/guide 회귀를
실행한다. private kernel의 수치·위상 검사는 hill/saddle/donut/island/constant/null,
선형 scalar plane의 독립 half-plane clipping 면적, deterministic varied/masked grids의
band 면적 보존 및 영역 단일 배정, Gaussian 공식, compact kernel의 수치와 적분,
histogram 최종 endpoint, caller isolation·descriptor·finite·budget 실패를 포함한다.
새 owner에는 기존 grammar family floor95/90/100을 적용하며 기준을 낮추지 않는다.
명령·log hash·source input hash와 결과는 같은 디렉터리의 evidence JSON에 기록한다.

확정 결과: focused regression103/103, boundary/discovery27/27, private coverage16/16 및
100/97.92/100. 기존95/90/100 floor를 신규6owner 모두 통과했다. 추가 source 파일을 포함한
package dry-run은 Node20/22/24에서825entries, 최대1,206,098packed/5,540,055unpacked이며
최소1000byte 단위 ceiling을 적용한다. 이는 전체 installed consumer 검증을 대신하지 않는다.

## 후행 공개 소비자 의무

이 기록의 현재 결과는 private 계산뿐이다. 공개 resource/action·persisted schema와
point-density estimator/bandwidth/normalization, source provenance, 정확한 revision closure,
contour-line/filled mark의 position/color/guide/selection/composition·모든 backend·scene·codec·
types·installed consumer는 STEP023의 필수 범위로 남아 있다. 단순 heatmap 대체는 하지 않는다.
공개 primitive와 dataflow를 구체화한 뒤 같은 승인 범위에서 구현·검증하며 AT24를 닫는다.

## 공개 구현 계약

Root가 같은 `remainingApproval` 범위에서 아래안을 확인했다. 새 `geometry` kind는
`options.method:'contour'`의 닫힌 경로만 지원하며 아직 없는 다른 geometry용 추상화는 만들지 않는다.

- `createContourData({id,grid,thresholds})`는 inline scalar grid를 보관한다.
- `createDensityContourData({id,data?,x,y,weight?,grid,estimator,normalization,bandwidth?,kernel?,thresholds})`는
  explicit/current/unique materialized dataset과 엄격한 finite 좌표·비음수 weight를 사용한다.
- `editContourData({target?,grid?,thresholds?,data?,definition?})`는 source kind를 유지한다.
  inline은 grid/thresholds를, density는 data/definition/thresholds를 바꾼다. density의 grid는
  definition patch 안에 둔다. 빈 patch·undefined·서로 다른 source kind의 옵션은 거부한다.
- `createContourMark`와 `editContourMark`는 `geometry` exact ref와 `mode:'line'|'filled'`를 사용한다.
  position x/y와 color는 intrinsic geometry 좌표·threshold/band 값을 기존 scale owner에 전달하고,
  같은 scale을 axes/legend와 공유한다. arbitrary dataset field를 geometry 값으로 재해석하지 않는다.
  line은 threshold superlevel의 모든 경계(영역/missing 경계 포함), filled는 인접 threshold band다.

Geometry resource는 `kind,id,revision,algorithmVersion:'1',ownership:{mode:'authored'},inputs,options,result,provenance`의
기존 envelope를 사용한다. options는 `{method:'contour',source:'grid'|'density',thresholds,definition?}`,
result는 `{contours,density:null|{totalWeight,sourceCount}}`다. inline grid의 유일한 저장 위치는
`result.contours.grid`다. density definition의 grid는 frame만 가지며 values는 계산 결과에만 있다.
inline inputs와 sourceRows는 빈 배열, density는 exact data input 하나와 모든 source row key를
`density-point` role로 보존한다. source kind를 inference로 추측하거나 값이 잘못된 행을 버리지 않는다.

복원 검증은 source/density/grid/threshold/ring의 일관성을 확인한다. 결정적인 bounded contour
추출과 density 수치를 검산해 exact 동등성을 검사하되 저장 geometry를 교체하거나 materializer·renderer를
호출하지 않는다. self-hash만 맞는 임의 결과는 허용하지 않는다. 기존 generated-item/work 한도는
검산에도 적용한다. 이 경계는 force relaxation을 실행하여 저장 배치를 덮어쓰는 동작과 다르다.

Source revision은 geometry→shared scales→marks/guides→selection을 사전 계산·검증한다.
오류는 원본 program/trace를 보존한다. final item은 line의 threshold 또는 filled의 band bounds이며
분리된 island는 child path로, hole은 같은 nonzero compound path의 반대 winding으로 보존한다.
identity에는 resource lineage와 exact source rows를 결박하고 source revision에도 같은 level/band key를
유지한다. 빈 level metadata는 남기지만 가짜 drawable을 만들지 않는다.

### Public consumer checkpoint progress

공개 자원·마크·원본 갱신·복원·선택 경계 17개, 수치/차트 통합 focused coverage 40개가 통과했다. 새 owner의 coverage는 lines 100 / branches 97.25 / functions 100이며 기존 family floor(95/90/100)는 변경하지 않았다. 동일 source의 모든 geometry 후보를 먼저 계산·preflight하고 공유 scales/marks/guides union을 최종 상태에서 한 번 materialize한다. 두 geometry 공유 scale과 두 번째 후보 실패의 원자성 회귀가 포함된다.

Canvas/SVG DPR 1/2 다섯 variant 및 PNG/PDF 독립 primitive 10개 통과. holes와 filled band 실제 PNG를 확인했으며 빈 중심, 비겹침 band 경계와 제목/여백이 reference와 일치한다. 명시 hconcat/vconcat 및 scoped edit 지원; implicit facet/repeat partition은 현재 거부하며 STEP035에 geometry/source partition 의미를 결정·연결할 의무를 남긴다. 기존 승인 scope를 삭제하지 않는다.
