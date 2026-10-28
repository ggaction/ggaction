# STEP3 — Parameter와 computed v2 제품 통합

## 진행 상태

- [x] [전체 실행 승인](../AUTHORIZATION.json)과 G-PARAM P1–P6 기록
- [x] parameter scalar normalization, typed resource, CRUD와 primitive 삭제 보호
- [x] v2 생성/편집/재생, exact input vector, schema/lineage/진단과 registry 조회
- [x] iterative multi-root DAG와 실제 새 입력 행 기준 누적 비용 제한
- [x] lookup diamond, selection, concat child scope, facet/repeat 및 fresh-process 복원 시험
- [x] 네 renderer·graphic snapshot·scene과 설치 패키지 중간 검증
- [x] CSV/JSON 파싱·비동기 준비 kernel 및 stale/abort/원본 hash 검증
- [x] Current/타입/공개 문서/생성 action metadata 동기화
- [x] 최종 입력 고정 후 coverage·실데이터 7개 shard·browser/render·설치 패키지 재검증
- [x] 검증 evidence 기록 후 coherent implementation commit/push (`3af6b16e`)
- [ ] Resolver 공개 commit, parameter URL invalidation와 offline lifecycle 연결
- [ ] STEP-013 인수 및 소비자 matrix 종료

이번 구현은 G-PARAM [승인 계약](parameter/DESIGN.md)을 사용한다. 승인 전 review의 입력과
evidence는 역사 기록으로 보존하며 현재 실행 성공으로 덮어쓰지 않는다. Public parameter/v2의
정확한 동작은 [CORE](../../../contract/current/CORE.md), [COMPOSITION](../../../contract/current/COMPOSITION.md),
타입과 stable capability tests가 소유한다. [G-DATA](G-DATA.json)의 private kernel 구현은
공개 resolver lifecycle 완료를 뜻하지 않는다.

초기 전체 검사는 6,486개 중 6,471개 통과/15개 실패였다. 병렬 metadata 생성 중 발생한 등록표·문서
freshness, 실측 package ceiling, 새 computed repeat 지원과 이전 시험 기대의 차이를 수정했다.
독립 검토에서 6,000-node graph의 재귀 stack 한계와 filter 확장 시 비용 과소 계산을 추가로 발견해,
iterative union과 speculative actual-input work 검사로 고쳤다. 기존 snapshot/trace 불변,
expanding-filter 거부와 shrinking-filter 성공을 회귀 시험으로 고정했다.

최종 증거를 모으는 동안 STEP-013과 전체 Roadmap9은 계속 진행 중이다. 후속 범위는
[obligations.json](obligations.json) 및 [실행 카드](../execution-plan.json)에 보존한다.

## 제품 checkpoint 검증

[실행 집계와 원본 증거](product-implementation.json)에 정상 검사 6,524개, browser 299개,
render 272개, 공개 문서 159개, 설치 패키지 Node 189개와 qualification 7묶음의 통과를 보존했다.
전체 source coverage는 line 95.96%, branch 93.56%, function 98.76%이며 critical floor 203개를 통과했다.
Node 20/22/24가 만든 최종 package의 bytes와 SHA-256도 일치한다.

실데이터 29개 파일을 7개 disjoint shard로 실행했다. 최초 275개 사례 중 2개는 새 parameter action의
inventory와 직접 실행 recipe가 빠져 실패했다. 세 시험/fixture 파일만 수정하고 영향받은 6개 파일을
canonical runner로 재실행했다. Focused 실행의 남은 inventory 상수 1개도 수정 후 7/7을 확인했다.
실패 aggregate는 그대로 보존하고 [파일별 대체 증거](product-evidence/realistic-resolution.json)를
구분했다. 이 수정 전후 runtime·types·docs는 동일하며 이전 정상·browser·render·package 검사를 재사용한다.
현재 체크아웃을 clean으로 주장하지 않고 전체 입력 hash와 세 파일의 차이를 보존한다.

원격 CI `40688721113`에서 정상·coverage 검사 모두 action 관계 freshness 하나가 실패했다.
Lifecycle recipe의 parameter-dependent computed 예제가 보강된 뒤 관계/card 생성물이 이전 상태로
남아 `editParameter → createDerivedData`가 누락된 것이 원인이다. Literal source를 사용하는 고정 예제로도
이 관계를 보장하고 관계·card·machine/LLM/search 생성물을 함께 갱신했다. Runtime·타입·package 구성은
변하지 않는다. 영향받은 generator 소비자와 MCP/inspection/docs 100개, generator freshness 및 package
검사를 통과한 [후속 수정 증거](parameter-trace-ci-repair.json)를 기존 전체 검증과 구분해 보존한다.
수정 commit의 원격 전체 CI는 push 후 별도로 확인하며 이 focused 검사를 전체 재실행으로 표시하지 않는다.

공개 data 준비·적용, source provenance와 parameter URL 갱신은 다음 checkpoint다. 이 제품 검증을
STEP-013 또는 STEP-077 완료로 표시하지 않는다.
