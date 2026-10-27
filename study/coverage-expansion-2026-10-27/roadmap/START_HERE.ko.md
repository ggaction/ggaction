# ggaction 구현 로드맵 사용법

이 로드맵은 ggaction 0.0.26, 커밋 40ec7edead7fc84de05aad31888dd0f7d264a512를 기준으로 한다. 기존 22개 작업 묶음과 79개 인수 시험군을 작은 구현 단계로 분해한다. 이번 산출물은 구현 명세이며, 새 API의 구현 완료나 릴리스 승인을 의미하지 않는다.

목표는 하나의 데이터·의미·선택 모델 위에서 차트, 디자인, 구조형 레이아웃, geo, 인터랙션, 애니메이션을 완결하는 것이다. 기능마다 생성만 되는 상태를 허용하지 않는다. 수정, 데이터 교체, 중첩 합성, 저장 복원, hit, 접근성, 애니메이션, 네 렌더 경로까지 연결해야 한다.

## 범위와 우선순위

- ggaction 자체 설계가 기준이다. Flint 정합성·백엔드 연결, chart-llm 번역·원본 재현은 이번 구현 및 릴리스 조건에 없다.
- Icicle와 Sunburst는 하나의 partition 결과와 node identity를 공유한다. 계층 집계나 선택 의미를 두 번 구현하지 않는다.
- 그래프 추론은 kNN, radius, similarity, MST/forest, group, sequence를 포함한다. 레이아웃과 추론과 edge routing을 독립시킨다.
- Edge bundling은 hierarchical, force-directed, density/KDE, edge-path 네 방법 모두 포함한다. 하나의 곡선 알고리즘에 이름만 네 개 붙이는 구현은 실패다.
- UpSet과 전용 집합 시각화는 보류한다. 전용 membership/intersection resource, constructor, 시험은 만들지 않는다. 일반 selection, predicate, Jaccard metric은 유지한다.
- Funnel의 이름은 Pyramid로 바꾼다. 자동 정렬, 역전, 정삼각형 강제 같은 의미 변경은 하지 않는다. KPI/Gauge는 전용 개발 대상이 아니다.
- Marginal, Bullet, Combo는 기존 액션 조합으로 문서화한다. 전용 constructor를 늘리지 않는다.
- 같은 Cartesian frame에는 Y scale 하나와 표시 Y축 최대 하나만 허용한다. 숨긴 독립 Y scale, mirror Y guide, 겹쳐 놓은 별도 frame으로 우회하지 않는다. 분리된 facet/concat panel의 독립 Y와 범위 endpoint y2는 합법이다.

범위 충돌은 최신 사용자 결정 → 이 로드맵의 결정표 → 도메인 계약 → 작업 카드 → 이전 보고서 순서로 해결한다. 현행 동작을 설명하는 current contract는 실제 코드와 함께 확인한다. 제안 계약과 다르다고 현재 구현의 버그로 단정하지 않는다. 새로운 공개/저장 계약은 구현 시 repository Gate 절차에 따라 검토한다.

## 구현자가 한 번에 읽을 패킷

1. 이 문서와 DECISIONS.ko.md를 읽는다. 종료할 때까지 지켜야 하는 불변식을 확인한다.
2. plan.json에서 선행 단계가 모두 완료된 가장 앞의 작업 하나를 선택한다. 임의로 다른 WP를 먼저 구현하지 않는다.
3. 해당 tasks/STEP 파일의 필수 계약, 기존 소스 위치, 제안 소스 위치만 읽는다. 수백 KB 보고서 전체를 매번 컨텍스트에 넣지 않는다.
4. source-map.json의 baseline과 실제 HEAD를 비교한다. drift가 있으면 파일/symbol의 새 위치를 확인하고 작업 인계 기록에 남긴다. 기존 checkout을 reset하지 않는다.
5. 해당 capability의 최소 실패 시험을 먼저 작성한다. fixture의 expected는 production helper로 생성하지 않는다.
6. 순수 kernel → validation → wrapped action → materialization → consumer 연결 순으로 구현한다. 독립 계산 결과를 검증하기 전에 큰 facade를 만들지 않는다.
7. 카드의 focused 시험과 필수 공통 검사를 실행한다. 실패하면 expected를 고치기 전에 원인과 계약을 확인한다.
8. progress-template.json 형식으로 실제 명령, 종료코드, commit, artifact hash, 남은 의무를 기록한다. 다음 카드는 완료 기록과 관련 계약만 넘긴다.

## 완료의 의미

작업 상태는 planned → in-progress → implemented → verified → complete다. implemented는 코드가 존재한다는 뜻이고, verified는 해당 시험이 실행되어 통과했다는 뜻이다. complete는 모든 consumer와 문서·타입·저장 계약, 필요한 Gate가 닫혔다는 뜻이다. blocked는 오류·외부 의존·미승인 결정이 명시된 경우에만 쓴다. skip, 미실행, 예제 스크린샷 하나는 통과가 아니다.

커널 작업 카드의 complete가 WP 전체 완료를 의미하지 않는다. 특히 partition focus/morph, bundling hit/geo/export, geo camera/LOD, 인터랙션 async settlement는 뒤의 통합 카드가 소유한다. acceptance-cases.json은 모든 인수 시험군의 구현 담당과 최종 종료 단계를 별도로 연결한다.

## 작업을 실패시키는 구현

- 사용자가 raw SVG/path 좌표나 행별 graphic 생성 루프를 작성해야 정상 차트를 만들 수 있다.
- semanticSpec을 renderer에서 해석하거나, hidden 자동 compiler가 전체 차트를 다시 만든다.
- 새 리소스가 JSON에는 저장되지만 fresh process에서 edit/remove할 수 없다.
- data 값 hash로 item identity를 만들고 값 변경을 삭제·생성으로 처리한다.
- node drag/Canvas resize만으로 graph inference를 다시 실행한다.
- bundling 결과를 PNG 이미지로 저장하거나 bundle 교차점을 node로 취급한다.
- 미지원 geometry를 직선·빈 그림으로 바꾸고 성공을 반환한다.
- gesture move마다 baseline을 commit하거나 취소 후 history에 잔여 항목이 남는다.
- animation의 최종 geometry만 hit하며 현재 frame과 다른 항목을 반환한다.
- 새 테스트가 test runner에 발견되지 않거나 계획 파일을 import해서 테스트가 스스로 참이 된다.
- 외부 참고 요구 2,279행 또는 보류된 시험을 현재 지원 분모로 센다.

## 문서 위치와 미래 구현 기록

현재 보고서 폴더의 roadmap은 검토용 제안 패키지다. 구현을 시작할 때에는 저장소 agent_docs/impl/AGENTS.md의 형식에 맞춰 새 roadmapN을 선정하고 chart/ 계약과 phaseM/GOAL.md, STEPn.md로 옮긴다. 기존 번호를 추측하거나 덮어쓰지 않는다. 각 STEP 앞에 진행 상태 체크리스트를 유지한다. 런타임과 안정 테스트는 이 계획 디렉터리를 import하지 않는다.

## 읽는 순서

ROADMAP.ko.html은 전체 통합 독서용이고, tasks/는 작은 모델의 실행용이다. contracts/는 중복되면 안 되는 수식·옵션·오류 계약이다. plan.json은 의존성 순서, source-map.json은 코드 위치, oracle-fixtures.json은 손으로 확인 가능한 기대값이다. 검증 스크립트는 문서의 완전성과 연결을 확인하며, ggaction 미구현 기능의 성공을 주장하지 않는다.

## 한 카드만 꺼내는 명령

아래 명령은 보고서 root에서 실행한다. 소스를 변경하거나 구현을 시작하지 않고 필요한 작업 패킷을 출력한다. progress-dir의 완료 기록은 실제 실행 증거가 있는 경우에만 다음 작업을 연다.

~~~sh
python3 scripts/roadmap-next.py
python3 scripts/roadmap-next.py --task STEP-035 --with-contracts
python3 scripts/roadmap-next.py --progress-dir /absolute/path/to/implementation-progress
~~~

입력 progress JSON의 commands 항목은 command, exitCode, logPath, logSha256를, artifacts 항목은 path, sha256, kind를 기록한다. unresolved obligations가 있는 task는 complete가 아니다. 이 도구는 증거 존재와 dependency를 확인하는 보조이며 사람의 검토나 실행 자체를 대신하지 않는다.
