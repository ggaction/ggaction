# Graph filter의 명시 재추론

## 진행 상태

- [x] [전체 설계 승인](../AUTHORIZATION.json) 재사용
- [x] induced view 및 dormant layout coordinates 선행 구현
- [x] private typed-key subset의 immutable data/lineage/revision 연결
- [x] filterMarks recompute 옵션·replace/compose/remove·resource closure
- [x] candidate MST·source revision·codec·selection/hit·nested consumer 검증
- [ ] current/types/docs/generated/installed 증거 및 commit/push

## 구체 계약

`filterMarks({recompute:true,...selector})`는 inferred graph의 node 선택으로 원본 data의
행과 typed key를 보존하는 내부 graphSubset derived dataset을 만들고, 같은 named graph ID의
새 revision으로 관계를 다시 계산한다. 기존 graph ID와 ruleId/typed endpoint를 유지하므로
살아남는 logical item identity는 그대로다. observed graph에서 true는 오류다. 옵션 생략은
새 filter에서 false, 이미 있는 filter에서는 기존 방식을 유지한다. 명시 false는 induced로 전환한다.

기존 `graphPlot.view`가 selectors와 optional recompute `{source,dataset}`를 소유한다.
같은 graph를 여러 plot이 공유하면 resource 수정은 모든 consumer에 전파되며 recompute owner는
하나만 허용한다. Source/layout/resource를 명시 교체해 owner binding을 깨뜨리는 변경은 거부한다.
Replace/compose는 원래 source graph의 node recipe를 기준으로 선택하고, 저장된 subset은 typed
node key로 후속 source revision을 따라간다. 도착한 새 key를 조용히 포함하거나 다른 key로 옮기지 않는다.
Remove는 원래 source로 재추론하고 소유 subset을 참조가 없을 때만 해제한다. Mark removal도 같은
restore/cleanup을 명시적으로 수행한다. 별도 selection orphan/drop notification은 session 의무다.

Graph subset은 공개 transform/API가 아니며 기존 createDerivedData→wrapped materializer와 DATA
revision DAG를 사용한다. 완전한 candidate dataset/resource/layout/plot을 순수 계산으로 preflight한
후 의미 있는 child actions를 실행한다. Dataset identity와 row lineage는 기존 owner를 재사용한다.
Candidate MST는 원본 data에 속한 candidate model만 허용한 뒤 선택된 endpoints로 투영한다.
Source graph/edges를 암묵적으로 편집하지 않는다. Empty subset과 모든6rule을 기존 정책으로 검증한다.

## 구현 및 검증

- Full에 `filterGraphPlotView`/`restoreGraphPlotView` wrapped owner를 등록하고 공유 filter facade는
  selector+dispatch만 유지한다. 공통 grammar registry의 graphSubset은 source 순서·typed key·lineage를 보존한다.
- graph resource prepared plan을 기존 write와 분리하여 완전한 dataset/graph/layout/consumer 후보를
  검증한 뒤 같은 결과를 wrapped semantic/materialization child에서 재사용한다.
- Public canonical example은 `examples/graph-plots/program.js`의 recomputed variant이며 A→B→C에서
  B를 제거한 뒤 A→C를 재추론한다. 독립 primitive 좌표/경로와 같은 PNG/PDF/Canvas/SVG 결과다.
- Graph affected 228 tests 및16개 critical owner100%lines/96.54%aggregatebranches/100%functions 통과.
  이후 source context 복원1줄은 최종 focused11과 Node20/24각25로 추가 검증했다.
- Renderer/primitive21, browser2(DPR1/2 각각Canvas/SVG5variants), realistic5datasets×3rules15,
  source/package/types14, inventory11(앞선27개passing 기록과 함께) 통과.
- 고정 tar e172d731ec07f439f338fb8c0ec56985b47784e1de891b4802cfbe678fab9c96:
  Node20 전체 installed runtime/types/tutorials/MCP/Basic/SVG 통과. Fullbundle은기존cap을넘어
  640278bytes실측후641000cap으로올려같은tar에서추가검증했다. Basic362683/SVG기존20196.
  Node22/24같은tar의 observed/inferred comprehensive cases각2통과.
- Package882entries/1279959packed/5885200unpacked. Cap882/1283000/5886000.
- docs175/177의2실패중 snippet heading exceptionID를동기화했다. 마지막example source link는
  sourcecommit 후같은generatedprovenance에핀하고재검증한다. 원본실패로그는최종evidence에보존한다.
- 처음 broadcoverage선택은 typography를graph substring으로잘못포함했다. 해당2실패는 기존removeTheme
  native기대값과lighttheme기대값을혼동한테스트이며theme담당branch에서수리중이다. Graph lineage
  신규transform inventory누락1건은canonicalrecomputed example로수리했다. Graph현재228은모두통과다.
- STEP032 drag/controller및전체STEP077은완료표시하지않는다. 후속interaction owner가소유한다.
