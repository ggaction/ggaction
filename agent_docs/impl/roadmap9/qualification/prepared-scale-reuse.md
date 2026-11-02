# Prepared point scale 재사용

진행 상태: 이 개념 checkpoint 검증 완료. Runtime source `f689244fc`를 문서 provenance에 고정했다. Root가 2026-11-02
[frame-sampling.md](frame-sampling.md)의 대안(b′)를 기존
[AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval` 범위로 명시 채택했다.
감사 checkpoint는 `1234c719b`, 제품 기준은 root `d6dece68e`다.
기존 공개 v4 안정1064 branch와 감사 branch는 보존하며 별도
`codex/roadmap9-prepared-scales` managed worktree에서 구현한다.

채택 범위는 assemble-local exact opaque context/max4 normalized scales와 exact pair의
progress1-slot 재사용뿐이다. Native raw endpoint/wire 및 v3 replay bytes는 유지한다.
새 v4 sampled-rebase의 무손실 constant-column 선택 차이만 허용하며, raw decoded data,
수학, canonical work, schema/reader 및 restored wire의 재직렬 replay는 그대로다.

양 endpoint의 기존 normalization/실제값 mapping/compatibility를 전부 통과한 뒤에만
context를 변경한다. 중간 scale도 현재 row mapping이 finite 성공한 뒤에만 pair slot을
발급한다. Cache hit에서도 value mapping과 finite 판정을 생략하지 않는다. Collapsed domain과
실패 mapping은 새 slot을 만들지 않는다. Arbitrary token/clone/frozen 객체는 context가 아니다.

Types와 공개 API, kernel/version, node/work/codec 한도는 변경하지 않는다. Caller 객체를
owned로 stamp하지 않는다. Context는 계획/transport에 남지 않고, pair WeakMap value는 현재
numeric scale만 유지하며 plan/program/frame/이전 progress history를 담지 않는다.

이번 checkpoint에는 raw filtered scale cache, geometry tuple 재사용, positions vector local
freeze, node/core/renderer 변경을 묶지 않는다. 후속 frame 후보는
[frame-local-freeze-design.md](frame-local-freeze-design.md)에 남는다.

검증: owning/critical, 원1k 독립 수학·bytes·work·native/offline/sample-rebase, 계약/docs/types,
동일 archive3Node와 package boundaries를 완료한다. 원100k는 root의 대형 실행 슬롯을 받은 뒤
입력/ID/state/모든 phase를 줄이지 않고 직렬 실행한다. Timing/heap/SLO 완료는 주장하지 않는다.

## 제품 결과

Runtime 변경은 `src/grammar/animation/positions.js`와 `src/animation/planner.js` 두 파일이다.
새 global proof는 exact normalized scale WeakSet과 pair WeakMap뿐이며, slot은 성공 mapping
뒤에만 발급한다. Context의 field/state는 opaque token의 private WeakMap에만 있고4개 넘으면
FIFO 교체한다. Cache hit에서도 기존 실제 value mapping을 그대로 실행한다.

실제 원1k before/after는 source2SHA `0b76bbed…`/`746ef92f…`에서 모든 native/offline frame,
positions meaning, batch, sampled rebase를 비교했다. Native v3/v4 wire 및 v3 rebase는 exact,
새 v4 sample37-rebase만424178→422310B다. 매 sample core clone14037은 그대로이고
owned add22042→16048이다. 이는 속도 개선율이 아닌 실제 operation 감소다.

원100k는 Node24.22.1, 기존6144MiB, phase별1계획 수명으로 단일 직렬 실행했다.
원 input SHA `b68cab72…`와100000좌표·offline full deepEqual·rebase100000·batch50거부,
restore replay를 유지했다. Native33703073B는 그대로, 새 v4 rebase는41204160→41202280B다.
원 charge78333686/97911711/46333687/133456501과 expanded10100086은 유지됐다.
새 표현의 descriptor9300070/cell9300023, compact physical804781/estimated encoded809068,
실제 payload decoded804751/전체 envelope encoded809013이며 기존 모든 상한 안이다.
Sample2811.4ms는 동시 소형 부하가 있는 기능 진단이다. 50ms/P95/retained heap 통과가 아니다.

Owning757/757, critical planner100/93.82/100 및 positions100/98.43/100,
경계45/45, Full/Basic default/v4 replay와 원 source/proof/byte/charge 검사를 통과했다.
같은 archive `ebaf0bbb61f178caafe4895a1991671841cb209ea84e671f74e14d7821ceb4b9`의
Node20.20.2/22.23.1/24.22.1 public runtime·strict TS·7 docs·peers도 통과했다.
Production-minified 설치본 browser는 root source input0, v3/v4, DPR1/2에서 Canvas/SVG를 검산했다.

원 실패를 없애지 않았다. Docs 최초244/245는 provenance stale1건이었고 generator 후 focused18/18로
수리했다. Package 최초 unpacked8139937>8137500과 Node20/24 animation gzip339677>339400도
보존했다. Root의2026-11-02 채택으로 최소 unpacked8140000, animation339700만 맞췄다.
다른 artifact 예산과 모든 runtime guard는 그대로다. Node20/24 budget은 같은 archive/실측값으로
다시 검사했으며 runtime을 재실행했다고 주장하지 않는다.

원 harness/receipt/log/판정 입력은 [증거 폴더](prepared-scale-reuse-evidence/README.md)에 있다.
Source pin 완료 뒤에도 원50ms sample 의무와 다음 local-freeze/기존 scalar mapper 후보는 남는다.

Source pin 후 focused docs18/18 및 재포장 SHA `ebaf0bbb…` 완전동일을 확인했다.
뒤 metadata commit은 runtime/type 변경0이며 위 원100k·동일 archive3Node 근거를 재사용한다.
