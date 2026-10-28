# Graph fixed / circular private 계산

## 진행 상태

- [x] 원 STEP-021·graph-inference 계약과 기존 model/polar owner 확인
- [x] Exact opaque-key fixed 좌표와 stable-order circular 계산
- [x] 독립 literal/rotation oracle·identity·adjacency·finite/work/immutable 검증
- [x] Critical graph floor와 source/package/discovery 경계 검증
- [x] Seeded force·fixed iterations·pinned nodes·component packing: [후속 계산 checkpoint](FORCE_KERNEL.md)
- [ ] GraphResource/NodeLayout public action·revision·codec·inspection·선택·consumer 통합
- [ ] Rendered primitive 검토 및 public visual flow
- [ ] STEP-021·AT-23·전체 STEP-077 완료

[원 STEP-021](../../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-021-graph-layouts.ko.md)과
[graph-inference 계약](../../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/graph-inference.ko.md)의
계산 부분만 구현했다. H public hierarchy 검토안의 답변을 기다리는 동안 parent가 명시한 독립 작업이다.
새 public API·persisted schema·renderer 기능 또는 force 완료를 주장하지 않는다.

## 최소 private API와 owner

`layoutGraphFixed(model, positions, limits?)`의 positions는 `{key,x,y}` 배열이다. Key는 기존 model의 opaque
encoded token이며 새 parser가 없다. 모든 node를 정확히 한 번 포함해야 하고 좌표는 finite다.
Position 배열의 순서와 무관하게 model node 순서로 반환한다. Zero/negative 좌표와 negative zero를 보존한다.
Unknown/duplicate/missing key, sparse array, inherited 필수값과 accessor, nonfinite 좌표는 거부한다.

`layoutGraphCircular(model, {center:[x,y],radius,startAngle,maxNodes?,maxEdges?})`는 center/radius/startAngle을
명시한다. Radius는 finite≥0이며 startAngle은 degree, 방향은 기존 polar owner의 clockwise다.
Stable model node 순서를 그대로 사용하여 index i의 각도=startAngle+360×i/n이다.
Empty는 nodes[], singleton은 center, radius0은 모든 identity를 center에 유지한다.
닫는 endpoint를 중복 생성하지 않는다. 화면 좌표 overflow 또는 표현 불가능한 각도 계산은 atomic error다.

Frozen result는 `{method,nodes:[{key,x,y}],options}`다. Options에는 resolved maxNodes/maxEdges 기본10,000을
포함한다. Source node/edge/attributes/lineage/adjacency를 복사해 두 번째 topology owner를 만들지 않는다.
`graph/model.js`의 indexGraphModel이 topology·capacity를 먼저 검증한다. Fixed는 node당32+position key문자당4,
circular는 node당64 work를 그 비용에 합산해 기존10M 한도를 적용한다. 추가 layout을 public schema로
저장할 때 필요한 revision vector/provenance는 이번 private 계산 범위에 없다.

## 독립 수치 증거

`test/oracles/graph-layout.js`는 source import 없이 literal과 반복 complex rotation을 소유한다.
Fixed expected는 node 순서대로[[-10,5],[0,-2],[3,4],[11,0]]이다. Center[10,20],radius5,start0인
4-node circle은[[10,15],[15,20],[10,25],[5,20]]이다. 3-node circle radius2는
[[0,-2],[sqrt(3),1],[-sqrt(3),1]]이다. 별도20조합은 direct-angle 계산과 다른 repeated-rotation oracle,
반지름 보존, 인접 chord 길이, 동일 입력의 결정성을 확인한다.

`node scripts/check-graph-layout-fixtures.js`는3개 literal의 expected/actual/diff/input/source SHA256을
`.artifacts/validation/graph-layout/numeric-evidence.json`에 기록한다. 좌표 tolerance는1e-12이며 key는 exact다.
노드 입력은 disconnected isolate와 weight0/negative edge를 포함하고 배치가 edge inference를 하지 않음을 검증한다.

## 공통 immutable 보수 재사용

Optional maxNodes를 상속 getter에서 읽지 않아도 기존 cloneAndFreeze의 plain assignment가 prototype setter/getter와
충돌했다. Root가 검증한 `b1544b7c150bad7a16a43cb3c97d40f17c4b3575`의 immutable owner+회귀 두 파일만
가져와 별도 `75bbab63`으로 기록했다. 로컬 immutable regression5개와 graph21개가 통과했다.
Graph-specific freeze 우회나 두 번째 복사 helper를 만들지 않았다. Root의 다른 graph inference 변경은 가져오지 않았다.

## 검증과 남은 범위

`.artifacts/validation/graph-layout/`에 coverage/immutable/contracts/package/bundle 로그를 보존한다.

| 검사 | 결과 |
| --- | --- |
| Graph unit source coverage | 21 passed; normalize/model/layout 모두 lines/branches/functions100/100/100 |
| Canonical graph critical floor95/90/100 | 3owner passed; 새 layout도 자동 floor 적용 |
| Immutable local regression | 5 passed |
| discovery/source/package boundaries 및 artifact40개 | 최초39 passed, 새 source의 entry cap만 실패 |
| Package artifact 재실행 | 최소 cap 갱신 후7개 passed |
| `npm run package:check` | 711 entries, packed1,058,262bytes, unpacked4,914,014bytes; exit0 |
| `npm run package:bundle` | Installed Full527,074 / Basic304,908gzip bytes; 기존 ceilings 통과 |

Private module 추가로 entries711이 기존710을 초과했다. 다음 unpacked4,914,014bytes도 기존4,910,000을
초과했다. 최초 실패를 보존하고 entries711/unpacked4,915,000으로 최소 조정한다. Packed1,061,000과
browser ceilings는 유지한다. 이 수치는 root의 후속 통합 측정을 대체하지 않는다.

Public call chain·새 graphic target이 없으므로 이 checkpoint에서 renderer pixel 비교를 했다고 보고하지 않는다.
Graph fixed/circular public consumers와 visual Gate, force/component packing, H hierarchy public 구현은 별도 남은 의무다.
