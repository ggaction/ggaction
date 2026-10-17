# 문서 빌드의 미사용 의존성 제거

사용자가 요청한 저장소·의존성 정리 중 Dependabot #12의 rubyzip path traversal을
확인했다. github-pages232가 remote-theme0.4.3을 고정하고 그 plugin이 rubyzip<3을
요구하므로 rubyzip3.4만 올리는 해결은 불가능했다. 실제 사이트는 로컬 minima와
relative-links/sitemap만 사용하며 remote_theme 설정이 없다.

Gemfile은 실제 문서 빌드의 Jekyll3.10.0, minima2.5.1, 사용 plugin 및 기존 parser/
syntax-highlighter/runtime 버전을 직접 고정한다. 기존 lock의 남은 모든 gem 버전은
그대로 보존했다. 미사용 remote downloader·rubyzip·다른 theme bundle만 제거했다.
공개 런타임/API, 문서 디자인, Pages 배포 경로·보호규칙은 바꾸지 않았다.

검증: Ruby3.2의 bundle lock/check와 Jekyll 실제 build 통과.
수정 전 HEAD의 Gemfile/lock과 수정 후 bundle로 동일 docs source를 별도 build했다.
두 결과 모두338파일이며 추가/삭제0, 내용 차이0이다. feed.xml의 실제 build timestamp만
정규화했으며 다른 내용은 byte 비교했다. Built docs 검사150페이지도 통과했다.

이 변경은 이미 발행 준비 중인 v0.0.18 태그를 바꾸지 않는다. 다음 main/기능 release에
통합하고 alert는 main 반영 후 실제 상태를 다시 확인한다. 취약 알림을 임의 dismiss하지 않는다.
