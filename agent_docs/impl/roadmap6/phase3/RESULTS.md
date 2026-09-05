# Phase 3 구현 결과

A와 9개 V target은 승인되었다. 아래는 구현 checkpoint다. Phase 전체의 X는 아직 승인 전이며
Horizon과 누적 consumer acceptance·bundle 크기 해결을 남긴다.

## W1 — Pie and Donut

- 기준 commit: `d4dd5a58` (V 승인 기록). `createPiePlot`을 full-only Aggregate create-only로 구현했다.
  필수 category와 count/explicit sum, 기본 category color, legend-only guide를 기존 Arc/theta owner로 조합한다.
  Donut은 `arc.innerRadius`이며 별도 alias나 partition cache·새 mark·renderer branch는 없다.
- Numeric category shorthand는 nominal이다. Zero-weight sector는 생략하고 color domain은 유지한다.
  Value-only/count+value, 잘못된 scale/appearance/guide와 ambiguous coordinate는 caller와 이전 program/trace를 보존하며 거부한다.
  Optional undefined는 생략으로 처리한다. Scale domain/range의 명시적 undefined가 lower validation에 전달되던 경계를 수정했다.
- Count/weighted/donut 세 public 예제를 `examples/pie-plot/`에 두고 승인된 primitive와 독립 sector oracle를
  `test/charts/pie-plot/`으로 이전했다. 하위 arc/theta 편집·Canvas resize의 semantic/graphic/Canvas parity와
  final sector selection membership을 확인했다. Browser registry와 공유 harness, tutorial·생성 이미지가 같은 public program을 쓴다.
- Current/declarations/index/cards/discovery/reference/LLM 문서를 동기화했다. Current 175 / Planned 2다.
  Pie/Donut 검색은 새 facade의 유효한 category count 호출을 반환한다. Raw Arc 요청은 기존 lower owner를 유지한다.
  Built-docs의 오래된 고정 action 수를 canonical inventory 비교로 바꾸고, mark-selection 이미지 검사를 해당 예제로 한정했다.
- 검증: 누적 normal **2,493/2,493**, Pie normal **48/48**, contracts **260/260**, PNG **3/3**, SVG/PDF vector parity **3/3**,
  실제 example browser **1/1**, 최신 installed package **exit 0**. Same-run decoded PNG와 PDF streams, SVG 문자열이 각각 primitive/public과 일치한다.
- 문서: source **47/47**, Jekyll build 통과, built **124 pages**의 links/assets 통과. 전체 docs browser의 desktop search·접근성·keyboard·no-JS와 320/390/768px containment가 통과했다.
  System Ruby 대신 설치된 Ruby 3.3.12를 사용했다. Locked gems를 repository-local artifact에 설치하고
  같은 Gemfile.lock의 로컬 사본에 host platform만 추가했다. Tracked Gemfile/lock 변경은 없다.

| 엔트리 | gzip bytes | 유지한 상한 |
| --- | ---: | ---: |
| Full | 234,970 | 235,000 |
| Basic | 124,897 | 125,000 |
| SVG | 6,418 | 25,000 |

Full 여유는 30 bytes다. 나머지 facades를 추가한 뒤 실제 installed bundle을 다시 측정한다.
상한 증가를 승인받거나 적용하지 않았다. Phase 전체 coverage/realistic 결과는 아직 아니다. Installed tarball SHA-256은 `971a123d15126dcdae456355faffa6f36899c3d728bdd92885674af711a5a164`다.

로그: `.artifacts/roadmap6-authoring/pie-{focused,contracts,render,browser,package,bundle,docs-verify,docs-built,docs-browser}.log`.

## W2 — Baseline density

- 기준 commit: `955b1acf` (Pie/Donut checkpoint). Full-only `createDensityPlot`이 기존 Area와 encodeDensity,
  optional explicit group color, owned guides를 조합한다. KDE 계산·derived fields·zero baseline·기본 grid는 바꾸지 않는다.
- GroupBy와 color를 별도 선택한다. Color는 retained group field와 같아야 하며 overlay만 지원한다.
  Optional undefined는 생략, 잘못된 역할·statistics·scale·appearance·guide는 atomic error다.
  Pie/Density의 categorical color와 guide 검증을 공유해 기존 의미를 보존하면서 중복을 줄였다.
- Three variants의 semantic/graphic/Canvas parity와 PNG·SVG·PDF를 확인했다. 통계·scale·appearance·Canvas
  revision, explicit coordinate, 다른 mark의 역할 비상속, singleton, invalid-row filtering, custom outputs,
  네 kernel과 두 normalization을 검증했다. Source-field revision 뒤 selection highlight를 유지한다.
  Group 해제 시 group-owned color와 legend를 제거하는 기존 lower lifecycle을 그대로 사용한다.
- Current 176 / Planned 1. 새 declarations·types consumer·reference/cards/search/LLM와 같은 public example을
  사용하는 browser/tutorial/image를 연결했다. MCP의 density-axis 요청은 H0가 소유하는 기본 축을 중복 생성하지 않는다.
- 검증: Pie regression 포함 focused **86/86** (Density 50), PNG **3/3**, SVG/PDF **3/3**, actual example browser **1/1**.
  자동차·국가·영화의 세 pinned datasets에서 두 facades 각 다섯 변형, 총 **30/30** realistic cases를 검증했다.
  Graphic/analytic/SVG integrity, source immutability, sector/profile counts와 density revision을 확인했다.
- Installed package의 Node·MCP·strict TypeScript·tutorial consumer는 통과했지만 **전체 package 검증은 exit 1**이다.
  Full gzip **235,428 > 235,000**으로 **428 bytes 초과**한다. 독립 installed measurement의 Basic은 **124,897 / 125,000**이다.
  상한은 그대로이며 package 전체 통과나 Phase 완료로 표시하지 않는다. 승인된 Horizon을 포함한 통합에서 해결한다.
- Source docs 47/47, Jekyll build와 built 124-page links/assets 검사는 통과했다. Desktop/keyboard/접근성/no-JS와 320/390/768px 전체 browser 검사가 통과했다. 최종 누적 normal은 **2,537/2,537**, fail/skip 0이다.

로그: `.artifacts/roadmap6-authoring/density-{focused,render,docs-contracts,browser,realistic,all,package,bundle,docs-verify}.log`.
