/* 속성(불변식) 테스트 — 계단식 한도 로직의 경계값 버그를 랜덤 탐색으로 잡는다 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dir = dirname(fileURLToPath(import.meta.url));
const { RULESETS } = require(join(dir, "..", "rulesets.js"));
const { computeBudget } = require(join(dir, "..", "calc.js"));

const MAN = 10_000;
const EOK = 100_000_000;
const ITER = 300;
const EPS = 1e-6;

/* 결정적 PRNG (mulberry32) — 실패 재현 가능 */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInput(rnd) {
  const gross = Math.round((0.2 + rnd() * 2.3) * EOK); // 2천 ~ 2.5억
  return {
    seed: Math.round(rnd() * 10 * EOK),
    gross,
    net: Math.round(gross * (0.75 + rnd() * 0.15)),
    netWorth: Math.round(rnd() * 8 * EOK),
    houses: Math.floor(rnd() * 3),
    firstTime: rnd() < 0.5,
    newlywed: rnd() < 0.5,
    children: Math.floor(rnd() * 4),
    bornAfter23: rnd() < 0.3,
    living: Math.round((50 + rnd() * 350) * MAN),
    loanRate: 2 + rnd() * 4,
    loanYears: 10 + Math.floor(rnd() * 31),
    isMetro: rnd() < 0.7,
    priceReg: Math.round((1 + rnd() * 29) * EOK),
    priceNon: Math.round((1 + rnd() * 29) * EOK),
    costRate: rnd() * 3,
    dsrRate: 3 + rnd() * 3,
    dsrYears: 10 + Math.floor(rnd() * 31),
    creditRate: 4 + rnd() * 6,
    useStress: rnd() < 0.8,
    existingDebtMonthly: Math.round(rnd() * 300 * MAN),
  };
}

const eachRuleset = (fn) => {
  for (const id of Object.keys(RULESETS)) fn(RULESETS[id], id);
};

test("P1: 세후소득 증가 → 최종 예산은 감소하지 않는다 (자격 불변 조건)", () => {
  eachRuleset((R, id) => {
    const rnd = mulberry32(11 + id.length);
    for (let i = 0; i < ITER; i++) {
      const a = randomInput(rnd);
      const b = { ...a, net: a.net + Math.round((10 + rnd() * 200) * MAN) * 12 };
      const ra = computeBudget(a, R);
      const rb = computeBudget(b, R);
      for (const k of ["reg", "non"]) {
        assert.ok(
          rb.s8[k].budget >= ra.s8[k].budget - EPS,
          `[${id}] iter=${i} region=${k}: net↑인데 budget↓ (${ra.s8[k].budget} → ${rb.s8[k].budget})\ninput=${JSON.stringify(a)}`
        );
      }
    }
  });
});

test("P2: 같은 매매가면 규제지역 예산 ≤ 비규제지역 예산", () => {
  eachRuleset((R, id) => {
    const rnd = mulberry32(23);
    for (let i = 0; i < ITER; i++) {
      const a = randomInput(rnd);
      a.priceNon = a.priceReg;
      const r = computeBudget(a, R);
      assert.ok(
        r.s8.reg.budget <= r.s8.non.budget + EPS,
        `[${id}] iter=${i}: 규제 예산 > 비규제 예산 (${r.s8.reg.budget} > ${r.s8.non.budget})\ninput=${JSON.stringify(a)}`
      );
    }
  });
});

test("P3: 종잣돈 증가 → 최종 예산은 감소하지 않는다", () => {
  eachRuleset((R, id) => {
    const rnd = mulberry32(37);
    for (let i = 0; i < ITER; i++) {
      const a = randomInput(rnd);
      const b = { ...a, seed: a.seed + Math.round(rnd() * 2 * EOK) };
      const ra = computeBudget(a, R);
      const rb = computeBudget(b, R);
      for (const k of ["reg", "non"]) {
        assert.ok(
          rb.s8[k].budget >= ra.s8[k].budget - EPS,
          `[${id}] iter=${i} region=${k}: seed↑인데 budget↓\ninput=${JSON.stringify(a)}`
        );
      }
    }
  });
});

test("P4: 대출액·예산은 음수/NaN이 없고, 예산 = 가용종잣돈 + 대출", () => {
  eachRuleset((R, id) => {
    const rnd = mulberry32(53);
    for (let i = 0; i < ITER; i++) {
      const a = randomInput(rnd);
      const r = computeBudget(a, R);
      for (const k of ["reg", "non"]) {
        const s = r.s8[k];
        assert.ok(s.loan >= 0 && Number.isFinite(s.loan), `[${id}] loan invalid: ${s.loan}`);
        assert.ok(Number.isFinite(s.budget), `[${id}] budget invalid`);
        assert.ok(Math.abs(s.budget - (s.availSeed + s.loan)) < 1, `[${id}] budget != availSeed+loan`);
        assert.ok(r.dsr[k].ratio >= 0 && Number.isFinite(r.dsr[k].ratio), `[${id}] dsr invalid`);
      }
    }
  });
});

test("P5: 디딤돌 소득 경계값 (단독가구 6,000만원)", () => {
  const base = {
    seed: 2 * EOK, netWorth: 2 * EOK, houses: 0,
    firstTime: false, newlywed: false, children: 0, bornAfter23: false,
    net: 5000 * MAN, living: 200 * MAN, loanRate: 4, loanYears: 30, isMetro: true,
    priceReg: 4.5 * EOK, priceNon: 4.5 * EOK, costRate: 2,
    dsrRate: 4.5, dsrYears: 30, creditRate: 6, useStress: true, existingDebtMonthly: 0,
  };
  eachRuleset((R, id) => {
    assert.equal(computeBudget({ ...base, gross: 6000 * MAN }, R).loanType, "didim", `[${id}] 6,000만원은 디딤돌 가능`);
    assert.equal(computeBudget({ ...base, gross: 6000 * MAN + 1 }, R).didimOK, false, `[${id}] 6,000만원 초과는 디딤돌 불가`);
  });
});

test("P6: 현행 주담대 시가별 절대한도 (6억/4억/2억)", () => {
  const R = RULESETS["2026-08"];
  const base = {
    seed: 12 * EOK, netWorth: 12 * EOK, houses: 0,
    firstTime: false, newlywed: false, children: 0, bornAfter23: false,
    gross: 3 * EOK, net: 2.4 * EOK, living: 200 * MAN, loanRate: 4, loanYears: 30, isMetro: true,
    costRate: 0, dsrRate: 4.5, dsrYears: 30, creditRate: 6, useStress: true, existingDebtMonthly: 0,
    priceNon: EOK,
  };
  // 소득·LTV 여유가 충분한 프로필에서 절대한도가 상한이 되는지 확인 (규제지역 LTV 40%)
  const at = (p) => computeBudget({ ...base, priceReg: p }, R).s8.reg.loan;
  assert.equal(at(14 * EOK), Math.min(14 * EOK * 0.4, 6 * EOK)); // 5.6억 (LTV가 먼저 걸림)
  assert.equal(at(15 * EOK), 6 * EOK);                            // 6억 캡
  assert.equal(at(20 * EOK), 4 * EOK);                            // 4억 캡
  assert.equal(at(26 * EOK), 2 * EOK);                            // 2억 캡
});

test("P7: 현행 2주택 이상은 규제지역·수도권 대출 0", () => {
  const R = RULESETS["2026-08"];
  const input = {
    seed: 5 * EOK, netWorth: 5 * EOK, houses: 2,
    firstTime: false, newlywed: false, children: 0, bornAfter23: false,
    gross: 1.5 * EOK, net: 1.2 * EOK, living: 200 * MAN, loanRate: 4, loanYears: 30, isMetro: true,
    priceReg: 8 * EOK, priceNon: 8 * EOK, costRate: 2,
    dsrRate: 4.5, dsrYears: 30, creditRate: 6, useStress: true, existingDebtMonthly: 0,
  };
  const r = computeBudget(input, R);
  assert.equal(r.s8.reg.loan, 0);
  assert.equal(r.s8.non.loan, 0); // 수도권 비규제도 금지
  const rural = computeBudget({ ...input, isMetro: false }, R);
  assert.ok(rural.s8.non.loan > 0); // 지방 비규제는 LTV 60%로 가능
});
