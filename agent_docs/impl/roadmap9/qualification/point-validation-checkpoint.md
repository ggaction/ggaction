# Point 위치 검증의 버리는 계획 제거 결과

상태: 좁은 내부 할당 개선 검증 완료. 원 100k의 같은 프로세스 재기준화 후 offline 복원과 원 50ms/P95/100cycle은 미완료다. [채택 기록](point-validation-allocation-adoption.md)의 기존 승인을 적용했으며 전체 format6 완료로 세지 않는다. 기준 source는 `c6d44f50b2a6fec611429f4d07b31f801f7ff901`, 사전 채택은 `b21362a68`이다.

`validatePointAnimationPosition`의 동일 endpoint 양쪽 보간 계획 생성만 두 번의 기존 정규화 호출로 바꿨다. 원 x/y 순서, 두 번의 정규화·mapping, 실제 node 좌표 검산과 오류는 유지한다. 공개 API·저장 schema·native 권한·global owned registry는 그대로다. 정규화의 임시 객체와 등록은 남는다.

[기계 판정과 원시 증거 목록](point-validation-evidence/qualification.json)에 다음 결과를 고정했다.

- owning animation 840/840, `pointState` line/branch/function 100/100/100. durable 3개 검사는 6종 scale, reverse/clamp, ±0, degenerate, caller 격리, getter 0 및 오류 순서를 포함한다.
- 기준 대비 135개 결과·오류가 같고 1000행 등록 수는 40000 → 22000이다. 1k의 6종 scale·fallback·timeline·mixed 9변형은 전체 frame/position 및 native/offline/rebase wire 해시가 같다. UUID가 다른 최초 비교는 실패 기록으로 남기고 fixture 작성 전 같은 UUID 순서를 적용해 다시 비교했다.
- 동일 archive `186c01ea470a97e8c10a2f97e66061ef0d4a5583ae561ab1bfacd2b00a159c84`의 Node20.20.2/22.23.1/24.22.1 관련 animation runtime, 원1000 public fixture, strict TS, MCP, 모든 executable docs와 6 bundles가 통과했다. 이 변경의 runtime 재검사는 전체408이 아닌 관련 범위다. 실제 minified Chromium DPR1/2의 format6 및 6 paints도 통과했다.
- 문서·패키지·source boundary 49/49. baseline 전체 normal coverage10446/10446은 이전 checkpoint의 증거이며 이번 변경은 owning840을 재검사했다.
- 1k에서 sample100회/rebase10회/GC5회 후 이전 객체가 모두 회수됐다. 이는 원100k 장기 heap 판정이 아니다.
- 원 패키지 내용으로 entry1267, packed 최대1833576, unpacked8237162를 측정했다. 기존 cap 대비 +78/+196 bytes만 반영했으며 runtime 작업 한도나 SLO는 바꾸지 않았다.

원100k PID60117은 원 입력 hash `b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f`와 같은 프로세스/단계별 기존 GC 절차를 사용했다. native 100000좌표 및 export50 거부, 최초 offline의 전체 frame·wire·권한0, rebase 100000좌표까지 통과했다. 최초 offline는 182.3초였다. 그러나 rebase offline에서 두 OS sample 모두 WeakSet.add → in-place Rehash가 지속되어 SIGTERM(exit143)으로 진단 종료했다. [partial](point-validation-evidence/product-100000-phased-partial.json.gz), [종료 기록](point-validation-evidence/product-100000-stop.json.gz), [첫 sample](point-validation-evidence/rebase-offline-sample-1.txt.gz), [둘째 sample](point-validation-evidence/rebase-offline-sample-2.txt.gz)을 보존했다. 다른 프로세스에서 단계를 나눠 통과 처리하지 않았다.

GC 후 native full-frame 단일 sample은 135.64ms로 여전히 50ms를 넘는다. 작은 package 검사가 병행된 기능 실행이며 P95/개선율 주장을 하지 않는다. 정체는 해결되지 않았고 actual deleted/live/capacity도 측정하지 않아 엔진 버그로 단정하지 않는다. 다음 범위는 남은 restore 등록의 정확 caller와 pure sample CPU를 읽기 전용으로 분리하는 것이다.
