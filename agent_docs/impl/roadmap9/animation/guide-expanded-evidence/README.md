# Title·band boundary·Parallel guide 공개 연결

## 상태

최초 source `bd8ce86d1`은 **candidate-awaiting-shared-fix**로 기록했다. 아래 초기 검사는
수리 전 증거이며, 최종 검사는 마지막 절과 [qualification.json](qualification.json)이 소유한다.
승인은 [remainingApproval](../../AUTHORIZATION.json#remainingApproval)을 재사용한다.
Source revision은 `bd8ce86d1`이며 원 결정은 [GUIDE_DETAILS](../GUIDE_DETAILS.md)의 공개 연결 절이 소유한다.

## 구현과 통과한 증거

Guide state의 closed anchor 분기가 기존 title/boundary/Parallel native geometry를 호출한다.
Title은 numeric offset과 range 역할 또는 numeric at, boundary는 모든 typed edge membership,
Parallel은 field identity와 별도 slot 값을 보존한다. 새 primitive·공개 함수 원형은 없으며
같은 guide vector의 manifest만 `native-guide-values@2`다. shared planner 4파일은 수정하지 않았다.

- 전체 animation 350개 중349개 통과, 아래 공통 결함1개 실패.
- Guide 집중58개 중57개 통과. 네 owner coverage100/98.04/100과95/90/100 critical floors는
  통과했지만 같은 runtime 실패1개를 coverage 통과로 숨기지 않는다.
- 동일5대표 program의 Canvas/SVG DPR1·2 총10pair와 PNG/PDF5검사, 합계6/6 통과.
  Parallel 본체와 resize background의 기존 weighted raster를 guide vector 출력과 구분했다.
- 실제5dataset×6recipe=30개를 canonical realistic runner로 실행해5/5 통과했다.
- Source 경계·discovery·documentation truth40/40, package 관련17/17, 문서232/232,
  Jekyll build 및 built186페이지/1598 LLM artifact 통과. 같은 문서 내용의 desktop search와
  전체320/390/768px responsive browser 검사도 통과했다.

## 첫 실패와 후행 수리

처음 신규 fixture는 encoded key를 raw key로 읽거나 enter/exit에도 guideKey가 있다고 가정했고,
label-relative title의 선행 labels를 생략했다. 실제 공개 계약에 맞춰 fixture를 고쳤다.
첫 renderer fixture의 얇은 I는 antialias 경계를 interior라고 가정했고 Parallel 전체 PDF가
vector만 가진다고 가정했다. 굵은 I의 실제 interior와 같은 sampled guide-only vector를
검사하도록 수리했으며 renderer 소스는 변경하지 않았다. 원 로그를 보존한다.

공통 결함은 Parallel width600→800의 t40 frame을 새 from으로 재기준한 후 t50을 비교하면
live body reason은 sampled-concrete, offline reason은 unsupported-family가 되는 것이다.
Scene 자체는 정확히 같다. 기존312026112 snapshot에서도 같은 실패를 재현했다.
Export가 sampled-concrete-only Cartesian/Polar vector를 생략하고 restore가 기본 unavailable
vector로 채우면서 이후 fallback reason이 바뀐다. Track 선택과 저장 보존 판단을 분리하는
공통 수리는 root owner에 전달했다. `node agent_docs/impl/roadmap9/animation/guide-expanded-evidence/repro.mjs`
와 신규 unit의 whole-frame equality를 통과시킨 뒤 최종 상태를 갱신한다.

중간 canonical tar e8420a36…9d54는1169entries/1671807packed/7566214unpacked다.
기존 unpacked7563000 초과를 보존했고 최소7566300으로 교정했다. 이는 공통 수리 전 측정이며
최종 same-tar Node20/22/24 설치·types·6bundles의 통과 증거가 아니다.

## 남은 범위

추정/label-relative title ink, legend, 복잡한 flush/rotation/responsive reflow의 typed 연결은
후행이다. 이번 후보나 후속 qualifier를 전체STEP061/062/063/077 완료로 세지 않는다.

Source pin 후 문서 owning23/23과 canonical Jekyll build·built186/1598을 다시 통과했다.
최초 pin build 명령은 canonical source 인자를 빠뜨려 실패했으며, `npm run docs:build`로
바로잡은 로그를 별도로 보존했다. Source pin은 생성 링크와 identity metadata만 변경했고
문서 본문·layout·assets·runtime은 같으므로 앞선 전체 responsive browser 증거를 재사용한다.

## 최종 수리와 고정 패키지 검증

Root가 승인한 좁은 수리를 같은 코드로 적용했다. Cartesian/Polar의 active track predicate는
그대로 유지하고, export vector·manifest·restore 기본값 거부만 retained-vector predicate를
사용한다. 두 track owner의 root 파일 hash가 같으며 planner의 transport 전용 patch를 보존했다.
Timeline version3나 다른 shared4 변경은 가져오지 않았고 현재 전역 transition version은2다.

최종 animation350/350과7owners critical floors가 통과했다(100/96.53/100). Parallel whole-frame
재기준·offline equality가 통과하며 원 reason 불일치와 첫 실패 로그는 삭제하지 않았다.
Node20/22/24 source 각8개, source 경계·package·documentation truth29개도 통과했다.

고정 tar SHA256은 `39669c5908180098ce162cd8c8da36c1b4c1e4011edf5805406944938484e59e`다.
같은 파일에서 각Node의 신규 title/boundary/Parallel 소비자와 기존 guide 소비자2개,
strict animation declarations와 optional peers를 검증했다. Fresh child는 네트워크0에서
명시5시점·전체frame equality·재기준·Canvas/PNG/SVG/PDF를 실제 공개 API로 소비한다.
첫 설치 fixture가 nominal fieldType을 생략해 실패한 기록을 보존했으며 fixture만 바로잡고
같은 tar로 다시 통과했다.

6entry×3Node의 같은18측정 중 animation 최대248,468bytes가 기존243,700을 초과했다.
최소248,500으로 현재 표와 함께 교정하고 원 측정값으로 재검증했다. 재설치·재번들은 하지 않았다.
Node20/24 pack 최대1,675,963bytes도 기존1,675,300 초과를 보존하고 최소1,676,000으로 교정했다.
세Node canonical package가1169entries/7,566,612unpacked로 통과했다. 설치한 Node22 tar 자체는
1,671,863packed이며 위 압축 차이를 동일 archive 설치 증거와 혼동하지 않는다.

Native guide geometry 및 sample/render source는 후보와 같으므로 앞선6 renderer검사·10browserpairs,
실제5dataset×6recipe와 문서232개·built186/1598·responsive browser 증거를 재사용한다.
Source pin 이후 owning 문서와 canonical build를 다시 확인하고 metadata commit에서 기록한다.
Legend·inferred title ink·복잡한 reflow와 전체61/62/63/77은 계속 열린 의무다.

최종 source `eade82663` pin 이후 문서 owning23/23·canonical Jekyll build·built186/1598을 통과했다.
생성된 source links와 image input hash만 갱신했으며 문서 본문·실제 이미지·site assets는 같다.
따라서 앞선 전체 desktop/mobile browser 증거를 명시적으로 재사용한다.
