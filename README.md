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
npm run toss:build    # 업로드용 아티팩트 생성 → apps/toss/naejip-budget.ait
npm run toss:deploy   # .ait를 콘솔에 CLI로 업로드 (API 키 필요)

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
- **앱인토스 미니앱**: 아래 「앱인토스 출시 절차」 참고.

## 앱인토스 출시 절차

> [!IMPORTANT]
> **0단계는 정책 확인입니다.** 현행 [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide.md)
> 5항은 "대출·보험·카드·증권 등 금융 상품 관련 서비스는 **법적 인허가 여부와 관계없이** 등록 불가"로
> 규정합니다. 대출 한도·DSR 계산이 핵심인 이 앱은 그대로는 입점이 불가할 가능성이 높으므로,
> 아래 절차를 밟기 전에 [채널톡](https://apps-in-toss.channel.io/) 사전 상담 결과를 먼저 받으세요.

### 1. 콘솔 가입과 앱 등록

[앱인토스 콘솔](https://apps-in-toss.toss.im/)에서 토스 비즈니스 회원으로 가입합니다
(만 19세 이상 + 본인 명의 토스 앱 필요). 워크스페이스는 **사업자당 1개**만 만들 수 있습니다.

'앱 → +등록하기'에서 아래를 입력합니다.

- **앱 이름**: 토스 앱에 노출되는 이름 (나중에 변경 가능)
- **appName**: 진입 스킴의 ID. **한 번 등록하면 변경할 수 없습니다.**
  이 레포는 `naejip-budget`으로 맞춰져 있으므로 (`apps/toss/granite.config.ts`)
  같은 값으로 등록하거나, 다르게 등록했다면 설정 파일을 고치세요.
- **앱 유형**: 비게임

등록 후 `granite.config.ts`의 `brand.icon`을 콘솔에서 발급된 아이콘 URL로 교체하세요
(현재는 placeholder).

### 2. 샌드박스 앱으로 개발 테스트

앱인토스는 개발용 토스 앱을 따로 주지 않고 **샌드박스 앱**을 씁니다 (iOS 16+ / Android 7+).

```bash
npm run toss    # granite dev
```

샌드박스 앱에서 `intoss://naejip-budget` 스킴으로 접속합니다. iOS 실기기는 같은 와이파이에서
로컬 IP를, Android는 `adb reverse tcp:8081 tcp:8081`을 먼저 걸어주세요.

### 3. 아티팩트 빌드

```bash
npm run toss:build   # → apps/toss/naejip-budget.ait
```

`.ait`가 콘솔에 올리는 산출물입니다. 압축 해제 기준 **100MB 이하**만 업로드됩니다
(현재 약 2.7MB). `npm run toss:bundle`(=`granite dev`용 원시 번들)은 업로드 대상이 아닙니다.

### 4. 토스 앱에서 테스트 (검토 요청의 전제 조건)

콘솔에 `.ait`를 올리고 '테스트하기'를 누르면 QR이 나옵니다. QR로 실제 토스 앱에서 실행됩니다.
QR 테스트는 **토스 로그인 + 워크스페이스 멤버 + 만 19세 이상**이어야 동작합니다.

CLI 업로드도 됩니다 (콘솔 '키' 메뉴에서 API 키 발급 후):

```bash
npm run toss:deploy -- --api-key <API_KEY>
```

**테스트를 1회 이상 완료해야 '검토 요청하기' 버튼이 활성화됩니다.**

### 5. 검토 요청 → 출시

1. [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame.md) 체크리스트 확인
2. 앱 정보(부제·상세 설명 등)를 모두 입력하고 검토 요청 — 앱 정보 검토는 영업일 1~2일
3. 번들 검토는 영업일 최대 3일, 카테고리에 따라 7일 이상
4. 승인되면 콘솔에서 '출시하기' → **전체 사용자에게 즉시 공개**

반려되면 '반려 사유 보기'로 확인하고 수정한 `.ait`를 다시 올립니다. 문제가 생기면 콘솔의
'앱 출시' 메뉴에서 이전 버전으로 **롤백**할 수 있습니다.

### 참고

- 이 앱은 서버 통신이 없어 CORS 설정이 필요 없습니다. 추후 API를 붙이면 Origin 허용 목록에
  `https://naejip-budget.web.tossmini.com`(라이브)과 `https://naejip-budget.private-web.tossmini.com`(QR 테스트)을
  등록해야 합니다.
- 사업자등록은 출시 자체에는 필수가 아니지만, 인앱 결제·광고·토스 로그인 등 수익화·정산 기능을
  쓰려면 필요합니다. 이 앱은 해당 기능을 쓰지 않습니다.
- 앱인토스는 현재 만 19세 이상 사용자에게만 제공됩니다.

## 면책

참고용 도구입니다. 실제 대출 가능 여부·한도·금리는 개인 신용, 은행 심사, 규제 변경에 따라 달라지므로 반드시 금융기관과 [주택도시기금포털](https://nhuf.molit.go.kr)에서 확인하세요.
