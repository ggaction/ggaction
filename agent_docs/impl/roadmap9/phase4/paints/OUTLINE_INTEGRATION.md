# Outline · Image · Hierarchy 통합

## 진행 상태

- [x] Outline `4f1b96e14`와 evidence `6f5395655` 원격 체크포인트 보존
- [x] Image/P1/H/deep immutable stable `02e2f63ef`를 같은 paint 브랜치에 병합
- [x] 양쪽 소스·타입·metadata·Current·문서와 소비자 목록 보존
- [x] 세 capability 정상207/207, source/package/chart/discovery38/38, render15/15, 실제 데이터31/31
- [x] 새 혼합 회귀2/2, 공개 browser 표본7/7, Node22 설치211/211+7/7
- [x] 최종 supported Node·전체 contracts·문서 evidence 기록
- [ ] P2 blend/shadow 공개 연결

Runtime 통합 commit은 `650b8d724`이다. 새 공개 API를 추가하는 통합은 아니며 각 Current 계약을 보존한다.
Outline 완료를 P2 또는 STEP017 전체 완료로 쓰지 않는다. 이어지는 blend·Text 포함 shadow, 이후 hit/index/frame
작업은 별도 conceptual checkpoint로 진행한다.

## 혼합 검증

`test/contracts/retained-paint-composition.test.js`는 동일 chart에 tree 또는 treemap, 원 데이터에 연결된 outlined
Point, retained image를 둔다. 데이터 revision이 hierarchy/layout에 각각 한 번 반영되고 image revision은
유지되는지 검증한다. Point logical key·row key는 유지되고 row reference의 data/revision은 정확히 바뀐다.
이전 prepared image handle은 새로운 graphicSpec에서 target Canvas resize 전에 실패해야 한다.

새 프로그램의 editable codec, SVG image+outline, Canvas와 Canvas scene의 exact PNG, PNG/PDF 출력,
image cascade 제거 뒤 hierarchy/outline 보존을 확인한다. Installed fixture의 세 번째 outline case도 같은
세 기능을 공개 package surface만으로 구성하며 prepare/codec/revision/scene/output을 검증한다.

5 pinned datasets × 3 recipes의 outline15와 hierarchy lifecycle16을 canonical realistic runner로 재검증했다.
새 root source의 전체 검증을 이 focused207개 검사로 대신한다고 주장하지 않는다. 통합 과정에서 runtime
결함은 발견되지 않았고, 첫 혼합 테스트는 revision 뒤의 row reference까지 동일하다고 잘못 가정해 실패했다.
원본 logical key/row key 보존과 명시 data/revision 변경을 분리한 실제 계약 assertion으로 수정했다.

## 실측과 남은 검증

기존 합산 package cap792는 새로운 outline owner2개로794가 되어 실패했다. Canonical staging Node22는
packed1,175,185/unpacked5,410,308bytes, Node20는packed1,177,323bytes다. Cap은794/1,178,000/5,411,000이다.
Installed Full/Basic gzip Node22는580,365/342,142, Node20 측정은581,143/342,894bytes다. Full만기존581,000을
143bytes 초과하여582,000으로 올렸고 Basic343,000/SVG25,000은 유지했다. 이전 cap을 통과했다고 쓰지 않는다.

동일 소비 archive의 SHA256은 `9ca6efaba2da85c0e1a09b2126cfd0ae9614812f5e21e55c9de0c1114f6495e8`이다.
최종 Node20/24 및 전체 contracts, source/built/browser docs 결과는 `outline-integration-evidence/manifest.json`에
기록한다. 최종 evidence-only 커밋은 이 runtime/타입/knowledge/archive를 바꾸지 않는다.

## 최종 검증

전체 contracts721/721, supported Node20.20.2/22.23.1/24.22.1 각각 같은 archive에서211/211 cases와7/7
qualification이 통과했다. Node24 bundle은 Node20과 같다. Source docs169개 중167개가 통과했으며 두 실패와
최초 built 실패는 search-index896,003bytes가896,000 cap을3bytes 넘은 동일 원인이었다. Canonical cap을
최소1000단위897,000으로만 바꾸고 해당2개 source assertions를 재실행하여 통과했다. 전체169개를 다시
실행한 것으로 표시하지 않는다. 최종 built153pages/1284 selective LLM artifacts, desktop/search/axe와
전체320/390/768px sweep이 통과했다. Runtime source 및 동일 archive는 검증 뒤 바뀌지 않았다.

H/Partition body·labels의 FillPaint 연결은 해당 public hierarchy owner가 후속 checkpoint에서 소유한다.
H/Partition의 공통 outline/blend 소비자와 Image의 적용 가능한 paint consumer는 남은 통합 의무로 유지한다.
준비 과정의 private shadow own-data audit는 inherited blurRadius getter1회·padding3을 재현했다.
이는 아직 공개되지 않은 shadow owner의 후속 수정 항목이며 이 통합에서 조용히 변경하지 않았다.
