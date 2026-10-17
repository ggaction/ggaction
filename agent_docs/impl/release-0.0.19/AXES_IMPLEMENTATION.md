# 축·facet 승인 범위 구현 기록

## 진행 상태

- [x] 승인 기록 확인: [PROPOSAL.md](PROPOSAL.md), `f53dd78a`.
- [x] 전용 branch/worktree와 `npm ci` 준비.
- [x] #166 native tick/grid uniform dash 및 typed map 구현.
- [x] #174/#194/#195/#199 frame/title/label 구현.
- [x] #197 named 축 소유자·selector·모든 consumer 구현(normal checkpoint; realistic는 아래 별도 미완).
- [ ] #206 최종 facet parent shared 범례와 unit 범례 확장 결합.
- [ ] 설치 소비자·독립 geometry 및 승인된 primitive/public pixel 검증 완료.
- [ ] 전체 unit/contracts/docs/package/bundle 검증과 부모 통합.

## #166 checkpoint

- 한 pure grammar가 dash validation/typed map normalization을 소유한다.
- 새 direct action 없이 기존 Full/Basic creator와 Full editor의 nested options를 확장한다.
  기존 ACTION_INDEX의 action identity/lifecycle는 변경하지 않으며 current 계약의 value 범위를 갱신한다.
- standalone6회귀와 기존 focused32회귀, persistence9회귀, action catalog/cards21회귀 통과.
- 전체 unit 첫 실행은3082/3086통과. 나머지4개는 신규 worktree의 `.artifacts` 디렉터리 부재로
  failure-artifacts fixture가 mkdtemp ENOENT였다. runtime 기능 실패로 숨기지 않고 원본 로그
  `/tmp/ggaction-axes-unit-checkpoint1.log`를 보존했다. 디렉터리 준비 후 해당 fixture 재검증한다.
- 재검증 완료: 해당 fixture6/6, full unit3086/3086, docs120/120, package 경계10/10 통과.
- installed packed consumer는 Full/Basic 새 dash의 PNG/PDF/persistence 실제 호출과 기존
  Node/TypeScript/MCP/tutorial/bundle 검증 통과. Artifact SHA256
  `ebe67d88867b53ba1603836825f11a3e61ec47500c97c60186da2ce748258f9c`.
  Gzip Full392023/Basic189728/SVG7176bytes는 기존 한도 안이다.
- 다음 통합 checkpoint에 실제 realistic option/literal의5회·3dataset witness와 승인 target
  public pixel 동등성을 추가한다. 이 기록은 일곱 기능이나 전체 release 완료 선언이 아니다.
- package 실측568entries/797471packed/3911785unpacked. 순수 grammar module에 기존 staging
  compaction을 적용하고 entry568/unpacked3912000으로 최소 갱신, packed798000은 유지한다.
- 선언·current AXES/GRID·영문 axes/grids·action cards/inspection/reference/search/machine/LLM를
  같은 checkpoint에서 재생성했다. 원시 행과 source-specific 명칭을 코드에 넣지 않았다.

## #174/#194/#195/#199 checkpoint

- complete-axis frame offset은0이상, title offset은signed, title alongOffset은 screen direction이며
  local align/baseline→회전 순서를 적용한다. 기본 생략의 concrete 결과는 기존 회귀로 보존한다.
- labels의 explicit align은 기존 rotated/flush resolved anchor를 보존한 뒤 최종 glyph bounds를
  다시 측정한다. Frame은 line/ticks/labels/title만 이동하고 scale/grid/marks는 고정한다.
- `test/oracles/cartesian-axis-geometry.js`의 독립 좌표 oracle과 신규13개 회귀가 네 side,
  reversed scale, 3align×6baseline×3rotation multiline, full/Basic, 생성/whole/focused,
  style reset, remove/recreate, Canvas/scale/theme/facet, 저장/import와 immutable 오류를 검증한다.
- full unit3099/3099, docs120/120 통과. 기존 “음수 title offset이 오류” fixture 하나는 승인된
  signed 계약에 맞춰 비유한 offset 오류로 고쳤으며 atomicity 검증은 유지한다.
- installed Full/Basic의 새API PNG/PDF/persistence 및 TypeScript closed baseline 호출을 추가했다.
  첫 installed 실행은 모든 기능 검사 뒤 Basic bundle190093>190000으로 실패했다. 이 증거를
  `/tmp/ggaction-axis-text-frame-installed.log`에 보존하고 최소191000으로만 갱신 후 재실행한다.
- package569entries/798803packed/3918633unpacked, 검색815236bytes. 측정한 최소 budget 갱신은
  SECOND_ARCHITECTURE와 canonical package/search/browser owners에 기록한다.
- 설치 소비자 최종 재실행은 통과했다. Artifact SHA256
  `512e3256dc05b4c178f42cf31623c25cb993e15ffe06b0e5373ddee837354914`, gzip Full392504/
  Basic190093/SVG7176bytes. Normal geometry regression에 같은 실행의 독립 primitive PNG buffer와
  SVG의 exact parity를 추가했고14/14 focused 통과했다. 이미지 눈/VLM 검사는 하지 않았다.
- Action-card 최대3358bytes는3360한도 안이며 승인된 placement 옵션을 모두 포함한 median1865가
  기존1856을9bytes 초과하여 해당 한도만 실측1865로 갱신했다. 옵션을 숨기거나 지우지 않는다.


## #197 checkpoint

- `selectors/axes.js`가 canonical/unique/explicit owner 선택과 native IDs를 소유한다. 기존
  materialization module은 ID resolver를 재수출하고 persistence는 selector를 직접 소비한다.
  Source layer 경계의 허용 목록을 넓히지 않았고 import/cycle/immutable primitive 검사가 통과했다.
- Native named ID, coordinate+side uniqueness, explicit frame, independent scale/standalone,
  sparse components, focused/group/whole/remove, aggregate/facade arrays, grid ambiguity와
  all-owner replay를 source/types/Current/English docs/cards/inspection/LLM에 동기화했다.
- 새로운18개 durable 사례가 data/encoding/mark/theme/Canvas/scale/coordinate/facet/grid/repeat,
  title/labels/collision/atomicity, malformed import와 prototype-shaped ID를 검증한다.
  Facade reuse는 retained frame offset이 다르면 거부한다. TS는 Full/Basic와 closed negative를 포함한다.
- Full unit3117/3117 PASS 이후 facade-only 추가회귀18/18, source/types10/10,
  package/cards/lifecycle/facet contracts27/27, action catalog PASS, docs120/120 PASS.
- 같은 실행의 named/public design과 canonical native design PNG exact equality는
  `test/unit/actions/guides/named-cartesian-axes.test.js`가 검증한다. Independent screen oracle와
  explicit primitive translation의 PNG/SVG exact equality는 `axis-frame-offset.test.js`가 검증한다.
  승인된 overview SVG의 설명 annotation 복제는 부모 통합 담당이며 이 checkpoint는 그 완료가 아니다.
- Installed packed Full/Basic actual runtime/TS, PNG/PDF/persistence, optional peers, local MCP,
  tutorial, private exports와 browser bundle 모두 PASS. 최종 artifact SHA256
  `3769b14c112d8c03313e0070f1f0a6c830a148b7aaf2fb1b341aac990251a6ba`.
  Browser gzip은 Full396214/Basic193136/SVG7176bytes다.
- 최초 package/검색/card/browser 예산 초과와 provenance staleness는 로그에 보존했다.
  Scope를 숨기거나 coverage 기준을 줄이지 않고 새 selector compaction 적용 뒤 실측한 최소 한도를
  canonical owners와 SECOND_ARCHITECTURE에 기록했다. Package570entries,805115packed,
  3948224unpacked; search816932; card median1896/max3358.
- 남은 일: #206 parent owner 전체 lifecycle, sibling unit block 기능 결합 및 모든 신규 옵션의
  authentic realistic5회/3dataset witness. 이들은 완료 체크하지 않았으며 다음 통합 checkpoint에서 실행한다.

## #206 implementation boundary

- 승인된 parent owner는 `compositionSpec.facet.guides.legend` 하나다. Public 입력은
  closed `LegendOptions`이며 internal tag를 받아들이지 않는다. Focused edit의 block별
  normalized intent와 inference flags는 이 객체 안의 private tagged normal form으로
  보존한다. 부모가 승인 문서425–525를 대조해 이 해석을 승인된 lifecycle의 구현으로 확인했다.
- 구현한 internal form은 `{ type: "authored-legend", blocks, groups }`다. Blocks는 kind별
  `{config, guide?}`로 unit의 normalized config와 해당 semantic legend meaning을 재사용한다.
  Groups는 기존 unit target-group intent다. 별도 override registry나 child authored owner는
  만들지 않는다. Config flags는 자동 title/sample/offset을 explicit 값으로 고정하지 않는다.
- Descriptor, local position과 border는 범례 담당의 pure grammar/materializer를 그대로 쓴다.
  Final union 배치 전에 intrinsic frame으로만 측정하며 child Canvas/margin을 변경하지 않는다.
- 이 section의 normal runtime 구현은 아래 checkpoint에서 검증했다. Authentic realistic와
  stable approved primitive/public capability 증거는 별도 후속 통합 의무로 남아 있다.


## 범례 checkpoint 결합

- `23d2e59a`까지의 unit 범례 구현을 merge하고 pure descriptor/local query/graphic edit
  helper의 layer boundary를 단일 owner로 정리했다. Unit3142/3142, docs120/120,
  source-boundaries8/8, named/card/type19/19, package check와 installed Full/Basic
  consumer를 모두 통과했다. 신규 옵션 realistic는 이 merge로 완료한 것으로 기록하지 않는다.
- 누적 bundle 첫 실행은398463>397000으로 실패했다. 실제 Full398463/Basic194351/
  SVG7176bytes를 확인하고 최소399000/195000/기존25000 한도로 재실행해 PASS했다.
EOF
## #206 native parent lifecycle checkpoint

- 기존 unit 범례 #171까지를 통합해 parent 선언·whole/focused/block 편집·partial/final removal을
  동일 native owner로 실행한다. Public internal tag는 거부하고 persisted tagged normal form은
  outer/block/config closed keys, native flags, semantic binding, derived config/groups 일치를 검증한다.
- Final child-plot union을 기준으로 8anchor/free at, local/inherited partition, retained axis/header
  collision과 Canvas fit을 검증한다. Intrinsic measurement는 transient이고 child dimensions를
  수정하지 않는다. Unit lane과 parent는 `materialization/graphicTranslation.js`를 공유한다.
  Collection descendants를 이동하되 nested Canvas는 local frame만 이동한다.
- 새 parent19회귀(9 native representations 포함), translation3회귀와 sibling local tests/source
  boundaries를 통과했다. Parent 선언/재선언/legacy shared reset, auto title/sample/offset, combined
  size-shape, partial removal, 9가지 malformed import, data/theme/source/grid/repeat/textmetrics/Canvas
  replay와 immutable 실패를 검증한다. 부모 PNG/PDF export도 실제 실행했다.
- 전체 unit3168/3168, docs120/120, source/types/cards20/20, package check PASS.
  기존 invalid guide message fixture는 승인된 object vocabulary에 맞춰 정정했다. 새 sibling authentic
  combined witness를3실데이터셋×5회 실행하고 실제 runtime을 canonical realistic timings에 추가했다.
- 첫 installed consumer는 새 Full/Basic runtime/TS/PNG/PDF/persistence/MCP/tutorial 검증을 모두
  수행한 뒤403710>399000gzip 한도로 실패했다. 측정은 Full403710/Basic196120/SVG7176bytes이며
  최소404000/197000/기존25000으로만 올린 뒤 재검증한다. Package581/818028/3992869,
  search820648 실측과 최소 예산은 SECOND_ARCHITECTURE 및 canonical owner에 동기화했다.
- 남은 일은 모든 새 옵션5회/3TT authentic profile, 승인시각2개 stable literal primitive/public
  capability, #176 clip/#205 color-size 결합이다. 이 checkpoint는 전체 feature 범위 완료가 아니다.

- Installed 재실행은 전체 Full/Basic/optional peer/TS/local MCP/tutorial/browser 검증을 통과했다.
  Artifact SHA256: `bfd896594fd9b12b568e9a76d3a405330657e61a4082144de6933f69b8ba0fbf`.
  Same-run gzip 결과는 위 실측과 동일하다. 최종 source/type/card/translation/parent42회귀 PASS,
  `git diff --check HEAD` PASS. 눈이나 VLM으로 이미지를 확인했다고 주장하지 않는다.
