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

test("애드센스 스크립트와 ads.txt의 게시자 ID가 일치", () => {
  const client = attr(/adsbygoogle\.js\?client=ca-(pub-\d+)/);
  assert.ok(client, "애드센스 스크립트 없음");
  assert.ok(readFileSync(join(dist, "ads.txt"), "utf8").includes(`google.com, ${client}, DIRECT, f08c47fec0942fa0`));
  assert.ok(existsSync(join(dist, "privacy.html")) && html.includes('href="privacy.html"'), "개인정보처리방침 페이지·링크 없음");
});

test("가이드 페이지: sitemap 등재, 고유 canonical·title, 애드센스·메인 링크", () => {
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  const titles = new Set<string>();
  for (const slug of ["budget", "policy-loans", "dsr", "ltv", "faq"]) {
    const url = `${SITE}guide/${slug}.html`;
    const page = readFileSync(join(dist, "guide", `${slug}.html`), "utf8");
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${slug} sitemap 누락`);
    assert.ok(page.includes(`<link rel="canonical" href="${url}" />`), `${slug} canonical`);
    assert.ok(page.includes("adsbygoogle.js?client=ca-pub-"), `${slug} 애드센스 없음`);
    assert.ok(html.includes(`href="guide/${slug}.html"`), `메인에서 ${slug} 링크 없음`);
    titles.add(page.match(/<title>([^<]+)<\/title>/)![1]);
  }
  assert.equal(titles.size, 5, "가이드 title 중복");
});

test("검색어별 계산기 페이지: sitemap·canonical·고유 title·JSON-LD·메인 링크·빠른 계산기 스크립트", () => {
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  assert.ok(existsSync(join(dist, "quick.js")), "quick.js 빌드 산출물 없음");
  const titles = new Set<string>();
  for (const slug of ["budget", "policy-loans", "dsr", "ltv", "faq"]) {
    titles.add(readFileSync(join(dist, "guide", `${slug}.html`), "utf8").match(/<title>([^<]+)<\/title>/)![1]);
  }
  for (const slug of ["didimdol", "newborn-loan", "mortgage-limit", "dsr"]) {
    const url = `${SITE}calculator/${slug}.html`;
    const page = readFileSync(join(dist, "calculator", `${slug}.html`), "utf8");
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${slug} sitemap 누락`);
    assert.ok(page.includes(`<link rel="canonical" href="${url}" />`), `${slug} canonical`);
    assert.ok(page.includes("adsbygoogle.js?client=ca-pub-"), `${slug} 애드센스 없음`);
    assert.ok(page.includes('<script src="/quick.js"></script>') && page.includes("data-quick="), `${slug} 빠른 계산기 없음`);
    assert.ok(html.includes(`href="calculator/${slug}.html"`), `메인에서 ${slug} 링크 없음`);
    const types = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])["@type"]);
    assert.deepEqual(types, ["WebApplication", "FAQPage"], `${slug} JSON-LD`);
    assert.doesNotMatch(page.split("</head>")[0], /20\d\d년|20\d\d\.\d/, `${slug} head에 연월`);
    titles.add(page.match(/<title>([^<]+)<\/title>/)![1]);
  }
  assert.equal(titles.size, 9, "가이드·계산기 title 중복");
});

test("sitemap 모든 URL에 lastmod, 가이드는 dateModified·본문 업데이트 표기와 일치", () => {
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  for (const u of urls) assert.match(u, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, `lastmod 없음: ${u}`);
  for (const slug of ["", "budget.html", "policy-loans.html", "dsr.html", "ltv.html", "faq.html"]) {
    const url = `${SITE}guide/${slug}`;
    const page = readFileSync(join(dist, "guide", slug || "index.html"), "utf8");
    const lastmod = sitemap.match(new RegExp(`<loc>${url}</loc><lastmod>([^<]+)</lastmod>`))?.[1];
    const modified = page.match(/"dateModified": "([^"]+)"/)?.[1];
    assert.ok(modified, `${slug || "index"} dateModified 없음`);
    assert.equal(lastmod, modified, `${slug || "index"} sitemap lastmod ≠ dateModified`);
    assert.ok(page.includes(`<time datetime="${modified}">`), `${slug || "index"} 본문 업데이트 표기 불일치`);
  }
});
