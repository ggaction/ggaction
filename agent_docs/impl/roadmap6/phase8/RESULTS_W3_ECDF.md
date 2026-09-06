# Roadmap 6 Phase 8 W3 — ECDF data and complete plot

## 검증 ref

- Source/remote ref: `083880f70051af81b11b30e6f331bbd2d7c195db`
- Branch: `origin/codex/roadmap6-hierarchical-actions`

## 통계와 public hierarchy

- `createECDFData`는 입력 row를 바꾸지 않고 value를 오름차순 정렬한 뒤 같은 support의 ties를 하나의
  cumulative jump로 합친다. 각 group의 첫 support에 probability 0 row를 두고 ordinary `step-after` Line이
  관측점에서 `F(x)=P(X≤x)`인 우연속 함수를 그리게 한다.
- Unweighted denominator는 유효 관측 수, weighted denominator는 유효한 양의 finite weight 합이다. Zero weight는
  support와 denominator에서 제외하며 negative weight와 group별 zero denominator는 오류다. `missing: "drop" |
  "error"`가 value, group과 weight 결측 처리를 명시한다.
- Derived transform은 field/groupBy/weight/missing, exact output names와 group별 keys/denominator/validCount를
  resolved provenance로 저장한다. Generic Window cumsum과 ECDF의 sorting/tie/denominator 의미를 섞지 않는다.
- `createECDFPlot`은 `createECDFData → createLineMark(curve: "step-after") → encodeX/encodeY →
  encodeGroup? → encodeColor? → createMarkLabels? → scoped guides`를 그대로 호출한다. X는 observed support,
  Y는 exact `[0, 1]` probability scale이고 color field는 path identity인 groupBy에 포함돼야 한다.
- `editECDFPlot`은 source/field/group/weight/missing/output/color 역할을 stable owner 아래 원자적으로 다시 만든다.
  `groupBy:false`는 coupled color를 제거하고 `weight:false`는 count denominator로 돌아간다. `removeMark`는 owned
  derived data와 final-series label을 함께 제거하며 `bindMarkData`는 lifecycle을 우회하지 못한다.

## Line label과 시각 증거

- 기존 `createMarkLabels`의 explicit source 계약을 ordinary Line까지 확장했다. 각 materialized series의 최종
  ordered member에서 text field를 읽고, 실제 path command의 마지막 finite point를 anchor로 사용한다. ECDF
  facade는 이 lower owner를 그대로 사용해 group마다 최종 probability를 표시한다.
- `examples/ecdf-plot`과 `test/charts/ecdf-plot`은 grouped weighted A/B variant의 같은 values와 dimensions를
  사용한다. 명시적 `createECDFData`/Line/encoding/label chain과 facade의 semanticSpec, graphicSpec, tree,
  draw order와 Canvas calls가 일치한다.
- Focused render는 `ecdf-plot/grouped-weighted`의 decoded primitive/public PNG pixels를 같은 실행에서 비교해
  통과했다. Browser registry 69개 전체도 logical Canvas size, 접근성 이름과 browser error 검사를 통과했다.
- [튜토리얼](../../../../docs/tutorials/ecdf.md)은 shortest call, ties, weight, grouping/color, raw source filter와
  final mark filter의 denominator 차이를 실행 가능한 public chain으로 설명한다.

## 누적 감사에서 추가로 고친 오류

1. [#122](https://github.com/ggaction/ggaction/issues/122): 기존 quantitative `x`/`y` scale 뒤에
   categorical `createIntervalPlot`을 추가하면 facade가 global channel scale을 재사용해 실패했다. Caller가
   scale id를 생략할 때 `${id}X`/`${id}Y`를 소유하도록 고쳤고 Point/ErrorBar child의 shared scale을 검증했다.
2. [#123](https://github.com/ggaction/ggaction/issues/123): Phase 8의 9개 public action이 realistic generated
   scenario root에서 직접 호출되지 않았고 고정 option inventory가 이전 선언에 머물렀다. Direct lifecycle을
   추가하고 현재 선언에서 217 public actions, 9,146 option paths, 13,188 coverage requirements와 exact digest를
   다시 잠갔다.

두 이슈는 수정 commit과 회귀 결과를 연결한 뒤 closed다.

## 검증 결과

| 범위 | 결과 |
| --- | --- |
| ECDF runtime/type focused | 15/15 pass |
| primitive/public state | 2/2 pass |
| focused decoded PNG equality | 1/1 pass |
| unit | 2,246/2,246 pass |
| contracts | 318/318 pass |
| charts | 570/570 pass |
| docs | 47/47 pass |
| public browser examples | 69/69 pass |
| realistic corpus | 243/243 pass |
| coverage | 95.49% lines, 92.29% branches, 98.93% functions; 88 critical floors pass |
| generated artifacts | catalog/card/capabilities/action/signature/metadata/search/machine/example checks pass |
| package | 481 entries, 570,812 packed bytes, 2,751,506 unpacked bytes |
| installed browser gzip | Full 288,249 / Basic 149,994 / SVG 6,437 bytes |

Package에 source 세 개와 type/card/docs/assets가 추가되어 승인 범위에서 ceiling을 481 entries,
575,000/2,770,000 bytes로 조정했다. Full gzip은 실제 288,249 bytes에 맞춰 283,000→289,000으로 올렸고
Basic 150,000과 SVG 25,000은 유지했다. Installed package SHA-256은
`26d99a5c0b03ee70f9ef3bc050fb60d0ae18db5bf532edc57c125a7b251748ea`다.

`docs:generate`와 docs tests는 통과했다. 전체 `docs:verify`의 Jekyll 구간은 repository가 요구하는 Ruby
3.2.6 대신 host `/usr/bin/ruby` 2.6.10만 있어 preflight에서 실행되지 않았다. Source/generated/browser example
검증 결과와 분리해 이 환경 제한을 기록한다.

## 판정

F13은 implemented-verified다. Sorting/ties/denominator는 data owner, step geometry는 ordinary Line,
final-series text는 generic label owner가 맡아 중복 renderer나 facade 전용 compiler를 만들지 않았다.
W1~W3의 누적 runtime/type/visual/realistic/package 검증이 완료돼 Phase 8 X closeout을 진행할 수 있다.
