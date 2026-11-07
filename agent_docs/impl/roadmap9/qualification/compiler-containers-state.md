# 완성된 compiler container 구현

기준은 Geo5와 기존 소유권 최적화가 포함된 `fca3bddc5`다. Root는 기존 `remainingApproval`로
[구체 채택문서](compiler-containers-adoption.md)의 최소안만 승인했다. 새 public API·schema·cache·
native 권한·runtime quota 변경0이며 `src/renderers/canvasScene.js` 하나를 수정한다.

Compiler의 pending은 raw group과 borrowed/translated wrapper만 생성 순서대로 보관하는 호출
local list다. 모든 기존 node/clip 검증을 끝낸 뒤 raw object를 원래 오류 경로로 clone한다.
Local ID-only children과 최종 containers는 기존 core ownership을 직접 동결해 유지한다.
Caller-owned scene/props·clip은 stamp하거나 freeze하지 않고, current graphicSpec은 즉시 완전히
materialized되어 Canvas/SVG/PNG/PDF가 같은 concrete output을 읽는다.

[제품 qualification](compiler-containers-evidence/qualification.json)에 source pin, owning coverage,
actual1k whole-frame/native/offline/rebase/timeline/mixed,7type boundary/getter/error/caller/lifetime,
원100k all-coordinate/work/wire/guard와 동일 archive3Node/browser evidence를 기록한다.
원100k 실행은 root의 전체 normal 종료 후 배정한 단일 슬롯에서 수행한다. 현재50ms/P95·100cycle
및 별도 canonical batch 설계는 완료로 보지 않는다.

## 검증과 패키지

Owning regression1344/1344, compiler critical lines99.07/branches97.70/functions100,
4renderer52, package boundary13을 통과했다. 실제1k의 baseline/product 전체 frame과
native/offline/rebase/timeline/mixed/fallback 및 직렬화 bytes·work가 같다.7type 경계의 getter0,
오류 순서, caller 미동결과 이전 객체8종의5GC 소멸도 확인했다. 실제1k clone31→26,
core owned 등록6044 유지, WeakSet.add6076→6071/has17145→16136이며 원래 row별
freeze 비용은 유지된다. 이를50ms 목표 달성 근거로 사용하지 않는다.

동일 frozen archive `eb859122a14147185340769e3f9871a710d2de5066085f5d9a9efd694ec19d71`을
Node20/22/24에 source-free 설치하여 public runtime·types·8개 animation 문서·optional peers·
6개 bundle을 검증했고, 설치본 browser DPR1/2의 version3/4도 통과했다. Pack은1261 entries,
Node22 packed1815075B, Node20/24 packed1818620B, unpacked8176200B다. 측정치를 넘는 최소100B
단위 packed1818700B와 실제 unpacked8176200B로 package 한도만 정합했다. Interaction gzip
Node20/24 137641B에 최소100B 단위137700B를 적용한다. 실패 receipt도 보존하며 runtime quota와
원100k fixture·50ms 기준은 바꾸지 않는다.

원100k native/rebase 각각100000좌표, offline 전체frame·exactwire33703073/41202280B,
work78333686/97911711/46333687/133456501 및50frame batchguard가 모두 맞았다. Prepare뒤
explicitGC 후 순수sample872.56ms와 별도좌표oracle8.78ms는 단일 기능진단이며 개선비율·P95·
100cycle 완료를 뜻하지 않는다. 모든19 source/declaration은 frozen archive의 원문 또는 canonical
compact bytes와 일치한다. Source pin은 검증된 제품 commit 다음 metadata commit으로 기록한다.
