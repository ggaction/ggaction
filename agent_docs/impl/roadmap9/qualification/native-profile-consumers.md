# Rose·Radar·Streamgraph·Violin consumer owner 감사

## 진행 상태

- [x] 네 family의 Current 계약과 기존 public·수치·선택·렌더러 시험 본문 확인
- [x] 원본 행과 논리 프로필 grain·hit·선택·revision·중첩 composition·접근성·codec 회귀
- [x] native mark/color/scale/axis edit의 실제 rematerialization과 불변성 확인
- [x] Radar와 Violin의 독립 primitive SVG·vector PDF parity 보강
- [x] Violin의 create/edit·밀도·split·Full-only TypeScript 계약 보강
- [x] 네 행의 71개 consumer owner만 추가하고 다른 manifest 값 전체 보존
- [x] owning·렌더러·문서 snippet·구조 검사 및 원본 실패 보존
- [ ] Violin 중단 frame의 offline 사유 보존을 최신 통합 source에서 재검증
- [ ] 네 family의 발견 가능한 installed-package owner 지정
- [ ] 최종 native candidate의 expected/actual/diff 및 전체 qualification

기준은 `cc6dab918bcad9b9dfb80d614068137105ae05f1`이다.
[전체 승인](../AUTHORIZATION.json)과 root의 네 native regression consumer 감사 지시를 재사용한다.
새 API·계산 정책·renderer·shared animation owner·types 선언·공개 문서는 변경하지 않는다.
정본 `test/native-capabilities.json`의 assigned는 담당 시험을 정하는 메타데이터이며 후보 통과 결과가 아니다.

## 실제 보강 범위

`test/unit/profile-facade-consumers.test.js`는 동일한 원본 여섯 행으로 네 **공개 facade**를
각각 호출한다. A의 값은 1/3/2, B는 2/4/3이며 모든 행은 명시 key를 가진다.

- Rose는 원행 세 개씩을 포함한 두 부채꼴이며 radius channel의 집계값은 6/9다.
  A의 각 원값에 0.5를 더한 reviseData 뒤에는 7.5/9가 된다. 면적 mapping을 유지한다.
- Radar는 세 category를 연결한 두 닫힌 시리즈이며 Streamgraph는 wiggle baseline을
  공유하는 두 시리즈다. Violin은 두 KDE 프로필이며 각각 원행 세 개와 정확히 10개의
  derived density sample provenance를 가진다. 여섯 원행을 여섯 drawable 항목으로 세지 않는다.
- Pixel 좌표는 renderer 결과를 재사용하지 않고 fixture의 의미에서 지정한다. Rose의 위쪽
  반원 내부 `(200,110)`, Radar의 180도·값 3 꼭짓점 `(200,225)`, middle wiggle A band의
  `(200,200)`, Violin A band 중심·measurement 2의 `(125,170)`이 실제 session inspect에서
  정확한 A item/owner를 반환한다.
- 명시 A 선택과 강조 뒤 원본을 revise하면 같은 item key, 원 row index와 revision 1,
  새 geometry, 정확한 fill 또는 stroke가 유지된다. accessible items는 두 논리 항목과
  selectedBy `[picked]`/`[]`를 반환하며 editable codec 전후 항목·graphic·접근성 결과가 같다.
- 같은 mark ID를 두 concat 자식에 배치해 childPath·namespace key의 독립성과 한쪽 선택을
  확인한다. 이전 program과 caller rows는 바뀌지 않는다.
- 각 native `editArcMark`/`editLineMark`/`editAreaMark`의 opacity 수정은 geometry를 유지한다.
  이후 categorical encodeColor, 명시 radius/Y domain 변경, axis 생성·label 크기 변경을
  조합해 appearance·geometry·guide가 모두 갱신되고 item identity가 유지되는지 확인한다.
  이 작은 fixture는 axes를 명시 생성하고 side legend는 생략한다. 기존 facade의 완성 guide
  시험과 chart primitive에는 실제 legend 생성·배치도 포함돼 있다.

기존 numerical owner의 면적·Radar summary/normalization·wiggle baseline·KDE 폭/분할
검사를 새 UI 결과와 대체하지 않는다. 각 owner 경로는 manifest에 연결했다.

## Renderer와 선언·문서

Rose의 `radial-sectors`와 Streamgraph의 `streamgraph`/`centered-area-stream`은 기존
Canvas·SVG·PNG·PDF owner를 재사용한다. Radar `polar-line-radar`의 실제 Radar variant,
Violin `cars-acceleration-violins`의 full/split 두 variant에 `vector.render.js`를 추가했다.
기존 manifest의 canonical 공개 프로그램과 독립 primitive만 읽으며 새로운 fixture는 만들지 않는다.

`assertVectorParity`는 전체 SVG 문자열과 geometry를 exact 비교하고 image fallback 부재를
확인한다. 각각 native PDF를 만들어 page/dimension/header를 확인하고 압축 해제된 모든
vector content stream을 exact 비교한다. PDF 픽셀을 검사했다고 바꿔 말하지 않는다.
Streamgraph의 기존 PDF owner는 같은 backend의 decoded pixel exact 비교를 수행한다.
별도 PNG 시험은 네 family 모두 기존 독립 primitive와 same-run decoded pixels를 비교한다.

새 `violin-plot-types.test.js`는 명시 x/y roles, 두 값 split, bandwidth/extent/sample count,
frequency weight, shared/independent profile width, orientation/side/source revision,
weight 제거를 검사한다. 누락 role·세 값 split·quantitative color·unknown side·editor의
appearance 혼용·Basic create/edit는 type error여야 한다. 선언은 변경하지 않았다.

문서는 기존 catalog route/example/image 정합 owner와 family 공개 프로그램을 연결했다.
Rose/Violin의 실제 등록 recipe snippet은 별도로 실행했다. Radar/Streamgraph는 catalog에
연결된 공개 chart와 문서 구조의 근거이며, 미등록된 모든 inline snippet을 실행했다고 하지 않는다.

## Animation의 범위와 발견한 기존 차이

Rose/Radar는 실제 `createRosePlot`/`createRadarPlot` source revise가 semantic-polar와
polar-geometry를 사용한다. Streamgraph는 실제 wiggle `createAreaPlot` source revise가
semantic-cartesian을 사용한다. 각 실제 facade의 0/40/100 ms offline sample equality,
현재 frame에서 새 계획을 시작할 때 시작 객체의 동일성, rebased plan의 30 ms offline
전체 equality를 검사했다. Generic static scene을 이 근거로 사용하지 않는다.

이 branch의 Violin은 `crossfade/unsupported-series`가 명시된 최초 계획과 offline replay,
실제 weighted-blend node를 검사한다. 최초 추가 회귀에서는 rebased plan의 geometry/scene는
같지만 offline restore 후 decision.reason이 `sampled-concrete`에서 `unsupported-family`로
바뀌었다. [원본 로그](native-profile-consumer-evidence/family-first.log.gz)를 보존한다.

Root는 최신 `bb5842ec9`에 이미 있는 retained Cartesian/polar vector 수리에서 최초 여덟
회귀 전체 8/8을 확인했다고 전달했다(root 별도 `.artifacts/profile-facade-root-probe.log`).
그 runtime은 이 branch에 병합하지 않았으므로 여기서는 해당 통과를 소급하지 않는다.
Shared animation 파일은 수정하지 않고 Violin scene-animation owner는 **pending**으로
남긴다. Root가 통합할 때 실제 최신 정책을 확인하고 원 rebase equality assertion을 복원한
뒤 해당 셀을 닫는다. 이 branch의 unsupported-series assertion을 최신 typed 지원의 상한으로
해석하지 않는다.

## 매핑과 실행 결과

| 행 | 지정 | 남은 셀 |
| --- | ---: | --- |
| rose-regression | 18/19 | package |
| radar-regression | 18/19 | package |
| streamgraph-regression | 18/19 | package |
| violin-regression | 17/19 | package, scene-animation |

네 행의 기존 owner는 0개였으며 71개를 추가했다. Package는 실제 family 설치 fixture의
존재만으로 지정하지 않는다. 현재 manifest가 받는 발견 가능한 시험 owner가 필요하며,
generic source-free AST나 source에서 fixture를 실행한 결과는 대체 근거가 아니다.

다른 consumer 행, AT-23/27/28을 포함한 group owner, required/N/A, 결과는 전체 deep-equal로
보존했다. 이 branch의 분모는 요구 30, group 79, consumer target 577이다. Root 최신
574 required + Image N/A 3의 applicability는 root가 네 행 delta만 병합해 유지한다.

Node **22.23.1**, macOS arm64에서 검증했다. [명령·해시·원본 로그](native-profile-consumer-evidence/summary.json):

- 기존 공개 facade·수학·타입·문서·manifest/discovery와 새 회귀: **141/142**. 유일 실패는 새
  unit file의 named capability 등록 누락이었다. 원본을 보존하고 `actions`에 정확한 file
  selector를 추가한 뒤 관련 새 회귀·타입·manifest/discovery **45/45**를 통과했다.
  나머지 통과한 141개를 전체 재실행한 것처럼 보고하지 않는다.
- 네 family의 renderer/PNG **21/21**. 새 Radar SVG/PDF 1개와 Violin 2개를 포함한다.
- 실제 Rose/Violin 문서 recipe **2/2**.
- 준비 중 fixture의 누락 weight.kind 및 작은 Radar canvas의 side-legend 여백 오류는 각각
  명시 frequency weight와 이번 guide test의 `legend:false`로 수정했다. 원본 로그도 보존한다.
- native completion validator는 candidate null, group 79/consumer 577 모두 pending이다.

Runtime와 packed library 입력은 변경하지 않아 새 source coverage·archive·3Node 설치·P95는
실행하지 않았다. 이 checkpoint는 consumer owner 감사이며 native candidate qualification,
전체 STEP-077 완료 또는 release 완료가 아니다.
