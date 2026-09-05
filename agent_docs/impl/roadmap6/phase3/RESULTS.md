# Phase 3 구현 결과

A와 9개 V target은 승인되었다. 아래는 구현 checkpoint다. Phase 전체의 X는 아직 승인 전이며
Density/Horizon과 누적 consumer acceptance를 남긴다.

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
