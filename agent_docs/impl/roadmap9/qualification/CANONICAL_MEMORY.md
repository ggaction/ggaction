# Canonical memory 100 cycle — 2026-11-05

## 진행 상태

- [x] 합산 archive로 canonical memory workload 1회 측정(DPR1·2).
- [ ] 최종 exclusive 창의 같은 commit·같은 archive 재측정(STEP-071/077 의무).

## 측정

`node scripts/benchmark-native.js --archive=<tgz> --output=<dir> --workload=memory`, Chromium. Fixture는 STEP-071 정의 그대로다. 20 node·20 edge graph와 실제 2×2 PNG(93 bytes, sha256 `64f3542f…`)를 쓴다. 5 warmup + 100 cycle 가운데 50회는 완료, 50회는 취소다. 매 cycle은 Playwright의 신뢰 mouse/pointer capture, 실제 ImageBitmap decode/close, ResizeObserver와 `editCanvas`/`updateProgram`, 실제 route worker를 거친다. 매 표본 전에 CDP `collectGarbage`를 실행한다.

Archive `40ac9fe0…`(source `5e0046a71` + Geo canonical 동등성 변경), [report](canonical-memory-evidence/report-memory.json.gz).

| DPR | heap 기울기 (기준 10,240 B/cycle) | 증가량 (기준 2,097,152 B) | 취소 응답 P95 (기준 100ms) | 판정 |
| --- | --- | --- | --- | --- |
| 1 | 6,601 B | 1,018,740 B | 0.2ms | 통과 |
| 2 | 6,593 B | 1,025,012 B | 0.2ms | 통과 |

모든 cycle에서 listener·worker listener·worker·timer·capture·observer·asset lease·bitmap·destroy 뒤 callback 수가 0이다. Harness 보유 목록(timeout/interval/frame id, capture/listener/tracked target, asset·decode 요청, probe release)도 0이다. 완료와 취소가 정확히 50/50이다.

## 한계

다른 사용자 GUI 앱이 켜진 상태에서 측정했다(시작 load 1.86, 끝 3.16). Heap 기울기는 CPU 경쟁에 덜 민감하지만, 최종 자격은 STEP-071 규칙대로 다른 CPU 작업을 멈춘 창에서 최종 candidate archive로 다시 잰다. 이 결과를 STEP-071 완료로 세지 않는다.
