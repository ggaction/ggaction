# 이미지·paint 통합

## 진행 상태

- [x] 이미지와 P1 paint를 공통 concrete scene compiler에서 함께 지원
- [x] 기존 focused 33, 혼합 scene 3, compiler coverage 25 통과
- [x] boundary 55, 최종 계약 26, 문서 167 및 responsive 검사 통과
- [x] 같은 canonical tar의 설치 소비자 205와 7개 qualification 묶음 통과

[원시 로그·해시](integration-evidence/manifest.json)는 source `d24eb2bd1`의 통합 증거다. Image의 공통 scene compiler로 옮겨진 paint origin/fillBounds 이동은 nested image+pattern/radial Text의 direct/scene/offline PNG 전체 pixel equality로 검증했다. Mutable scene의 paint 변경은 기존 image preparation을 drawing 전에 stale로 거부한다. 새 compiler coverage는 98.96/98.59/100이며 critical floor를 통과했다.

전체 source coverage는 변경되지 않은 두 parent의 증거를 재사용한다. 이번 통합에서 새 전체 coverage를 실행한 것으로 주장하지 않는다. Canonical tar SHA-256은 `63e0b0a8fca3b1047b00b69aa67ce0490d0d436e81269f7912ddf06f7d6ab4ea`이며 post-generation repack과 byte-identical하다. Node 20/22/24 package·bundle 재측정과 Node 22 전체 설치 소비자를 구분해 보존한다.

첫 문서 검사는 아직 branch에 없는 신규 example source link 한 건으로 실패했다. Source commit 후 재생성한 문서 167건, built 151 pages/1,247 selective artifacts, 320/390/768px 전체 페이지 검사가 통과했다.

이 통합은 이후 font·shadow·hierarchy·graph 통합의 기반이며 Roadmap 9 전체 완료가 아니다.
