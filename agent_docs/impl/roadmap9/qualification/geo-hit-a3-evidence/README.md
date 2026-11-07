# Geo A3 진행 checkpoint 증거

제품 정책·공간 index·raw stroke 중간 조립을 검증한 기록이다. 최종 archive SHA는 `bbb592a75661d3b9cdc09440ab4da304600933ca347e37fe03746b717b8f9680`이다. 최초 `09d0455e...` archive와 source 원10k 결과는 역사 증거이며 새 archive의 전체 통과로 바꾸지 않는다. Source pin은 상위 구현 기록에 남긴다.

- `verification.json`: source hashes, 실제 통과 범위, 미완료 범위.
- `installed.json`: 같은 archive Node20/22/24 runtime·strictTS·실행문서·6bundle 및 source-free minified Chromium DPR1/2.
- `coverage-raw.log.gz`: owning500/500; hit owner lines/functions100%, branches97.36%; 각 critical file floor도 통과.
- `large-installed-raw-partial-rehash.json`: 원100k native339849parts 및 모든 footprint exact hash/4 scalar query 전수 검산, current199999commands와3CSSquery 통과. 이후 rebase plan은 long-lived WeakSet rehash로 중단했다.
- `large-installed-rebase-partial.json`: 별도 fresh process의 initial plan도 rehash로 중단. 원100k rebase/offline의 새 archive 검증을 통과로 주장하지 않는다.
- `large-installed-attribution.log.gz`: package load hook으로 원 add를 실행하며 ownedValues/ancestor별 횟수·경과시간·slow stack만 기록. 최종 약25.1M 호출에서 owned71.53s/max6.58s, ancestor1.40s/max12.9ms. 원 global ownedValues가 병목이며 ancestor 정책 변경 근거가 아니다. 이 계측은 제품 성능 영수증이 아니다.
- `retention-raw.json`:20vertex100cycle oldscene WeakRef100/100회수. 원100k100cycle 대체가 아니다.

## 재실행

1. Checkout의 정식 pack helper `agent_docs/impl/roadmap9/integration/geographic-route-merged-evidence/pack.mjs`에 **절대** 출력 디렉터리를 전달한다. Node20/24에서는 `npm_execpath`도 해당 실행용 npm CLI로 명시한다. 결과를 `.artifacts/geo-hit-a3/archive.json`에 저장한다. 동일한 제품 source인 경우 위 SHA와 일치해야 한다.
2. 이 디렉터리의 `installed.mjs`를 `.artifacts/geo-hit-a3/installed.mjs`로 복사해서 실행한다. 기록된 로컬 Node20/22/24 경로는 실제 설치 경로에 맞춘다. `consumer.json`의 isolated consumer가 같은 archive를 보관한다.
3. `large-installed*.mjs`를 `.artifacts/geo-hit-a3/`로 복사한다. 원 footprint 비교를 위해 `large-source-partial-rehash.json`도 같은 디렉터리로 복사한다. `node --expose-gc --max-old-space-size=8192 ...`로 **하나씩** 실행한다. 첫 스크립트의 explicitGC는 reference-only4096part batch와 기능 단계 사이 환경정리이며 P95가 아니다. 모든339849parts, 원3queries 및 no-hit은 유지된다. `attribution` 파일은 별도 진단으로 원 immutable add를 감싼다.
4. Retention helper는 consumer 내부로 복사하고 마지막 출력경로를 현재 checkout `.artifacts/...`로 맞춘다.
5. Canonical P95는 원 driver의5warmup+30measured·DPR1/2·입력·타이머·SLO를 유지하고 측정 중 explicitGC 없이 따로 수행한다. 이 checkpoint에는 아직 결과가 없다.

Raw logs의 절대 경로는 실제 실행 위치이며 배포 주소가 아니다. PR/publish/deploy는 수행하지 않았다.
