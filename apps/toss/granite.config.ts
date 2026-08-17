import { appsInToss } from "@apps-in-toss/framework/plugins";
import { hermes } from "@granite-js/plugin-hermes";
import { router } from "@granite-js/plugin-router";
import { defineConfig } from "@granite-js/react-native/config";

export default defineConfig({
  scheme: "intoss",
  // 앱인토스 콘솔에 등록한 앱 이름과 반드시 같아야 한다. (진입 스킴: intoss://naejip-budget)
  appName: "naejip-budget",

  plugins: [
    appsInToss({
      target: "0.84.0",
      appType: "general",
      // 계산기라 카메라·위치 등 네이티브 권한이 필요 없다.
      permissions: [],
      brand: {
        displayName: "내집마련 예산 계산기",
        // TODO: 앱인토스 콘솔에 아이콘을 업로드하고 발급된 URL로 교체
        icon: "https://static.toss.im/appsintoss/placeholder.png",
        primaryColor: "#2f6bff",
      },
      // 비게임 출시 가이드: 토스 내비게이션 바를 쓰고, 뒤로가기·앱 이름을 노출하며,
      // 미니앱 테마는 라이트 모드로 고정한다. (자체 헤더를 두지 않는 이유)
      navigationBar: {
        withBackButton: true,
        withTitle: true,
        theme: "light",
      },
    }),
    router(),
    hermes(),
  ],
});
