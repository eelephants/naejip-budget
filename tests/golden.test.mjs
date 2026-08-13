/* 골든 회귀 테스트 — 룰셋 추가·엔진 수정 시 기존 결과가 깨지지 않는지 검증 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CASES } from "./cases.mjs";

const require = createRequire(import.meta.url);
const dir = dirname(fileURLToPath(import.meta.url));
const { RULESETS } = require(join(dir, "..", "rulesets.js"));
const { computeBudget } = require(join(dir, "..", "calc.js"));

const golden = JSON.parse(readFileSync(join(dir, "golden.json"), "utf8"));

for (const c of CASES) {
  test(`golden: ${c.id}`, () => {
    const actual = JSON.parse(JSON.stringify(computeBudget(c.input, RULESETS[c.ruleset])));
    assert.deepEqual(actual, golden[c.id]);
  });
}

/* 엑셀 원본 대조 — 케이스 01은 원본 예산표의 예시값과 일치해야 한다 (앵커 테스트) */
test("anchor: 01은 원본 엑셀 예시값과 일치", () => {
  const r = computeBudget(CASES[0].input, RULESETS["2024-07"]);
  assert.equal(r.loanType, "didim");
  assert.equal(r.conservative, 636_000_000);           // 엑셀 635,922,900 (만원 반올림 차)
  assert.equal(r.amtDidim, 400_000_000);               // 디딤돌 신혼 한도 4억
  assert.equal(r.amtDidimExtra, 0);
  assert.equal(Math.round(r.s5.reg.ltvCap), 443_333_333);
  assert.equal(r.s5.reg.amt, 400_000_000);
  assert.equal(r.s6.reg.budgetCap, 590_000_000);
  assert.equal(r.priceCap, 600_000_000);
  assert.equal(r.s8.reg.loan, 500_000_000);            // 10억 집, 규제 LTV 50%
  assert.equal(Math.round(r.s8.non.loan), 508_800_000); // 엑셀 508,738,320
});
