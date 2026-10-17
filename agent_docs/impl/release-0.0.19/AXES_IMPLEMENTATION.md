# 축·facet 승인 범위 구현 기록

## 진행 상태

- [x] 승인 기록 확인: [PROPOSAL.md](PROPOSAL.md), `f53dd78a`.
- [x] 전용 branch/worktree와 `npm ci` 준비.
- [x] #166 native tick/grid uniform dash 및 typed map 구현.
- [ ] #174/#194/#195/#197/#199 축 소유자와 frame/title/label 구현.
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
