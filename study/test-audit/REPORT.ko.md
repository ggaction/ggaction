# ggaction 테스트 종합 감사

**테스트의 양과 기본 계약 검증은 상당히 강하다. 가장 시급한 문제는 잘못된 결과도 통과시키는 공유 검증기와 실제 실행 대상이 누락되는 경로다.** 새 테스트를 대량으로 늘리기 전에 검증기의 판별력, 실행 대상의 완전성, 실패 증거의 보존을 먼저 개선하는 편이 효과적이다.

2026년 10월 23일, commit `31ce29f31e5ae87c57759a5b3e002db1f29a4808`을 기준으로 `test/` 전체 파일 목록과 suite discovery를 대조하고, 연결된 `scripts/`, 구현 코드, 공개 예제, CI/release workflow를 함께 조사했다. 직전 문서 개선에서 추가한 테스트도 같은 기준으로 포함했다. 저장소의 코드·테스트·설정은 수정하지 않았다.

- [32개 상세 항목과 근거](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/FINDINGS.ko.md)
- [개선 순서와 완료 기준](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/ROADMAP.ko.md)
- [suite 구조와 전체 파일 인벤토리](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/INVENTORY.ko.md)
- [기계가 읽을 수 있는 findings JSON](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/findings.json)

## 판단 근거

현재 코드로 **`npm run test:coverage` 전체 실행이 통과**했다. 줄 95.64%, 분기 93.18%, 함수 98.74%, critical file floor 137개를 충족한다. 별도로 수행한 정상 코드 대상 focused tests 39개도 통과했다. 이 39개는 coverage 실행과 중복될 수 있으므로 합산하지 않는다. [새 coverage 로그](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/infra-coverage.log), [환경 정보](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/environment.json).

그 상태에서도 아래 반례를 재현했다. 따라서 높은 coverage와 실제 회귀 탐지력은 별도로 평가해야 한다.

| 발견 | 실제 관찰 | 판단 |
|---|---|---|
| T01 공유 PNG 검사 | 완전히 투명한 640×440 PNG가 실제 두 variant의 검사에 통과하고 ink 281,600개로 집계됨 | 검증기 결함 |
| T02 문서 consumer | 55개 snippet 등록과 방문 기록에 비해 준비된 고유 코드가 50개. 앞선 5개가 덮어써짐 | 실행 대상 누락 |
| T03 수치 oracle | 유한 입력에서 tick 루프가 종료하지 않거나 50 대신 0, 0 대신 Infinity를 기대값으로 반환 | oracle 결함 |
| T04 극소 회귀 계수 | 1e-300 규모 slope를 0으로 바꾼 전용 모듈의 12개 테스트가 모두 통과 | 특정 결과 assertion의 공백 |
| T05·T06 integrity | 잘못된 좌표 타입과 닫힘이 어긋난 XML이 정상으로 판정됨 | 공유 입력 검증의 공백 |
| T07 공개 browser smoke | 실제 세 페이지의 Canvas paint를 제거해도 기존 검사가 통과 | 페이지에 보이는 출력의 증거 부족 |
| T12 workflow contract | 필수 테스트 step을 `if:false` 또는 echo로 무력화한 복사본에서도 9개 테스트 통과 | 실행 gate 회귀 검증의 공백 |

변형 실험은 **격리된 복사본·loader·fixture**에서만 했다. 전체 suite가 모든 변이를 통과한다거나 현재 production 출력이 이처럼 잘못됐다는 의미는 아니다. 각 항목에서 기존 보완 테스트와 확인한 범위를 명시했다. [상세 재현과 영향 범위](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/FINDINGS.ko.md).

## 범위와 구조

| 구분 | 현재 규모 | 해석 |
|---|---:|---|
| test 전체 파일 | 1,492 | fixtures·helpers·manifest·문서 포함 |
| JavaScript 파일 | 1,478 | 220,048줄. assertion의 강도나 독립성을 뜻하지 않음 |
| 기본 suite 진입 파일 | 957 | unit 548, contracts 179, charts 216, docs 14, gates 0 |
| 별도 realistic | 26 | checksum corpus, 별도 heap/concurrency와 7개 shard |
| 별도 render | 104 | expensive renderer/PNG 등의 진입 파일 |
| 별도 browser | 30 | 동적으로 등록되는 공개 예제 99개 등 포함 |
| named capability | 37 | 선택 실행의 명시적 registry |
| 독립 oracle 모듈 | 37 | 수치·구조·무결성 기대값 |
| 현행 catalog action | 293 | 공개 action inventory와 연결 |

파일 수는 runtime test case 수가 아니다. 기본 suite와 coverage는 realistic/browser/render의 모든 검증을 포함하지 않는다. 반대로 기본 suite 안에도 실제 Chromium을 launch하는 unit/docs 케이스가 있어, 자원 prerequisite의 분류가 완전히 분리된 상태도 아니다.

전체 파일의 인벤토리를 만들고 주요 재사용 검증기·수치 oracle·실행/생성 경로·대표 chart/contract를 상세 검토했다. 220,048줄 모두를 동등한 깊이로 수작업 검토했다는 뜻은 아니다. 위험이 큰 공유 경로와 실제 반례에 시간을 집중했다. [파일별 TSV](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence/file-inventory.tsv).

## 유지해야 할 강점

1. **발견·분할 체계가 이미 있다.** normal/realistic/render/browser의 누락·중복과 test JS reachability를 검사한다. realistic shard의 완전성·분리·결정성도 검증한다. 이를 새 체계로 갈아엎을 필요는 없다.
2. **수치 테스트가 단순 예제 수준에 머물지 않는다.** overflow·underflow·상수/중복 그룹·quartile·density·LOESS 불변성 등 여러 경계를 다룬다. 문제는 일부 oracle과 극소 값 비교의 빈틈이다.
3. **불변성 검증이 구체적이다.** frozen caller input, 이전 program, revision, persistence, atomic failure를 다룬다. 공유 program-state helper는 non-enumerable own field까지 snapshot하며 helper 자체의 변조 반례도 있다.
4. **실제 renderer와 package 경계를 검사한다.** Canvas/SVG/PNG/PDF, packed consumer, optional peer 유무, export/types, bundle budget, Firefox/WebKit과 native platform matrix가 존재한다.
5. **corpus 생성기가 이미 고급 기능을 갖췄다.** deterministic seed, pairwise generation, 실제 factor effect, provenance, failure shrinking이 있다. 무작위 생성이나 shrinking을 처음 도입하자는 제안은 맞지 않는다.
6. **차트 비교는 여러 층을 결합한다.** semantic/graphicSpec, drawing order, renderer call, 같은 실행의 decoded pixels와 일부 literal 값이 결합돼 있다. 단순히 screenshot 테스트만 있는 레포는 아니다.

## 우선순위

32개 항목은 **P1 2개, P2 22개, P3 8개**로 정리했다. 이는 테스트 신뢰성 개선의 우선순위다. 32개의 production bug를 발견했다는 뜻은 아니다. 재현된 결함, 정적으로 확인된 방어 공백, 유지보수·성능 제안을 상세 보고서에서 구분했다.

- **먼저 고칠 것:** T01 PNG의 빈 출력 통과, T02 snippet 덮어쓰기. 이어 T03–T06 oracle·수치 판별력과 T30 coverage parser를 고친다. 잘못된 결과를 확실히 거부하게 만든 뒤 테스트 수를 늘린다.
- **실행 증거를 확실히 할 것:** T08 실패 capture, T09 cross-browser 선택, T10–T12 coverage/필수 job 완전성, T16 상세 report 보존. 현재 green이 무엇을 실제로 증명하는지 알 수 있어야 한다.
- **환경과 수명주기를 안정화할 것:** T13–T15 clean setup·Windows·dependency identity, T17–T18 timeout/cleanup. 브라우저와 native dependency가 있는 레포에서는 실행 환경도 테스트 입력이다.
- **유지보수 비용을 줄일 것:** T19–T25 snippet contract·prose coupling·architecture regex·consumer/type fixture 구조. 의미가 같은 편집은 쉽게 하고, 행동이 바뀌면 정확한 케이스에서 실패하게 한다.
- **그다음 커버리지를 넓힐 것:** T27–T29 corpus의 의미 관계·병리 입력·baseline 독립성, T32 실측 sharding. 단순 데이터셋/차트 개수보다 검증한 오류 종류를 늘린다.

## 추가 설계 제안

테스트에는 각자의 **증명 범위**를 붙이는 것이 좋다. API 호출이 실행됐다는 증거, 올바른 데이터를 선택했다는 증거, 올바른 좌표를 만들었다는 증거, 페이지에 실제 그려졌다는 증거, 설치된 package에서도 재현된다는 증거는 다르다. 현재 구조를 유지하면서 다음 정보를 공통 receipt에 남길 수 있다.

`case ID / capability / code or fixture hash / environment / independent expected result / actual result / duration / evidence paths`

이 metadata를 모든 기존 assertion에 일괄 추가하는 작업부터 시작할 필요는 없다. snippet consumer, shared render harness, package consumer, coverage·shard runner부터 적용하면 현재 확인한 공백을 직접 줄인다. 구체적인 도입 순서와 반례는 [개선 계획](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/ROADMAP.ko.md)에 있다.

추가로 측정할 가치가 있지만 결함으로 세지 않은 항목은 다음과 같다.

- 99개 공개 페이지에서 `networkidle`과 별도 완료 신호를 모두 기다리는 비용. 명시적 data/image/font 준비 신호를 유지한 상태에서 개선 가능성을 측정한다.
- PDF 실패 시 finally로 지워지는 actual/expected/raster diff와 native font/backend identity의 작은 evidence bundle.
- 한 줄로 압축된 browser/render/type fixture의 일반적인 formatting과 named subcase. line-based stack과 diff의 유용성을 복구한다.
- 실제 branch-protection required checks와 CI aggregate의 일치 여부. 이번 로컬 감사에서는 원격 설정을 확인하지 않았으므로 merge protection 결함으로 판단하지 않았다.

## 검증 한계와 재현 자료

새 coverage는 **macOS arm64 / Node 23.5.0**, 설치된 Playwright 1.63.0·native Canvas 1.0.9·TypeScript 7.0.2에서 실행했다. 이 결과가 CI의 Node 20/22/24 또는 Windows 결과를 대신하지는 않는다. 이번 감사에서 realistic 전체 corpus, 전체 render gallery, 모든 package 소비자, Firefox/WebKit, native Windows를 새로 전부 실행하지 않았다. 해당 경로는 정적 교차 점검과 필요한 격리 probe로 평가했다.

coverage runner가 상세 출력을 버리므로 이번 성공 로그만으로 전체 runtime case 수나 per-file coverage를 제시하지 않는다. 이 제한 자체가 T16의 개선 대상이다. 이전 문서 작업의 5,519개 통과 로그를 이번 감사의 새 결과로 재사용하지 않았다.

분야별 원자료는 [수치·상태·corpus](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/semantics-findings.md), [브라우저·렌더링](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/browser-findings.md), [runner·CI·coverage](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/infra-findings.md), [docs·contract](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/docs-contracts-findings.md)에 있다. 각 문서는 source 위치·재현 코드·실험 로그·완료 기준을 포함한다. 저장소 밖 보고서와 증거만 추가했으며 HEAD와 tracked working tree는 감사 전 상태를 유지했다.
