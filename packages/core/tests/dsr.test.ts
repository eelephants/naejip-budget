/* computeDsr — 대출액 기준 단독 DSR 계산: computeBudget의 dsrCheck와 같은 상환식·가산금리인지, 역산 최대 대출액이 40%를 정확히 채우는지 */
import test from "node:test";
import assert from "node:assert/strict";
import { RULESETS, computeBudget, computeDsr } from "../src/index.ts";
import type { BudgetInput } from "../src/index.ts";

const MAN = 10_000;
const EOK = 100_000_000;
const R = RULESETS["2026-10"];

test("수도권 스트레스 +3.0%p, 지방 +0.75%p, 해제 시 가산 없음", () => {
  const base = { loan: 3 * EOK, rate: 4.5, years: 30, gross: 7000 * MAN, existingDebtMonthly: 0, useStress: true };
  assert.equal(computeDsr({ ...base, metroOrReg: true }, R).rate, 7.5);
  assert.equal(computeDsr({ ...base, metroOrReg: false }, R).rate, 5.25);
  assert.equal(computeDsr({ ...base, metroOrReg: true, useStress: false }, R).rate, 4.5);
});

test("maxLoan은 DSR 40%를 정확히 채운다", () => {
  for (const metroOrReg of [true, false]) {
    const q = { loan: 0, rate: 4.2, years: 40, gross: 9500 * MAN, existingDebtMonthly: 35 * MAN, metroOrReg, useStress: true };
    const max = computeDsr(q, R).maxLoan;
    assert.ok(Math.abs(computeDsr({ ...q, loan: max }, R).ratio - 0.4) < 1e-9);
  }
});

test("기존부채가 40%를 넘으면 maxLoan 0, 소득 0이면 ratio 0", () => {
  const q = { loan: 1 * EOK, rate: 4.5, years: 30, gross: 3000 * MAN, existingDebtMonthly: 200 * MAN, metroOrReg: true, useStress: true };
  assert.equal(computeDsr(q, R).maxLoan, 0);
  assert.equal(computeDsr({ ...q, gross: 0 }, R).ratio, 0);
});

test("신용대출이 없는 경우 computeBudget의 DSR과 같다", () => {
  const input: BudgetInput = {
    seed: 3 * EOK, gross: 9000 * MAN, net: 7200 * MAN, netWorth: 3 * EOK, houses: 0,
    firstTime: false, newlywed: false, children: 0, bornAfter23: false,
    living: 250 * MAN, loanRate: 4, loanYears: 30, isMetro: true,
    priceReg: 4 * EOK, priceNon: 4 * EOK, costRate: 0,
    dsrRate: 4.5, dsrYears: 30, creditRate: 6, useStress: true, existingDebtMonthly: 20 * MAN,
  };
  const res = computeBudget(input, R);
  for (const k of ["reg", "non"] as const) {
    const d = res.dsr[k];
    assert.equal(d.credit, 0, "이 케이스는 신용대출이 없어야 비교가 성립");
    const q = computeDsr({ loan: d.loan, rate: 4.5, years: 30, gross: input.gross, existingDebtMonthly: input.existingDebtMonthly, metroOrReg: true, useStress: true }, R);
    assert.ok(Math.abs(q.ratio - d.ratio) < 1e-12);
  }
});
