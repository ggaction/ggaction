# 선택 수명과 captured click 통합

## 진행 상태

- [x] 기존 전체 승인과 `487b9a434` 명령/연결 기반 유지
- [x] D2 nearest·D3 keep-hidden/drop·D4 click·captured click `6b21bf8a2` 통합
- [x] 집중112개·gesture10개·실제데이터16개·Canvas/SVG browser10개
- [x] Calendar 집계 날짜의 nearest와 source revision hidden/drop 교차 회귀 포함 계약36개
- [x] 같은 tar Node20/22/24의 theme90개·runtime14개·types·optional peers·4bundles
- [x] docs186개·built166pages/1429LLM·전체320/390/768px browser

Nearest는 현재 final item과 CSS geometry를 사용하고 clip 밖의 숨은 경로를 후보로 삼지 않는다.
Keep-hidden/drop은 기존 native editor로 수명을 연결하며 runtime tombstone과 dormant link 상태는
codec에 저장하지 않는다. 자동 click과 capture는 같은 command를 사용하고 3 CSS px 이후 drag나
Escape/blur/lost capture에서는 한 번 취소한다. 상세 Current 계약은 `INTERACTION.md`가 소유한다.

Calendar의 합산 value7인 날짜를 data nearest로 고른 뒤 해당 source day를 제거·복원했다.
keep-hidden은 원래 key를 복원하고 drop은 영구 제거하며 원본 program은 불변이다.
Agent 개념별 critical evidence는 변경 없는 소스 해시로 재사용하고 이번 통합에서는 교차 회귀와
동일 archive 설치·브라우저를 새로 실행했다. 전체 coverage 재실행은 주장하지 않는다.

실측939entries/1,348,950packed/6,188,354unpacked, interaction 최대100,884gzip,
search968,887bytes를 최소 상한939/1349000/6189000/101000/969000으로 반영했다.
Archive SHA256 `7f1643b1f87758c582d50f4c02dc3006253d7509546a3cd24a48ba7d012c5447`.
[증거](interaction-capture-completion-evidence/summary.json)가 정확한 실행과 Node별 결과를 소유한다.
STEP058의 domain preview·전체 arbitration, STEP059 및 전체077은 후행 구현 의무로 남는다.
