# MEMORY.md

이 프로젝트에서 내린 결정과 진행 상황 기록. 코드나 git 히스토리만으로는 알기 어려운 맥락을 남긴다. 최신 항목이 위.

## 2026-10-27 ~ 28: 마케팅 진단, UI 리디자인, 검색어별 계산기

### 한 일
- **마케팅 진단**: [marketingskills](https://github.com/coreyhaines31/marketingskills)의 `/product-marketing`·`/cro`·`/seo-audit`로 라이브 사이트를 진단했다. 제품 마케팅 문서는 `.agents/product-marketing.md`에 있는데 **커밋하지 않아 작성한 로컬에만 있다**. 진단에서 나온 주요 문제:
  - 모바일에서 결과가 입력 24칸 뒤, 약 7화면 아래에 있었다.
  - 입력 기본값이 0이라 처음 들어오면 요약이 0원으로 도배됐다.
  - 방문자 분석 도구가 없어 무엇도 측정할 수 없다.
  - 가이드에 날짜·작성자 표시가 없었다.
- **빠른 수정** (#14): 첫 화면 H1을 "내 연봉으로 살 수 있는 집값, 바로 계산해요"로 바꾸고, 개인정보 안내를 1단계 위로 옮겼다. 빈 상태 안내와 "예시로 채워 보기"를 넣었다. 매매가를 넣지 않으면 최종 요약의 큰 숫자가 종잣돈과 같던 버그(8단계 대출이 0)를 고쳐 6단계 예산 한도를 보여준다. 가이드 날짜·스키마·sitemap `lastmod`를 넣고 셋이 일치하는지 테스트한다.
- **UI 리디자인** (#15, main 반영은 #17): `design-taste-frontend` 스킬의 achromatic-ledger 스타일(seed 1820851327)을 썼다.
  - 크롬은 무채색이고, 파란색 `#1d5fbf`는 한도 사다리에서 "한도를 정한 기준"에만 쓴다. 결과 숫자를 파랗게 칠하지 않는다.
  - 서체는 IBM Plex Sans KR 하나다. 시트가 정한 Geist에는 한글이 없다.
  - 데스크톱은 결과 레일을 고정하고, 휴대폰·태블릿은 하단 결과 바를 둔다(계산기 탭에서만, 결과 카드가 보이면 숨김).
  - 이모지는 모두 뺐다.
- **검색어별 계산기** (#16, main 반영은 #17): `/calculator/` 아래 `didimdol`, `newborn-loan`, `mortgage-limit`, `dsr` 네 페이지를 추가했다. 계산은 `apps/web/src/quick.ts`가 메인과 같은 코어 엔진으로 한다. DSR 페이지용으로 코어에 `computeDsr`(대출액 기준 스트레스 DSR, DSR 40% 최대 대출액)를 추가했다.
- **머지 사고와 복구**: #15·#16은 쌓인 PR이었다. #14가 main에 머지된 뒤 base를 main으로 바꾸지 않고 머지돼서, 각자의 base 브랜치(`marketing/quick-wins`, `design/ledger-redesign`)로만 들어갔다. 같은 내용을 `release/redesign-and-calculators`로 옮겨 #17로 main에 반영했고(a240897), 프로덕션에서 확인했다.

### 남은 일
- GA4나 네이버 애널리틱스 연결. 측정 ID가 필요하다. "계산 완료"와 "공유 클릭"을 이벤트로 기록한다.
- 계산기 페이지 4개가 늘었으니 서치콘솔과 서치어드바이저에 sitemap을 다시 제출한다.
- 공유 개선: 휴대폰 기본 공유 창(`navigator.share`)으로 카카오톡 공유. 카카오 앱 키는 없어도 된다.
- `.agents/product-marketing.md`의 `[확인 필요]` 칸(실제 사용자 표현, 경쟁 계산기, 목표)을 채운다. 레포에 커밋할지도 정한다.
- 다 쓴 원격 브랜치를 정리한다: `marketing/quick-wins`, `design/ledger-redesign`, `seo/calculator-pages`, `release/redesign-and-calculators`.

### 참고
- **쌓인 PR 머지 순서**: 아래 PR이 머지되면 위 PR의 base를 main으로 바꾼 다음에 머지한다. 이 레포는 `delete_branch_on_merge`가 꺼져 있어 GitHub이 base를 자동으로 바꿔 주지 않는다.
- 디자인 검사기(`inspect.mjs --app`)에 남는 WARN은 의도한 것이다: 고정 레일과 입력 열의 높이 차이(ragged-row), 순차 입력이라 첫 화면 아래로 이어짐(below-fold), 파란색 1% 미만(no-data-hue). 서체 규칙은 한글 때문에 `--allow font-not-dealt`로 돌린다.
- Vercel 프리뷰는 로그인 보호가 걸려 있어, 확인할 때 Vercel 연결 도구로 23시간짜리 공유 링크를 만들었다.

## 2026-10-22 ~ 23: 커스텀 도메인, 검색 등록, 애드센스

### 한 일
- **도메인 이전** (#7): `naejip-budget.site`(가비아 등록, 2026-10-22)를 Vercel 프로젝트에 연결. DNS는 가비아에서 관리한다.
  - A `@` → `216.198.79.1`, `64.29.17.1` / CNAME `www` → Vercel 지정값
  - `www`는 Vercel 도메인 설정으로, `naejip-budget.vercel.app`은 `vercel.json` 리다이렉트로 apex에 308
  - canonical, OG, JSON-LD, robots, sitemap URL 교체, ADR 0001 갱신
- **배포 자동화** (#8): Vercel이 GitHub과 연동돼 있지 않아 main 머지가 배포되지 않던 문제를 GitHub Actions로 해결. 같은 PR에서 vercel.app 루트 리다이렉트 누락(`/:path*` → `/(.*)`)도 고침.
- **구글 서치콘솔**: 도메인 속성으로 등록, 가비아 DNS TXT로 소유확인, sitemap 제출 완료.
- **네이버 서치어드바이저**: 메타 태그(#9)로 소유확인. 확인용 HTML 파일(#10)도 머지돼 남아 있는데, 네이버가 유지를 권장하므로 그대로 둔다. sitemap 제출 완료.
- **애드센스** (#11): 게시자 ID `ca-pub-1677771029100125`. head 스크립트, `ads.txt`, 개인정보처리방침(`/privacy.html`) 추가.
- **가이드 글** (#12): 계산기 한 페이지뿐이라 애드센스가 "콘텐츠 부족"으로 반려할 것에 대비해 `/guide/` 목차와 글 5개(예산 계산법, 정책대출 비교, DSR, LTV, FAQ)를 추가. 수치는 2026-10 룰셋 기준.

### 남은 일
- 애드센스 **검토 요청** 후 결과 확인. 반려되면 사유에 맞춰 글을 보강한다.
- 승인되면 광고 위치 결정. 계산 결과 옆은 피하고, 자동 광고와 결과 아래 수동 슬롯 중 하나를 고른다.
- 가이드 글 중 룰셋에 없는 일반 정보(신생아특례 출산 요건, 보금자리론 순자산 요건 없음, 정책 모기지 DSR 제외)는 상품 공고와 대조해 확인이 필요하다.
- 개인정보처리방침 문의처가 GitHub 이슈로 되어 있다. 이메일로 바꿀지 결정이 필요하다.
- 서치콘솔과 서치어드바이저에서 색인 현황 확인(반영까지 수일~수주).

### 참고
- Vercel 팀 `sangchokims-projects`, 프로젝트 `naejip-budget`.
- 토스 미니앱(`apps/toss`)은 웹과 별개라 애드센스·도메인 변경의 영향을 받지 않는다. 앱인토스는 금융 상품 관련 서비스 입점 제한이 있다(README 참고).
