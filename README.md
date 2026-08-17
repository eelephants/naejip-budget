# 🏠 내집마련 예산 계산기

종잣돈과 소득을 입력하면 정책대출 자격 판정부터 최종 예산, DSR 점검까지 한 번에 계산하는 웹 계산기.

**Live**: https://naejip-budget.vercel.app

## 특징

- **8단계 예산 계산**: 종잣돈·소득 확인 → 정책대출(신생아특례/디딤돌/보금자리론) 자격 판정 → 소득 기준 감당가능 대출액 → 대출별 한도 → 지역별 LTV → 매매가 한도 → 최종 예산 → DSR 점검
- **2026년 8월 현행 규제 반영**: 6.27 대책(주담대 6억 한도, 정책대출 한도 축소), 10.15 대책(규제지역 LTV 40%, 시가별 한도 6/4/2억), 스트레스 DSR 3단계, 기금대출 순자산 요건
- **현실 반영**: 부대비용(취득세·중개보수 등) 차감, 기존 부채 DSR 합산, 생애최초 취득세 감면
- **규제지역·토허구역 현황**: 규제지역 시행일과 토지거래허가구역 시행일을 분리 관리
- **공유 링크**: 입력값을 URL 쿼리로 인코딩해 시나리오 공유 가능

## 아키텍처

규제를 코드가 아닌 **날짜 키 데이터(룰셋)** 로 관리하고, 계산은 순수 함수로 분리했습니다.

웹·앱 세 클라이언트가 같은 계산 엔진을 쓰는 npm workspaces 모노레포이며, 전부 TypeScript입니다.

```
packages/core/          # @naejip/core — 플랫폼 무의존, 세 클라이언트 공용
  src/rulesets.ts       #   RULESETS["2026-08"] 등 날짜 키 규제 데이터 + 지역 데이터
  src/calc.ts           #   computeBudget(input, ruleset) 순수 함수
  src/format.ts         #   fmt·pct·parseMan 등 표시 포맷
  src/form.ts           #   FormState·DEFAULT_FORM·toBudgetInput (앱 공용 폼 모델)
  tests/                #   골든 회귀 테스트 + 속성(불변식) 테스트
apps/web/               # 웹 — DOM 레이어 (입력 수집 → 계산 → 렌더링, 공유 링크)
  src/app.ts, index.html, style.css
apps/mobile/            # 스토어 앱 — React Native (Expo SDK 57 / RN 0.86)
  App.tsx, src/ui.tsx
apps/toss/              # 앱인토스 미니앱 — Granite (RN 0.84)
  granite.config.ts     #   appName·브랜드·내비게이션 바 설정
  pages/                #   파일 기반 라우팅 진입점
  src/pages/index.tsx   #   계산기 화면 (입력값은 Storage에 영속화)
  src/ui.tsx
```

`packages/core`는 빌드 산출물이 아니라 **TypeScript 소스를 그대로** 공유합니다
(`main: ./src/index.ts`). esbuild(웹)·Metro(Expo)·Granite(앱인토스)·Node(테스트)가
모두 `.ts`를 직접 읽으므로 코어에 별도 빌드 단계가 없습니다.

규제가 바뀌면: `packages/core/src/rulesets.ts`에 새 룰셋 추가 → 각 클라이언트의
`ACTIVE_RULESET` 교체 → `npm test`로 기존 룰셋 회귀 확인.

## 개발

```bash
npm install           # 워크스페이스 전체 설치

npm run web           # 웹 빌드 후 브라우저로 열기
npm run app:ios       # 스토어 앱을 iOS 시뮬레이터에서 실행
npm run app:android   # 스토어 앱을 Android 에뮬레이터에서 실행
npm run toss          # 앱인토스 미니앱 개발 서버 (토스 샌드박스 앱에서 intoss://naejip-budget)
npm run toss:build    # 앱인토스 번들 빌드

npm run typecheck     # 워크스페이스 전체 타입체크
npm test              # 계산 엔진 테스트
```

## 테스트

```bash
npm test              # 골든 10케이스 + 원본 대조 앵커 + 속성 테스트 7종
npm run golden:update # 의도된 변경 시 골든 스냅샷 재생성 (diff 확인 필수)
```

- **골든 테스트**: 다양한 프로필 10케이스의 전체 계산 결과를 스냅샷으로 고정해 회귀 감지
- **속성 테스트**: 결정적 PRNG로 룰셋당 300회 랜덤 탐색 — "소득↑이면 예산은 감소하지 않는다", "규제지역 예산 ≤ 비규제 예산", 시가별 한도 경계값(15억/25억), 디딤돌 소득 경계값(6,000만원) 등 불변식 검증

## 배포

- **웹**: Vercel. 루트 `vercel.json`이 esbuild로 `apps/web/src/app.ts` + `packages/core`를
  단일 번들로 묶어 `apps/web/dist`를 정적 배포합니다. `installCommand`를 웹 워크스페이스로
  한정했으므로(`--workspace=@naejip/web`) Expo·Granite 의존성은 설치조차 하지 않고,
  앱 쪽 변경이 웹 배포를 깨뜨릴 수 없습니다.
- **스토어 앱**: Expo. 배포는 EAS Build(`eas build`) 사용.
- **앱인토스 미니앱**: `npm run toss:build` → `apps/toss/dist`에 iOS·Android 번들 생성 후
  앱인토스 콘솔에 등록·검수. 출시 전 두 가지를 먼저 처리해야 합니다.
  1. **정책 확인 (선행 조건)**: 현행 [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide.md)
     5항은 "대출·보험·카드·증권 등 금융 상품 관련 서비스는 **법적 인허가 여부와 관계없이** 등록 불가"로
     규정합니다. 대출 한도·DSR 계산이 핵심인 이 앱은 그대로는 입점이 불가할 가능성이 높으므로,
     [채널톡](https://apps-in-toss.channel.io/) 사전 상담 결과를 받고 진행하세요.
  2. `granite.config.ts`의 `appName`을 콘솔 등록명과 맞추고, `brand.icon`을 콘솔에서 발급된
     아이콘 URL로 교체하세요 (현재는 placeholder).

## 면책

참고용 도구입니다. 실제 대출 가능 여부·한도·금리는 개인 신용, 은행 심사, 규제 변경에 따라 달라지므로 반드시 금융기관과 [주택도시기금포털](https://nhuf.molit.go.kr)에서 확인하세요.
