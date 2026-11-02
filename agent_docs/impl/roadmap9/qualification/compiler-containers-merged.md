# 완성 compiler container 통합

Source `ab8cb89b2`와 pin `aa18606de`를 통합했다. 현재 root의 runtime/type/knowledge/package/
scripts/test/docs 입력은 upstream과 모두 같고,48개 원자료 hash 및 compiler source hash를
검산했다. Root strict pack은 upstream과 byte-identical한 `eb859122a14147185340769e3f9871a710d2de5066085f5d9a9efd694ec19d71`이다.
[통합 검산](compiler-containers-merged-evidence/qualification.json)을 보존한다.

Root는 compiler7개와 경계20개를 추가 실행했다. 동일 코드의 upstream owning1344·render52·경계13·
문서18·actual1k whole/native/offline/rebase/timeline/mixed·8refs lifetime 및 같은 tar의3Node/browser
증거를 재사용한다. 새 root 전수 회귀를 실행했다고 표현하지 않는다.

Raw/translated wrapper는 원 순서/오류 경로로 snapshot하며, compiler가 완성한 local ID children과
objects/order/graphicSpec/program만 직접 owned로 만든다. 실제1k clone은31→26,
읽는 record keys1031→26·array slots9011→8009이며 owned6044와freeze12053은 그대로다.

원100k source 기능은 전체좌표/native/offline/rebase 및 원work/wire·batch50 guard를 통과했다.
19개 관련 source/declaration이 tar 내용과 canonical 일치하지만 이는 새 root installed100k 실행이
아니다. 준비 뒤GC를 둔 단일 sample872.56ms는50ms/P95/100cycle 통과나 개선비율 근거가 아니다.
[다음 구조 검토](sampler-cpu-review.md)의 per-row 객체/동결 문제는 여전히 남는다.

Package1261entries/최대packed1818620/unpacked8176200, interaction gzip137641 실측에
1818700/8176200 및137700 한도를 사용한다. 최초 측정 초과와수리 원자료를 upstream에 보존한다.
Source commit 이후 root provenance를 고정하고 같은 archive 유지와 문서 경계를 확인한다.
