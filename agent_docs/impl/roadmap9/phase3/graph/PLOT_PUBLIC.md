# GraphPlot 공개 checkpoint

## 진행 상태

- [x] node/edge/label/arrow 명시 materialization, typed logical identity, source→graph→layout→plot 갱신
- [x] 선택·강조·inspection·접근성·저장·scoped composition·Full/Basic 경계
- [x] directed/parallel/self-loop primitive와 공개 결과의 구조·픽셀 일치
- [x] 같은 package archive의 Node20/22/24 전체 설치 consumer
- [x] 문서·타입·현재 계약·생성 inventory 및 affected realistic 검사
- [ ] inference/filter/facet/P2/controller와 후행 전체 consumer matrix

Runtime source는 `7659f0f7f`, generated docs의 source revision은 `fda41f628`다. 두 commit 사이 src/types 차이는 없다. [전체 승인](../../AUTHORIZATION.json)과 [primitive 증거](PLOT_VISUAL.json)를 재사용했다. [manifest](plot-evidence/manifest.json)에 source hash, 최초 실패, 보정 결과와 최종 receipt를 보존한다.

## 구현 및 검증

공개 createGraphPlot/editGraphPlot은 고정·원형·seeded force layout을 읽어 concrete collection을 만든다. 병렬 간선·self-loop·arrow는 각 logical edge의 identity와 source rows를 유지한다. Label은 node의 별도 graphic role이다. Graph/layout/source 수정은 후보 전체를 검사한 뒤 각 plot을 한 번 갱신한다. Canvas resize와 paint 수정은 graph topology를 바꾸지 않는다.

- 핵심 closure 44/44. 10개 critical owner의 line/functions100%, aggregate branch96.72%; 기존 floor 모두 통과했다. Plot 단독 focused34/34도 보존했다.
- Primitive/public concrete structure 및 PNG10/10. 같은 실행에서 Canvas mock와 SVG exact 비교 및 PNG decoded exact equality를 검사했다. Native PDF3/3, browser Canvas/SVG와 DPR1/2·공개 example 총5/5.
- 실제 dataset5개×layout3종과 generated lifecycle focused8/8. 공통 builder의 affected3개 realistic 파일은 canonical bounded runner27/27, 917,595ms. 앞선 layout baseline의 full direct lifecycle26/26는 별도 LAYOUT_PUBLIC 기록이며 새 GraphPlot 전체50dataset 실행으로 바꾸어 주장하지 않는다.
- 전체 unit 첫 실행5584/5585: 유일한 mark vocabulary expectation을 수정한 owning 검사 통과. 전체 contract 첫 실행715/722: action catalog·internal owner·H0 list/trace·completion count·summary override·package cap·source boundary를 보수했다. 보수60개 중59 통과 뒤 마지막 source boundary를 고쳐 owning18/18. 전체 suite를 다시 실행한 것으로 표시하지 않는다.
- Generated feature inventory 첫7개 중6 통과; 유일 redacted-array count8980→9148을 실제 inventory와 맞추고 해당 검사1/1 통과. Source coverage와 realistic sweep는 분리했다.
- Types1/1, docs171/171. Built155pages/1313LLM artifacts. Desktop search 및320/390/768px 전체 문서 browser 검사 통과.

## 고정 설치 artifact

SHA256 `bedcfc949b82a557d8136c94abb4a61cb843811043ee2b2116f25b1a084b74ce`인 같은 archive를 Node20.20.2/22.23.1/24.22.1의 세 실행에 사용했다. 매번 runtime212/212, tutorial75/75, qualification7/7이며 시작·종료 archive hash가 같다. 재포장한 서로 다른 tar를 같은 것으로 취급하지 않는다.

Node20 canonical measure는810entries, packed1,193,083/unpacked5,488,863bytes; Node22 최종 archive는 packed1,190,353이며 unpacked가 같다. 한도810/1,194,000/5,489,000. Node20 Full595,806/Basic345,437 gzip을 근거로 최소 한도596,000/346,000을 적용했다. 이전 cap 실패도 증거에 남겼다. SVG 한도25,000은 유지했다.

## 남은 의무

이 checkpoint는 GraphPlot 공개 사용과 현 consumer 검증을 닫는다. STEP-021 전체 및 Roadmap9 완료는 아니다. induced-view filter, graph-specific facet/repeat 의미, inferred graph·route/bundling, P2 shadow/outline 확장 소비자, animation/controller 및 최종 전체 matrix를 후행 작업에서 닫는다. Primitive review history를 런타임 dependency로 만들지 않는다.

최종 cap 변경 뒤 package-boundaries/package-artifact owning 검사는 통과했다. 첫 단수형 selector 오타로 실행되지 않은 명령은 실패 기록에 보존하고 실제 복수형 파일로 다시 실행했다.
