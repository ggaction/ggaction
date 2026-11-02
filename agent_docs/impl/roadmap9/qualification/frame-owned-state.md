# Frame local record 소유권 재사용

Root는 `af936021b`에 기록한 [구체 채택안](frame-owned-prototype.md#root-채택)과 기존
`remainingApproval`로 decisions child/vector 및 compiler wrapper의 두 최소안을 채택했다.
제품 기준은 최신 sampled metadata, prepared scalar, private value cursor를 포함한 `af936021b`다.

`sample.js`는 완성된 local primitive decision child와 vector를 `freezeOwned`로 직접 소유한다.
`canvasScene.js`는 원래 object literal 평가 순서로 만든 새 wrapper에 대해 properties가 이미
owned일 때만 직접 동결한다. 번역된/borrowed props는 최종 clone 경로를 유지한다. Core child
ownership, frame/scene/node identity, caller 격리, fully materialized graphicSpec, native hit 및
모든 schema/work/validation guard는 유지한다. 새 공개 API·타입·저장 필드·cache는 없다.

독립 owner effect와 수명 모델은 채택 전 검토의 소유권 표가 소유한다. 제품의 실제 검증과
archive source pin은 [qualification](frame-owned-evidence/qualification.json)에 모은다.
이는 원 sampler50ms/P95·100cycle 또는 STEP057–077 전체 완료를 뜻하지 않는다.

## 검증 결과

Owning animation/hit/renderer 회귀1294개, four-renderer render52개, package boundary13개를
통과했다. Sample coverage100/98.16/100, compiler98.99/97.50/100이며 기존95/90/100 floor를
모두 충족한다. Getter0회, caller mutable 격리, 번역된 properties copy, 오류 class/message와
뒤 node 검증 우선순위를 baseline과 제품에서 확인했다.

실제1k 전체 native/offline/rebase/timeline/mixed/fallback frame·meaning·bytes·work가 같았다.
최신 metadata 기준 clone2034→31, core owned 등록6044 유지, WeakSet.add8079→6076이다.
Plan과 다음 frame을 유지한 채 이전 frame 관련8refs는 baseline/제품 모두5GC 후0개 생존했다.

원100k 모든 native/rebase 좌표와 offline whole frame·exact wire 및 batch50 guard를 통과했다.
Bytes33703073/41202280, work78333686/97911711/46333687/133456501이 같다. 순수 sample7063.98ms는
post-prepare GC가 없고 소형 검사와 CPU를 공유했으므로 다른 측정과의 시간비교에 쓰지 않는다.
별도1k post-prepare GC profile은 first96.21ms, second31.48ms였다. Coarse1ms 표본에서
captureFrameMeaning inclusive21.04ms가 가장 컸으나 CPU 공유·낮은 표본 수 때문에 다음 조사
후보를 찾는 진단에만 쓴다. 원100k1120ms와 직접 비교하거나 개선 비율을 주장하지 않는다.

최종 설치 archive `d4f2db48cb4d1ed0adaf959e6ce355273324f6df6b806f2b2339424eeaff2251` 하나로
Node20/22/24 runtime·strict types·7docs·optional peers·6bundle와 설치 minified browser
v3/v4×DPR1/2를 통과했다. 원100k에서 사용한19 source/declaration은 archive 원문 또는 canonical
compact 결과와 동일하다. 1260entries/Node22packed1812185/Node20·24packed1815549/
unpacked8165542에 최소cap1260/1815600/8165600을 적용했다. Animation gzip341603에만
최소341700cap을 적용하고 다른 bundle cap·runtime guard·SLO는 유지했다.

최초 unpacked·Node20 packed·animation bundle 초과와 잘못된 contract selector 원문을 보존했다.
Source pin metadata는 검증된 제품 source commit 다음에 생성하며 package SHA 불변을 확인한다.
