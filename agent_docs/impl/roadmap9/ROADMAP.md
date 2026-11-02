# Roadmap 9 — Native 확장

2026-11-02 사용자의 재개 요청으로 작업을 이어간다. 전용 추론 worker와 Full prepared create/edit을 루트에 통합했고([worker 검증](qualification/inference-worker-merged-evidence/qualification.json)), 정확한 동일 객체의 검증 증명 재사용 및 임시 문자열 바이트 배열 제거를 합쳤다([최신 합산 검증](qualification/inference-validation-merged-evidence/qualification.json)). 원10000노드·100000간선 전체 기능 검산과 동일 archive3Node 설치를 통과했다. 실제 브라우저 단발 prepare8.203초·commit0.447초는 기능 진단이며 최종 AT82의 반복 P95·메모리·수명 자격은 남는다. 순차 완료 번호는 STEP056으로 유지한다. 이전 [중단 기록](qualification/PAUSE_HANDOFF_2026-11-01.md)은 중단 시점의 보존 기록이다.

상태: 활성. 정식 누적 closeout은 **Phase 0–3 / STEP-001–016**까지 기록했다. 이후 개별 구현·검증은 **STEP-056 Marginal·Bullet·Combo recipe**까지 진행했으며 여러 interaction 및 animation 기반을 병렬로 구현하고 있다. 개별 checkpoint와 전체 통합 완료는 구분한다. [ROADMAP_INDEX.json](../ROADMAP_INDEX.json)이 활성 위치를 소유한다.

공통 sample의 빈 스타일 patch 재사용을 별도 검증했다([allocation·설치·렌더러 기록](qualification/frame-appearance-reuse-evidence/qualification.json)). 동일 원1k plan의 전체 frame을 유지하면서 매 frame의 clone/owned 등록1000개를 줄였다. 작은 비용 귀속을 원100k 또는 browser P95 성능 통과로 세지 않는다. 실시간 개선은 공통 sample과 Canvas 재생에 우선하고 네 renderer의 출력 정확성은 유지한다.

좌표 sample의 exact plan 검증과 새 scale 배열 소유권 재사용도 [원1k 전체 frame·3Node 설치 검증](qualification/position-sampling-reuse-evidence/qualification.json)으로 연결했다. 원1k의 내부 clone 생성10000개와 descriptor 순회2000개를 줄였으나 원100k/50ms 성능 자격은 아직 열려 있다.

명시 session hit preparation을 현재 inference·point·animation 합산 후보에 연결했다([같은 tar의 원100k3Node·DPR 검증](qualification/hit-preparation-merged-evidence/qualification.json)). 전체 원좌표·row lineage·9CSS query를 유지한다. 이 기능 admission을 P95/retained heap 또는 STEP 완료로 세지 않는다.

공개 animation v4와 명시 node capacity를 root의 position/appearance 최적화에 합쳤다([같은 archive의 실제 원100k point·10k partition 및3Node/browser](qualification/animation-v4-merged-evidence/qualification.json)). 원 envelope/work/좌표·재시작·오프라인 전체 frame은 그대로다. 합산 point sample2222.98ms는 단발 기능 진단으로 원50ms 성능 의무는 계속 남아 있다.

2026-11-01 현재 개별 차트 구현·집중 검증은 STEP-056까지 진행했다. STEP-057–070의 선택·gesture·연결 제어·transaction/history/event·접근성·offline과 animation은 여러 검증 checkpoint를 갖지만 후행 통합 의무가 남아 있다. Animation은 Cartesian Rule·Rect·Bar·Line·Area와 확장 분포, partition·polar·graph·geographic camera 및 guide 값을 통합했다. 정확한 typed 지원과 fallback은 [Current Animation](../../contract/current/ANIMATION.md)이 소유한다. Timeline3·크기/범주/그룹 범례·GeoText2는 source b9ad2a122까지 합산 검증했다. Native 축 라벨 candidate는0b2c8e41a, exact route 재사용은1115d05c1로 검증·통합했다. 축 제목의 라벨 상대 배치는74f7cfa54로 공개 통합했고 정확한 축 폰트 준비 옵션은bb23315f8로 통합했다. 축이 없는 implicit 범례 lane은guide10, 동적 축 라벨 reflow는guide11로 통합했다([합산 검증](animation/axis-reflow-merged-evidence/qualification.json)). 현재 라벨을 소비하는 축 종속 inferred clearance와 동적 title/lane도guide13으로 통합했다([합산 검증](animation/dynamic-guide-merged-evidence/qualification.json)). 최종 domain matrix와 실제 handle 통합 의무를 유지하며 native consumer owner는574개를 실제 시험에 연결했다(assigned는 candidate pass가 아니다). 동일 canonical package의 실제391개 runtime consumer가 clean90eb 일반 검사에서 통과했다([실행 기록과 별도 CLI 오류 수리](qualification/integration-audit-90eb-evidence/qualification.json)). 이 실행은 전체10139개 중 오류문구 계약1개가 실패하여 전체 green으로 세지 않으며 관련45검사 수리 후 최종 전수 검사는 남아 있다. 고정 장비의 browser 성능을 측정하며 budget error를 지원 성능 통과로 세지 않는다. Native point의 명시100k 용량과 좌표 보간의 exact 준비 재사용을 통합했다([point 검증](qualification/point-capacity-merged-evidence/qualification.json)). 저장 region resize·typed category reorder handle도 공개 통합했다([합산 검증](interaction/handles-merged-evidence/qualification.json)). 이 개별 통합은 순차 STEP 완료나 large hit/frame·SLO 완료를 뜻하지 않는다. 최종577consumer·79ATgroup과 전체9명령, 독립 검토 및 보호된 최종 전달은 열려 있다.

실제 데이터 갤러리는 clean source `9bb63c67f5c193e472263add5a612a4e38e96c78`에서 새 타입18종·실데이터26개·전체40개를 제공한다. [Graph 갤러리 검증](qualification/graph-gallery-evidence/qualification.json)은66개 PNG/SVG 해시와 실제1440/390px 공개 접근·검색·확대를 확인한다. 이전25쌍 증거는 [기존 합성 갤러리 기록](qualification/combined-composition-evidence/qualification.json)으로 보존한다. 갤러리와 개별 checkpoint를 STEP-077 완료로 세지 않는다.

[원안](../../../study/coverage-expansion-2026-10-27/roadmap/START_HERE.ko.md)의 범위와 도메인 계약을 보존한다. 상세 구현은 해당 Phase에 필요한 계약만 이곳에서 확정한다. [전체 실행 승인](AUTHORIZATION.json)에 따라 STEP-077까지 계속 진행하며 Gate의 계약·검증 기록은 유지한다.

- [Phase 0](phase0/GOAL.md): STEP-001–003 완료; baseline, 독립 oracle, 검증 evidence.
- [Phase 1](phase1/GOAL.md): STEP-004–009 완료; 안정적인 행·항목 식별자, transform lineage, 선택 리소스와 schema 4 호환성.
- [Phase 2](phase2/GOAL.md): STEP-010–012 완료; 복합 경로·공통 geometry·네 renderer·scene·저장 통합과 AT-11/12 검증.
- [Phase 3](phase3/GOAL.md): STEP-013–016 완료; 공개 AST/parameter/prepared source, 통계·달력 변환 및 조건부 인코딩 통합. [통계 종료 근거](phase3/STEP8.md), [조건부 종료 근거](phase3/progress/STEP-016.json).
- [Phase 4](phase4/GOAL.md): STEP-017–019 이미지·페인트·폰트 구현 및 통합 중.
- [execution-plan.json](execution-plan.json): 원안 카드 링크와 현재 실행 의존성. STEP-056을 STEP-070의 선행 조건에 추가하여 native chart/recipe 작업이 통합·최종 검증에서 누락되지 않게 한다.
- 현재 우선 작업은 합산 후보의 공유 frame·interaction asset 수명·weighted transition 통합과 전체 검증이다. 각 소유자의 증거는 해당 chart/interaction/animation 기록에 있으며, 최종 qualification이 닫히기 전까지 전체 확장 완료를 선언하지 않는다.

원안의 연구 기록과 제안 상태는 수정하지 않는다. 실행 상태는 이 Roadmap의 progress 기록이 소유한다. 런타임 및 안정 기능 테스트는 구현 계획을 import하지 않는다.
