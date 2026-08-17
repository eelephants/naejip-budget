/* @naejip/core 재노출 — 화면 코드는 이 모듈만 import한다.
 *
 * package.json에 워크스페이스 의존성("@naejip/core": "*")으로 넣으면
 * `ait build`의 collect-package-version 플러그인이 심볼릭 링크된 비공개
 * 워크스페이스 패키지의 경로를 추출하지 못해 빌드가 실패한다.
 * (granite dev/build는 통과하지만 .ait 아티팩트 생성 단계에서 깨진다.)
 * 그래서 의존성 선언 없이 상대 경로로 가져오고, 경로 깊이는 이 파일에만 둔다.
 */
export * from "../../../packages/core/src/index.ts";
