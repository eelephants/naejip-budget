// 파일 기반 라우팅 — pages/ 아래 파일이 intoss://naejip-budget/<경로>로 매핑된다.
// @ts-ignore Metro의 require.context는 타입 선언이 없다.
export const context = require.context("./pages");
