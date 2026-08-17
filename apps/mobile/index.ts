import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent는 AppRegistry.registerComponent('main', () => App)을 호출하고,
// Expo Go / 네이티브 빌드 어디서 실행되든 환경을 맞춰준다.
registerRootComponent(App);
