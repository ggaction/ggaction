# 계층·이미지·paint 통합

## 진행 상태

- [x] Full resource registry와 data revision, inspection, 선택·제거 통합
- [x] 동일 ID의 image/hierarchy가 독립 수정·제거되고 저장 후 복원됨
- [x] focused 51, mixed lifecycle 1, boundary 46, discovery 16, realistic 10 통과
- [x] 문서 168, built 153 pages/1,283 selective artifacts, 320/390/768px 검사 통과
- [x] Node 20/22/24 package·bundle 실측 및 Node 22 canonical tar 설치 검증

구현 commit b6291b4db의 [원시 검증과 해시](public-integration-evidence/manifest.json)를 보존했다. Full constructor에는 image/hierarchy/layout 검증 owner를 한 번 등록한다. Generic removeResource의 image cascade와 hierarchy의 authored dependency/live-plot restriction을 함께 보존한다. Current removeResource의 canonical 문서는 CORE이며 HIERARCHY는 계층 특성을 연결한다.

Canonical tar SHA-256은 cc0b1ac0361daff87838330165147dca835d395f4596dccc24fb1b94a963b2d6이며 post-generation repack과 byte-identical하다. Package는 792 entries, unpacked 5,396,467 bytes, Node20/24 packed 1,174,800 bytes다. Full/Basic 최대 gzip은 580,123/341,958 bytes로 실측한 최소 budget을 적용했다.

전체 source coverage는 변경되지 않은 parent 증거를 재사용한다. 이번 새 전체 coverage 수행으로 주장하지 않는다. Hierarchy body/label의 현재 fill 계약은 string이다. 기존 P1 structured paint를 H 및 Partition의 공통 paint owner에 연결하는 작업은 후행 Partition 통합에서 명시적으로 완료한다. 이후 graph·font·outline 통합과 Roadmap9 후행 의무는 계속된다.
