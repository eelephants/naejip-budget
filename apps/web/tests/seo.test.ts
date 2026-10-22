/* SEO 회귀 테스트 — 빌드 산출물(dist)의 크롤링·공유 메타를 검증한다. `npm test`가 빌드 후 실행 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const SITE = "https://naejip-budget.site/";
const html = readFileSync(join(dist, "index.html"), "utf8");
const attr = (sel: RegExp): string | undefined => html.match(sel)?.[1];
const meta = (k: string): string | undefined => attr(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`));

test("canonical은 쿼리 없는 정식 URL", () => {
  assert.equal(attr(/<link rel="canonical" href="([^"]+)"/), SITE);
});

test("OG·Twitter 카드 메타", () => {
  for (const p of ["og:title", "og:description", "og:url", "og:type", "og:locale"]) assert.ok(meta(p), `${p} 없음`);
  assert.equal(meta("og:image"), `${SITE}og.png`); // autoplan: https 접두만 보면 파일명 오타가 통과
  assert.equal(meta("twitter:card"), "summary_large_image");
});

test("JSON-LD는 유효한 WebApplication", () => {
  const raw = attr(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(raw, "JSON-LD 없음");
  const ld = JSON.parse(raw!);
  assert.equal(ld["@type"], "WebApplication");
  assert.equal(ld.url, SITE);
});

test("title에 핵심 키워드, head에 연월 하드코딩 없음", () => {
  assert.match(attr(/<title>([^<]+)<\/title>/)!, /대출/);
  assert.doesNotMatch(html.split("</head>")[0], /20\d\d년|20\d\d\.\d/); // autoplan: title만이 아니라 description·og 포함
});

test("robots·sitemap·favicon·og 이미지가 dist에 존재하고 서로 맞물림", () => {
  for (const f of ["robots.txt", "sitemap.xml", "favicon.svg", "og.png"]) assert.ok(existsSync(join(dist, f)), `${f} 없음`);
  assert.ok(readFileSync(join(dist, "robots.txt"), "utf8").includes(`Sitemap: ${SITE}sitemap.xml`));
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes(`<loc>${SITE}</loc>`));
  assert.ok(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), "sitemap 네임스페이스 없음"); // autoplan
  assert.ok(html.includes('href="favicon.svg"'), "favicon 링크 없음"); // autoplan: 상대경로 — style.css·app.js와 동일, `npm run web`(file://)에서도 동작
});
