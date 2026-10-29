# 공개 애니메이션 저장·출력 후보 증거

승인: [remainingApproval](../../AUTHORIZATION.json#remainingApproval). 공개 소유 계약은
[ANIMATION](../../../../contract/current/ANIMATION.md)이며 전체 typed family/STEP077 완료를 뜻하지 않는다.

## 입력과 결과

- 기본 planner/rebase 69cb70d0c, 공개 player d86e49cd3의 지정 source/test delta를 반영했다.
- runtime/types/boundaries 143/143. 새 7 source owner의 40검사 coverage 100/98.74/100이며 기존95/90/100 바닥을 유지한다.
- actual image/font bytes를 저장한 두 fresh process에서 network0, 같은 time의 scene/SVG/PNG/Canvas 해시 및 lease cleanup을 검증했다.
- Browser Canvas/SVG DPR1/2와 PNG/PDF 세 time의 내부 pixel oracle을 사용한다. PDF 최초 glyph gap 표본은 antialias 경계였고 x32→52로 실제 흰색 내부를 측정했다. geometry/tolerance는 바꾸지 않았고 첫 실패를 보존했다.
- 정확 archive SHA256은 `67d01611f7fac2ebdb0a57c70cbdc33cdea4e4f1ae69848101ae6e3dac27224b`이다. Node20/22/24 모두 공개5cases+strictTS+실행문서+animation browser bundle을 검사했다.
- Node20의 첫 임시 snippet harness는 존재하지 않는 svg 변수를 읽었다. 실제 문서는 이미 SVG를 출력했으며 harness만 renderToSVG(frames[1])로 수정했다.
- 설치 bundle185433gzip이 source측정185007보다 커185100cap에서 처음 실패했다. 동일 archive bundle만185500cap으로 재검사했으며 Node20의 두 receipt를 합쳐 증거로 사용한다. Node22/24는 모두 한 번의 최종 receipt로 통과했다.
- source package실측은1129 entries/최대1605581 packed/7282271 unpacked이고 caps1129/1606000/7283000이다. published release 검증이 아닌 이 branch의 공개 연결 checkpoint다.
- 전체 docs227 중224pass/3fail은 검색예산2건과 runtime 참조 freshness1건이었다. 실측1077627bytes→1078000cap 및 canonical runtime 재생성 뒤 owning31/31로 닫았다.
- package manifest 최초실패는 merge된 interaction2case 순서였고 원 case/statement 수를 유지한 채 source순서로만 동기화했다.
- discovery의 이전58/recipes 누락은 root757a4456e의 정확 수리를 재사용했다. 새 child helper는 parent가 실제 URL export를 import하고 fresh-process main만 네트워크 guard를 설치한다.

## 명령과 남은 qualification

실행기 `qualify-package.mjs.txt`는 repository root의 `.artifacts/`에서 실행하며
ANIMATION_PACKAGE_SPEC으로 위 exact tar를 고정한다. Node별 PATH도 해당 Node bin을 앞에 둔다.
Node20 bundle최종은 ANIMATION_BUNDLE_ONLY=1이다. 3Node의 원자적인 모든 runtime 검증을
전체 release sweep으로 집계하지 않는다.

source pin 뒤 provenance/generated references 및 built HTML/responsive browser 최종 검증을
별도 기록한다. 실행/렌더의 원본은 test/unit/animation, test/browser/animation-offline.browser.js,
test/charts/cross-feature-integration/variants/animation/offline.render.js이다.
