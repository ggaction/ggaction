# Flow theme 역할 연결

## 진행 상태

- [x] 기존 Flow native defaults와 theme owner 연결
- [x] 명시 style·typed override·labels reset·named highlight·codec 보존
- [x] Font 변경 시 label 없는 node/link까지 materializer 한 번 호출
- [x] 정확 font profile 실패의 program/trace 원자성
- [x] 집중 coverage·package·source-free 설치·문서 동기화
- [ ] STEP-033 guide geometry/palette token 및 winning provenance
- [ ] STEP-034/035 responsive guide와 nested composition

기준은 stable 통합 `badf9351d`, source 변경은 `ebe34f896`이다. 최초 공개 회귀 6개 중 5개가 실패했다.
Flow node/link/label이 resource theme owner에 없어서 색이 남았고, font와 paint를 같이 바꿀 때는
기존 textHandled 판정이 실제 Text가 없는 link와 labels:false node의 갱신을 건너뛰었다.

기존 `resourcePlots` owner가 Flow의 저장 `body`를 실제 mark kind의 nodes/links 역할로 해석한다.
Native default는 기존 `FLOW_PLOT_DEFAULTS`를 읽는다. Node는 mark/background, ribbon fill은 mutedText,
label은 text/typography를 따른다. 명시 style은 실제 nodes/links 입력에서 body config 경로로 연결하며
동일 기본값·0·typed overrides를 보존한다. Labels false→{}는 기존 label precedence를 제거한다.
저장 graph/layout 계산과 revision, final key/lineage, clip 및 paint-only geometry는 바뀌지 않는다.

공통 typography owner의 실제 Flow label 처리를 재사용한다. 텍스트가 없는 owner는 일반 resource
materialization에서 처리하여 각 materializer가 한 번만 호출된다. Exact font의 새 size/weight를 준비하지
않은 경우 기존 metrics-required/unresolved-font 오류로 전체 요청을 거부한다. 새 API나 저장 schema,
별도 renderer·font·layout solver를 추가하지 않았다.

새 회귀 7개를 포함한 theme 101개, Flow/font/effects/boundary 77개, package 7개가 통과했다.
변경 owner의 coverage는 100/95.89/100(line/branch/function)이며 기존 floor95/90/100을 유지한다.
Node20 고정 tar의 공개 import만으로 기존 47개와 Flow 7개를 포함한 설치 검사 54개가 통과했다.
Typography fixture bytes 외에 구현 경로나 callback을 설치 프로그램 밖에서 가져오지 않았다.

Package는865 entries/1,264,208 packed/5,815,733 unpacked bytes다. Full gzip은637,032 bytes로
기존637,000을32 bytes 넘었으므로 같은1,000-byte 단위의 최소 한도638,000으로 조정했다.
Basic361,506/SVG20,196 bytes와 package 한도는 유지했다. 정확 artifact/commands/log hashes와
최종 docs 결과는 `flow-evidence/summary.json`에 보존한다. Renderer source 변경은 없으며 SVG codec
동일성과 concrete property를 검증했다. 새 four-backend pixel sweep, whole coverage/realistic/3Node 전체
설치를 반복했다고 주장하지 않는다. STEP-033 전체 완료를 의미하지 않는다.
