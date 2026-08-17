/* 파일 기반 라우팅 진입점 — 실제 화면은 src/pages/index.tsx.
 * 템플릿 기본값은 baseUrl 별칭("pages/index")을 쓰지만, TS 6에서 baseUrl이
 * deprecated이므로 상대 경로로 재노출해 tsc·번들러 양쪽에서 설정 없이 해석되게 한다. */
export { Route } from "../src/pages/index";
