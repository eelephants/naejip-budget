# AGENTS.md

AI 에이전트(Claude Code 등)가 이 레포에서 작업할 때 지킬 규칙. 구조·실행 방법은 README, 진행 이력과 결정 맥락은 MEMORY.md를 본다.

## 환경
- **Node 22 이상**으로 실행한다. 테스트가 `node --test`와 `.ts` 직접 실행을 쓰므로 Node 16·18에서는 `bad option: --test`로 실패한다.
- 로컬 `npm install`이 `package-lock.json`을 바꾸면 의도한 변경이 아닌 이상 커밋하지 않고 되돌린다.

## 검증
- 코어나 웹을 고치면 `npm test`(core 골든·속성 테스트 + web SEO 테스트)를 돌린다.
- 계산 결과가 의도적으로 바뀌면 `npm run golden:update` 후 diff를 확인하고 이유를 커밋 메시지에 적는다.
- `apps/web/tests/seo.test.ts`는 빌드 산출물(dist)을 검사한다. canonical, OG, JSON-LD, sitemap, 애드센스 ID와 ads.txt 일치, 가이드 페이지 등재를 확인한다.

## 규제 데이터
- 규제 수치는 `packages/core/src/rulesets.ts` 한 곳에서만 관리한다. 새 규제는 기존 룰셋을 고치지 말고 날짜 키 룰셋을 추가한다.
- 웹의 정책 탭(`apps/web/index.html`)과 가이드 글(`apps/web/public/guide/*.html`)에도 같은 수치가 본문으로 들어 있다. 룰셋을 바꾸면 이 글들도 함께 고친다.

## 웹·SEO
- 정식 URL은 `https://naejip-budget.site/`이다. 바꾸려면 먼저 `docs/adr/0001-canonical-url.md`를 뒤집는다.
- **head 메타데이터(title, description, og)에는 연월을 쓰지 않는다.** 본문 기준월만 갱신하므로 head에 날짜가 있으면 검색 결과에 낡은 날짜가 남는다. 테스트가 메인 페이지를 검사한다.
- 새 페이지를 만들면 canonical, 고유 title·description, 애드센스 스크립트, sitemap 등재(lastmod 포함), 내부 링크를 함께 넣는다.
- 가이드 본문을 고치면 JSON-LD `dateModified`, 본문 `최종 업데이트 <time>`, sitemap `lastmod` 세 곳을 같은 날짜로 갱신한다. 테스트가 일치를 검사한다.
- 정적 페이지는 `apps/web/public/`에 둔다. 빌드 시 dist로 그대로 복사된다.

## 배포
- Vercel 프로젝트는 GitHub과 **연동돼 있지 않다**. 배포는 `.github/workflows/deploy.yml`이 한다.
  - PR: 테스트 → 프리뷰 배포 (프리뷰 URL은 Vercel 로그인 필요)
  - main push: 테스트 → 프로덕션 배포
- 레포 시크릿 `VERCEL_TOKEN`이 필요하다. 토큰 값은 대화, 로그, 커밋 어디에도 남기지 않는다.
- `vercel.json`의 host 리다이렉트로 `naejip-budget.vercel.app`은 새 도메인으로 308된다. 경로 패턴은 루트까지 잡히도록 `/(.*)`를 쓴다(`/:path*`는 `/`를 놓쳤다).

## 작업 방식
- main에 직접 push하지 않고 브랜치 → PR로 올린다. 머지는 사람이 한다.
- PR이 이미 머지된 브랜치에 커밋을 더 push하면 반영되지 않는다. 새 브랜치로 새 PR을 연다.
- `.bkit/`는 로컬 플러그인 상태라 커밋하지 않는다.

## 숏폼 파이프라인 (apps/shorts)
- 부동산 브리핑을 쇼츠·릴스로 만드는 Python 파이프라인이다. npm 워크스페이스에 속하지 않고 웹 빌드·배포와 무관하다. `deploy.yml`이 `apps/shorts/**` 변경을 무시한다.
- 화면 속 숫자와 글자는 전부 코드로 렌더링한다. 생성형 AI는 훅 배경 이미지·영상에만 쓴다.
- 규제 수치가 들어가는 슬라이드는 `packages/core/src/rulesets.ts`의 현행 룰셋 값과 일치해야 한다. 다르면 영상을 만들지 말고 보고한다.
- 매일 실행(루틴)에서는 **커밋하지 않는다.** 렌더 결과(`apps/shorts/out/`)는 저장소 밖 스토리지에 올리고 링크만 보고한다. 파이프라인 코드를 고칠 때만 브랜치 → PR.
- `IG_ACCESS_TOKEN` 등 게시 토큰은 루틴 환경 시크릿에만 두고 대화·로그·커밋 어디에도 남기지 않는다.
- 인스타 게시(`publish_instagram.py`)는 사람이 승인한 뒤에만 실행한다.
