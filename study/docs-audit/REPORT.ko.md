# ggaction 문서 정확성과 사람 및 agent 사용성 개선 보고서

2026-10-23 · `ggaction/ggaction` · `v0.0.22` · `main` `202b7afd4146a691c136964c4cc53f9c37444513`

## 결론

현재 ggaction 문서는 생성·배포·링크·버전 관리의 기반이 강하다. 그러나 **독자가 복사하는 개별 예제의 실행성, 수기로 작성한 설명의 정확성, agent가 신뢰할 기계 메타데이터의 의미**는 그 기반만으로 보장되지 않는다. 문서가 일괄적으로 오래된 상태라기보다, 기능 확장 이후 일부 안내와 생성 규칙이 따라오지 못한 상태다.

따라서 우선순위는 새 문서를 많이 만드는 것보다 **잘못된 내용 수정 → 실행 가능한 예제와 조건별 계약 연결 → 필요한 부분만 찾는 경로 개선 → 올바른 원본을 쉽게 수정하는 작업 흐름 확립**이다. 기존 Jekyll, page manifest, action catalog, 타입, 예제 프로그램, MCP를 유지하면서 이 연결을 보강하는 방향을 권한다.

중복을 합쳐 **24개 점검 항목**과 **8개 추가 설계 개선안**을 정리했다. 각 항목에는 실행 오류, 문서 간 모순, 조건 누락, 유지보수 공백, 탐색 문제 중 무엇인지 표시했다. 모든 항목을 라이브러리 버그나 outdated 오류로 취급하지 않는다.

- [24개 상세 점검 항목과 8개 설계 개선안](FINDINGS.ko.md)
- [목표 문서 구조와 단계별 개선 계획](ROADMAP.ko.md)
- [문서 편집 원본과 생성·검사 경로](AUTHORING_MAP.ko.md)
- [150페이지별 크기와 코드 블록 색인](PAGE_INVENTORY.md)

## 우선 처리할 문제

| 우선순위 | 문제 | 사람과 agent에게 미치는 영향 | 연결 |
| --- | --- | --- | --- |
| P1 | 새 `chart()`에서 Canvas 없이 시작하는 공개 예제 7개가 실행 실패 | 기본 작성 패턴을 그대로 따라 해도 막힘 | [F01](FINDINGS.ko.md#f01) |
| P1 | 실행 registry가 페이지당 선택한 블록 하나를 검사하는 구조 | 뒤쪽 대안·추가 단계가 깨져도 기존 검사가 통과 | [F21](FINDINGS.ko.md#f21) |
| P2 | 공개 `program.d.ts`의 상대 dependency 누락 | docs 파일만으로 타입 검사하면 TS2307 | [F13](FINDINGS.ko.md#f13) |
| P2 | 카드가 상수 색상에도 field, title 수정에도 scale을 요구 | 유효한 action 경로를 잘못 제한하는 정보 제공 | [F15](FINDINGS.ko.md#f15) |
| P2 | exact runtime reference가 11개 entry 중 7개만 직접 수록 | inspection·accessibility·scene 등의 정확한 입출력 계약 탐색 불완전 | [F14](FINDINGS.ko.md#f14) |
| P2 | 옵션 기본값·선택성·통계 설명·브라우저 검증 범위의 모순 | 페이지에 따라 다른 구현을 예상하게 됨 | [F05–F07](FINDINGS.ko.md#f05) |
| P2 | 데이터 갱신 안내 일부가 `reviseData` 이전 방식에 머묾 | 이미 지원하는 직접적인 갱신 흐름을 놓침 | [F08](FINDINGS.ko.md#f08) |
| P2 | 검색·편집 원본 연결이 작업 의도에 충분히 맞지 않음 | 정답이 있어도 찾기 어렵고 생성물을 잘못 편집하기 쉬움 | [F22–F24](FINDINGS.ko.md#f22) |

P1은 기본 사용을 막거나 여러 문서 오류를 반복해서 놓치는 문제, P2는 정확성·탐색·기여에 유의미한 문제, P3는 표현과 정보 배치의 개선이다. 보안 심각도 분류가 아니다.

## 조사 범위와 검증 결과

`docs/`의 추적 파일 417개, 공개 manifest 페이지 150개, README, CONTRIBUTING, 문서 개발 안내, 생성기·검사 코드, 관련 타입·구현·현재 계약·LLM 자료를 대조했다. 전체 페이지의 구조와 코드 블록을 색인하고, 진입 문서·recipe·핵심 tutorial·API·agent 지원 경로를 직접 읽어 의심되는 주장을 실행으로 확인했다. 색인한 1,680개 코드 블록을 모두 독립적으로 실행했다는 의미는 아니다.

| 확인 항목 | 결과와 해석 |
| --- | --- |
| 문서 source suite 재실행 | **125/125 통과**. [로그](evidence/test-docs.log) |
| 기존 공개 예제 실행 suite | **47/47 통과**. [로그](correctness-executable-tests.log) |
| 생성물 check mode | **17/17 통과**. [상세](correctness-freshness.json) |
| agent 관련 계약 suite | **26/26 통과**. [로그](logs/agent-contract-tests.log) |
| machine artifact 복사본 | **10/10 일치**, LLM index/full/manifest도 현재 생성 결과와 일치. [상세](agent-probe-results.json) |
| 추가 예제 검증 | Canvas 누락 7개는 실패하고 Canvas만 추가한 비교군은 모두 성공. [원문·결과](correctness-evidence.json) |
| 사이트 과제 검색 | 26개 탐색 질의 실행. 정확한 action 이름 검색은 작동하지만 일부 일상 표현은 0건 또는 부적절한 상위 결과. [기록](evidence/site-probe.json) |
| 화면 확인 | desktop/mobile 새 스크린샷 확인. 검사한 desktop 6개 경로의 문서 가로 넘침·페이지 JS 오류 없음 |
| 현재 배포 상태 | live `llms.txt`와 `doc-provenance.json`이 clone과 바이트 단위 일치. remote main도 같은 commit. [기록](evidence/live-docs-check.json) |
| Context7 | `/ggaction/ggaction/v0.0.22`의 첫 scatterplot 작성 질의에서 현재 문서·예제 회수 확인. 단일 retrieval smoke test |

앞선 저장소 조사에서 수행한 전체 runtime/browser/render/package 및 전체 사이트 반응형 검증은 [이전 검증 기록](../VERIFICATION.md)에 남아 있다. 이번에는 문서 정확성에 필요한 focused 검사를 새로 수행했다. 기존 전체 suite 통과와 이번에 발견한 개별 문서 오류는 양립한다.

## outdated 판정의 기준

오래된 버전 숫자나 생성일만으로 오류로 분류하지 않았다. 실제로 현재 계약과 다른 주장, 현재 사용하면 실패하는 명령, 존재하지 않는 앞 예제를 가리키는 설명을 outdated로 판정했다.

확인된 예는 README의 `release:prepare -- 0.0.16 --dry-run`, Chromium 외 자동 검증을 부정하는 compatibility 설명, 존재하지 않는 “earlier encodeRadius”, 신규 package entry를 누락한 architecture 요약이다. 반면 `v0.0.13` migration baseline, 과거 benchmark 결과, 최소 버전을 명시한 recipe는 그 역할 자체가 유효하다. 과거 실험은 실험 시점과 적용 범위를 더 가까이 표시하는 개선 대상이다.

## 목표 상태

사람은 **완결된 첫 실행 → 하려는 편집 → 정확한 API → 실패 복구**로 이동할 수 있어야 한다. Agent는 **설치 버전/계약 확인 → 필요한 action과 옵션만 읽기 → 예제 실행 → 출력 검증 → 오류 복구**를 수행할 수 있어야 한다. Contributor는 **수정 목적 → 원본 → 생성물 → 최소 검사 → 전체 검사**를 따라가야 한다.

이 세 경로에 서로 다른 사실을 유지하지 않고, 공통 타입·행동 계약·실행 예제·page manifest에서 필요한 형식만 생성하는 것이 핵심이다. 상세 설계와 완료 기준은 [개선 계획](ROADMAP.ko.md)에 있다.

## 자료 구성

| 자료 | 내용 |
| --- | --- |
| [FINDINGS.ko.md](FINDINGS.ko.md) | 통합된 문제 목록, 정확한 위치, 재현, 수정 방향 |
| [ROADMAP.ko.md](ROADMAP.ko.md) | 문서 구조, human/agent 흐름, 단계별 구현·검증 기준 |
| [AUTHORING_MAP.ko.md](AUTHORING_MAP.ko.md) | 현 구조에서 편집할 원본과 생성기·검사 연결 |
| [PAGE_INVENTORY.md](PAGE_INVENTORY.md) | 전체 공개 페이지 크기·코드 블록·탐색 링크 |
| [human-review.md](human-review.md) | README·사람의 읽기 경험·recipe 상세 조사 |
| [agent-review.md](agent-review.md) | LLM·MCP·metadata·타입·내부 문서 상세 조사 |
| [correctness-review.md](correctness-review.md) | API 설명·예제·생성·검사 체계 상세 조사 |
| [site-review.md](site-review.md) | 검색·화면·복구 예제의 별도 조사 |

보고서와 probe는 clone 밖의 `study/docs-audit/`에 있다. **README·docs·라이브러리 소스의 수정, commit/push, 배포는 수행하지 않았다.**
