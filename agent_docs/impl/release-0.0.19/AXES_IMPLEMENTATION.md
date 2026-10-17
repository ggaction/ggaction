# 축·facet 승인 범위 구현 기록

## 진행 상태

- [x] 승인 기록 확인: [PROPOSAL.md](PROPOSAL.md), `f53dd78a`.
- [x] 전용 branch/worktree와 `npm ci` 준비.
- [x] #166 native tick/grid uniform dash 및 typed map 구현.
- [x] #174/#194/#195/#199 frame/title/label 구현.
- [ ] #197 named 축 소유자·selector·모든 consumer 구현.
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
