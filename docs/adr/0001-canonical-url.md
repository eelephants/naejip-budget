# 정식 URL은 naejip-budget.site, 공유 링크는 루트로 canonical

검색 색인·카카오톡 공유 카드·사이트맵의 절대 URL을 커스텀 도메인 `https://naejip-budget.site/`로 고정한다(2026-10, 기존 `naejip-budget.vercel.app`에서 이전). `www`와 `naejip-budget.vercel.app`은 apex로 308 리다이렉트한다(www는 Vercel 도메인 설정, vercel.app은 `vercel.json`의 host 리다이렉트).
도메인을 바꾸면 head·robots·sitemap·JSON-LD의 URL, 리다이렉트, 구글·네이버 소유확인, 재색인을 모두 다시 해야 하므로 바꿀 때는 이 결정을 먼저 뒤집는다.
입력값을 쿼리에 담는 공유 링크(`?seedSelf=…`)는 개인 시나리오라 색인 대상이 아니므로 canonical을 루트로 둔다. 그래서 공유 카드는 결과별이 아니라 공통 카드다.
head 메타데이터에는 연월을 쓰지 않는다. 주간 규제 점검 루틴이 본문 기준월만 갱신하므로 head에 날짜가 있으면 검색 결과에 낡은 날짜가 남는다.
