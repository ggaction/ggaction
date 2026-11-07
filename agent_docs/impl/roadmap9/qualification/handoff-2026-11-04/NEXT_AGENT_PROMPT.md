# 새 코딩 에이전트에게 전달할 재개 지시문

아래 문장을 사용자가 재개할 때 복사해 전달한다. 문서 작성 시점에는 작업이 중지돼 있다.

---

ggaction Roadmap9의 STEP077까지 승인된 확장 작업을 이어서 구현·통합·검증해라. 먼저 `agent_docs/impl/roadmap9/qualification/PAUSE_HANDOFF_2026-11-04.md`와 그 문서가 연결한 세 branch HANDOFF, 실제 root/scoped AGENTS를 읽어라. 최신 통합 branch는 `codex/roadmap9-animation-timeline-public`이며 main이 아니다. 기본 checkout과 무관한 작업을 보존하고 status/remote/merge-base를 먼저 확인해라.

STEP056까지의 개별 구현 완료와 STEP057–077의 미완료를 구분해라. 별도 format6/route/partition branch의 완료된 검증을 잃지 말고 합산하라. 기존 승인과 AUTHORIZATION.json의 remainingApproval을 재사용하되 prototype·source-specific pass를 제품/최종 통합 pass로 간주하지 마라. 새 PR/npm publish/정식 docs deployment는 별도 승인이다.

최종 원100k/10k 데이터, 원 수학·한도·timeout·SLO를 유지해 병목과 누락된 native union을 해결하고 동일 candidate/archive에서577consumer·79ATgroup·9검사와 최종 요구를 닫아라. Canvas 실시간 성능을 우선하고4renderer 정확성을 보존해라. 구현은 병렬 agent로 분담할 수 있지만 대규모 CPU/메모리 검증은 한 번에 하나만 실행해라. 각 검증된 conceptual checkpoint를 commit/push하고 요청 범위가 끝날 때까지 진행해라.

중앙 전달 bundle이 있다면 먼저 `python3 verify_bundle.py`로 파일 hash를 검산하고 RESTORE.md에 따라 미푸시 문서 commit만 복구해라. 과거 절대 경로와 tmp consumer를 재사용 가능하다고 가정하지 말고 실제 환경에 맞춰 재설치해라. 실제 실패/미실행/통과를 계속 구분하고 한국어로 간결히 진행 상황을 보고해라.
