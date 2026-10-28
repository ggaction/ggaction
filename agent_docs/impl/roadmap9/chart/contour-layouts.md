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
