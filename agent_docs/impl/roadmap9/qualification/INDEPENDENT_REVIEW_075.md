# STEP-075 독립 검토 — 2026-11-06

## 진행 상태

- [x] 독립 검토자(별도 문맥, 읽기 전용)가 오늘 commit 3개와 미commit diff, 실패 기록, 최근 40 commit의 baseline 변경, 영역별 성공 표본을 검토.
- [x] 지적 반영(아래 표). 코드 변경은 같은 checkpoint에서 전체 9검사로 다시 검증한다.
- [ ] STEP-076: 최종 후보 commit을 깨끗한 checkout에서 다시 검사하고 증거를 묶는다.

검토 범위: `4ddf7bb42`(value cursor 묶음), `ccfac9c8f`(discovered native route update), `9148c638a`(v2 준비 분할), 미commit(10ms host turn 묶음, route bounds 비교). 검토자는 시험·benchmark를 실행하지 않았다.

## 지적과 처리

| 등급 | 지적 | 처리 |
| --- | --- | --- |
| H1 | HEAD에 생성 type 문서 2개와 report 3개가 빠짐. 측정 report가 commit이 아니라 archive로만 식별됨 | 빠진 파일을 commit한다(이전 commit 절차가 추적 파일만 더했다). 최종 수치는 STEP-076에서 깨끗한 checkout의 후보 commit으로 다시 낸다 |
| H2 | 10ms host turn 묶음이 최장 동기 구간을 최대 10ms 늘림(FD 1k DPR2 96 → 103ms). 계약 문장이 "macrotask 사이"로 남음 | 묶음은 유지(turn당 최소 4ms 비용 때문에 total이 3.1 → 2.4초로 줄어든다). 계약에 "10ms + 가장 긴 단계" 상한을 적고, 기록의 원인 귀속을 고침 |
| H3 | `reviseDataInSlices`가 호출자 인자를 여러 slice에 걸쳐 읽고 그 시점 차이를 문서로 넘김 | plain data 인자를 첫 slice에서 host turn 전에 복사·동결. 모든 host turn마다 행·길이·id를 바꾸는 시험 추가. 계약·공개 문서 수정 |
| M1 | discovered action의 route policy가 준비가 끝난 뒤에만 대조됨 | route job에 처음 닿는 순간 그 policy로 ledger를 다시 만들어 즉시·계속 적용. 같은 route에 두 번 닿는 action의 준비 중 거부 시험 |
| M2 | Geo 빠른 경로 bit 동치가 저장소에 고정되지 않음 | 기준 `23313e355` 대비 전체 출력 대조 script와 재실행 출력을 `geo-fast-paths-evidence/`에 보관. 기록 문장 수정 |
| M3 | 10k 취소 미달을 V1 탓으로만 귀속 | V2 10k도 받은 completion turn 317ms·첫 snapshot 238ms로 미달임을 기록 |
| M4 | 취소 응답을 직접 재지 않고 P95 동기 구간에 더해 추정 | Abort timer의 예정 시각부터 거부까지 직접 재고, 판정은 그 최대값과 모든 표본의 최장 동기 구간 최대값 중 큰 값 |
| M5 | 분할의 두 핵심 주장(받은 completion은 snapshot 전 멈추지 않음, ledger 부과 불변)을 시험이 약하게 확인 | 검사 단계 사이 변경이 결과에 닿지 않는 시험 추가. 분할 전 commit과 ledger 진단 대조 script·출력 보관 |
| M6 | 받은 completion의 `bounds` 중첩 값에서 getter 실행 가능(이전부터) | 네 필드를 숫자인지와 `Object.is`로 비교. 중첩 getter 시험 추가 |
| M7 | 기록의 archive 표기가 report와 다름(npm sha1) | report의 archive sha256 앞자리로 수정 |
| M8 | Data 100k "DPR2 47ms 통과"가 보관 report 없이 주장됨, 횟수 불일치 | 보관 report 수치(load 55.2/58.1, revise 112.3/77.6ms)로 고치고 probe는 근거에서 제외. 횟수 수정 |
| L1 | 10ms 묶음 시험이 묶음을 고정하지 못함 | 실행 순서(`a,b,c,turn,d`)를 고정 |
| L2 | cursor 시험이 `stats.steps`를 고정하지 않음 | 보관한 `cursor-eq.mjs`가 이전 구현과 steps까지 대조함. 저장소 시험은 bytes 대조 유지(이전 구현이 저장소에 없음) |
| L3 | FD 1k 통과는 명시 예산 정책에서만 | 기록에 명시 |
| L4 | 모든 측정이 독점 창이 아님 | 경계 판정(103 vs 100 등)에 잡음 가능성을 적고 판정은 미달로 둠 |
| L5 | 오래된 기록(Geo 100k 228/232, density 10k 원인) | 수정 |

## 실패 원인 판정 (검토자 표 요약)

| 실패 | 원인 분류 | 근거 |
| --- | --- | --- |
| Density 100 bundling 4.3–4.6초 | 시간(알고리즘) | worker 계산만 3.4–3.65초 |
| Density 100 취소 125ms | 시간 | 받은 completion 검사 turn(route당 sample 많음) |
| Density 1k·10k, FD 10k | 시간·입력 크기 | 기본 정책은 work·pairs·samples 한도, 명시 예산은 30초 deadline |
| FD 1k DPR2 취소 103ms | 시간+통계 | 받은 completion turn + 10ms 묶음, 비독점 측정 |
| 10k 취소 약 680ms | 시간 | V1 동기와 V2 한 turn 검사·첫 snapshot |
| Data 100k load·revise | 시간(GC 추정)+통계 | Chromium trace 없음, 보관 report 기준 미달 |
| Geo 100k camera 145/148ms | 시간 | Node profile(세분·투영 약 91ms, clip·resample 52ms) |
| 독점 창 P95 | 통계 | 아직 미실시 |

글꼴·layout·입력 fixture 원인은 없었다.

## Baseline 재생성

최근 40 commit에서 PNG·fixture·golden 변경으로 실패를 덮은 경우는 없다(마지막 PNG 변경 2026-10-29). 확인할 점: `docs/assets/images/manifest.json`의 source hash는 매 commit 바뀌지만 pixel hash가 없다; native 해당 없음 21칸(574 → 553)은 사용자 승인("결정 2: A")과 같은 commit의 계약 문장에 근거한다; 크기 상한은 매번 실측값으로 올려 예산이 아니라 변경 감지 역할을 한다.

## 성공 표본

data·scale/encoding·mark·guide·composition·facet·route 네 방법·animation·interaction·persistence의 표본은 독립 oracle(별도 참조 구현, 리터럴, 수학 성질)로 기대값을 만든다. Geo 빠른 경로 시험은 일부만 독립(M2로 보관 대조 추가). `sliced-load`·`encoded-value-cursor`는 두 production 경로의 차분 대조다.
