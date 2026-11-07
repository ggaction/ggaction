# 실데이터 Graph 갤러리 검증

[실제 갤러리](https://hyeons-mac-mini.tailb43078.ts.net/ggaction-charts/)는 새 native 타입18종·실데이터26개·전체40개 chart를 제공한다. Clean source9bb63c67f의 build이며 [qualification.json](qualification.json)이 공개 browser 검증, 현재 파일 해시와 서비스 경계를 소유한다.

Graph는 Palmer Penguins344개 관측 전체를 실제 섬·종5쌍으로 집계한다. 원 관측에 없는 이동·흐름을 만들지 않았고 계층은 그룹 배치용으로 명시했다. 관측 graph가 tree이므로 edge-path 직선은 대체 경로가 없는 실제 계산 결과다. 네 방식의 PNG/SVG와 offline restore를 검증했다.

실제 공개 주소의1440/390px에서40PNG 로드·검색·두 format 확대·Escape·가로 overflow0·오류0을 확인했다. 기존 Tailscale handler는 유지하며 loopback LaunchAgent로 재시작된다. 최초502와 복구를 구분했다. 문서 deploy나 STEP077 완료로 세지 않는다.
