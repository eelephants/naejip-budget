/* =========================================================
 * 예산 계산 엔진 — 순수 함수 (input, ruleset) => result
 * DOM/규제 데이터에 의존하지 않아 Node 테스트에서 그대로 사용한다.
 * ========================================================= */

import { EOK } from "./rulesets.ts";
import type { RegionKey, Ruleset } from "./rulesets.ts";

export type LoanType = "newborn" | "didim" | "bogeum" | "general";

/** 금액은 모두 원 단위, 이율은 % 단위 */
export interface BudgetInput {
  seed: number;
  gross: number;
  net: number;
  netWorth: number;
  houses: number;
  firstTime: boolean;
  newlywed: boolean;
  children: number;
  bornAfter23: boolean;
  /** 월 생활비 */
  living: number;
  loanRate: number;
  loanYears: number;
  /** 비규제지역 시나리오도 수도권인지 */
  isMetro: boolean;
  priceReg: number;
  priceNon: number;
  /** 부대비용률 (취득세·중개보수 등, 매매가 대비 %) */
  costRate: number;
  dsrRate: number;
  dsrYears: number;
  creditRate: number;
  useStress: boolean;
  existingDebtMonthly: number;
}

export interface Step5 {
  ltv: number;
  /** 종잣돈÷(1-LTV)-종잣돈 */
  ltvCap: number;
  amt: number;
  /** 디딤돌 + 보금자리 추가분 분해 (디딤돌 대상만) */
  parts: { d: number; e: number } | null;
}

export interface Step6 extends Step5 {
  budgetBefore: number;
  loanWithCap: number;
  budgetCap: number;
  effLtv: number;
}

export interface Step8 {
  price: number;
  loan: number;
  appliedType: LoanType;
  ltvUsed: number;
  cost: number;
  availSeed: number;
  budget: number;
  ok: boolean;
  shortfall: number;
  policyExceeded: boolean;
}

export interface DsrCheck {
  price: number;
  loan: number;
  appliedType: LoanType;
  mPmt: number;
  credit: number;
  cPmt: number;
  existing: number;
  tot: number;
  monthlyGross: number;
  ratio: number;
  pass: boolean;
}

export type ByRegion<T> = Record<RegionKey, T>;

export interface BudgetResult {
  ruleset: Ruleset["id"];
  seed: number;
  gross: number;
  net: number;
  netWorth: number;
  houses: number;
  firstTime: boolean;
  newlywed: boolean;
  children: number;
  bornAfter23: boolean;
  netWorthOK: boolean;
  newbornOK: boolean;
  didimOK: boolean;
  bogeumOK: boolean;
  loanType: LoanType;
  isPolicy: boolean;
  monthlyNet: number;
  living: number;
  pay: number;
  months: number;
  affordable: number;
  conservative: number;
  didimLimit: number;
  bogeumStandalone: number;
  bogeumExtra: number;
  amtNewborn: number;
  amtDidim: number;
  amtDidimExtra: number;
  amtBogeum: number;
  amtGeneral: number;
  priceCap: number;
  s5: ByRegion<Step5>;
  s6: ByRegion<Step6>;
  s8: ByRegion<Step8>;
  dsr: ByRegion<DsrCheck>;
  dsrRateEff: number;
  creditRateEff: number;
  stressOn: boolean;
}

function pmt(monthlyRate: number, months: number, principal: number): number {
  if (principal <= 0) return 0;
  if (monthlyRate <= 0) return principal / months;
  const k = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * k) / (k - 1);
}

export function computeBudget(input: BudgetInput, R: Ruleset): BudgetResult {
  const { seed, gross, net, houses } = input;
  const noHouse = houses === 0;
  const isMetro = !!input.isMetro;

  /* ---- 2단계: 정책대출 자격 (소득 + 순자산 요건) ---- */
  const netWorthOK = input.netWorth <= R.netWorthCap; // 기금대출(신생아·디딤돌) 자산요건

  const newbornOK = noHouse && input.bornAfter23 && gross <= R.newbornIncomeMax && netWorthOK;
  const didimOK =
    noHouse &&
    netWorthOK &&
    (gross <= 0.6 * EOK ||
      (gross <= 0.7 * EOK && (input.firstTime || input.children >= 2)) ||
      (gross <= 0.85 * EOK && input.newlywed));
  const bogeumOK =
    noHouse &&
    (gross <= 0.7 * EOK ||
      (input.children >= 3 && gross <= 1.0 * EOK) ||
      (input.children === 2 && gross <= 0.9 * EOK) ||
      (input.newlywed && gross <= 0.85 * EOK) ||
      (input.children === 1 && gross <= 0.8 * EOK));

  const loanType: LoanType = newbornOK ? "newborn" : didimOK ? "didim" : bogeumOK ? "bogeum" : "general";
  const isPolicy = loanType === "newborn" || loanType === "didim";

  /* ---- 3단계: 소득 기준 감당가능 대출액 ---- */
  const monthlyNet = net / 12;
  const pay = Math.max(monthlyNet - input.living, 0);
  const months = input.loanYears * 12;
  const mr = input.loanRate / 100 / 12;
  const affordable =
    mr > 0 ? (pay * (Math.pow(1 + mr, months) - 1)) / (mr * Math.pow(1 + mr, months)) : pay * months;
  const conservative = pay * (isPolicy ? 150 : 120);

  /* ---- 4단계: 대출 종류별 한도 ---- */
  const didimLimit =
    input.children >= 2 || input.newlywed
      ? R.didimLimit.multi
      : input.firstTime
        ? R.didimLimit.first
        : R.didimLimit.base;
  const bogeumStandalone = input.children >= 3 ? 4 * EOK : 3.6 * EOK;
  const bogeumExtra = Math.max(bogeumStandalone - didimLimit, 0); // 디딤돌 한도 초과분의 보금자리 추가 조달

  const A = conservative;
  const amtNewborn = loanType === "newborn" ? Math.min(A, R.newbornLimit) : 0;
  const amtDidim = loanType === "didim" ? Math.min(A, didimLimit) : 0;
  const amtDidimExtra =
    loanType === "didim" ? (A > didimLimit + bogeumExtra ? bogeumExtra : Math.max(A - amtDidim, 0)) : 0;
  const amtBogeum = loanType === "bogeum" ? Math.min(A, bogeumStandalone) : 0;
  const amtGeneral = A;

  const capApplies = (region: RegionKey): boolean =>
    !!R.capByPrice && (region === "reg" || isMetro);

  const generalLtvOf = (region: RegionKey): number => {
    if (houses >= 2) {
      return region === "reg" ? R.multiHouseLtv.reg : isMetro ? R.multiHouseLtv.metroNon : R.multiHouseLtv.non;
    }
    return R.generalLtv[region];
  };

  /* ---- 5단계: 지역별 LTV ---- */
  function step5(region: RegionKey): Step5 {
    const ltv = loanType === "general" ? generalLtvOf(region) : R.policyLtv[region];
    const ltvCap = ltv >= 1 ? Infinity : seed / (1 - ltv) - seed;
    let amt: number;
    let parts: Step5["parts"] = null;
    if (loanType === "newborn") {
      amt = Math.min(amtNewborn, ltvCap);
    } else if (loanType === "didim") {
      const d = Math.min(ltvCap, amtDidim);
      const e = Math.max(Math.min(ltvCap - d, amtDidimExtra), 0);
      amt = d + e;
      parts = { d, e };
    } else if (loanType === "bogeum") {
      amt = Math.min(ltvCap, amtBogeum);
    } else {
      amt = Math.min(ltvCap, amtGeneral);
      if (capApplies(region)) amt = Math.min(amt, 6 * EOK); // 가격 미정 단계 → 최대 6억
    }
    return { ltv, ltvCap, amt, parts };
  }

  /* ---- 6단계: 정책대출 매매가 한도 ---- */
  const priceCap =
    loanType === "newborn"
      ? 9 * EOK
      : loanType === "didim"
        ? input.newlywed || input.children >= 2
          ? 6 * EOK
          : 5 * EOK
        : loanType === "bogeum"
          ? 6 * EOK
          : Infinity;

  function step6(region: RegionKey): Step6 {
    const s5 = step5(region);
    const budgetBefore = seed + s5.amt;
    const loanWithCap = priceCap === Infinity ? s5.amt : Math.min(priceCap * s5.ltv, s5.amt);
    const budgetCap = Math.min(budgetBefore, priceCap);
    return {
      ltv: s5.ltv,
      ltvCap: s5.ltvCap,
      amt: s5.amt,
      parts: s5.parts,
      budgetBefore,
      loanWithCap,
      budgetCap,
      effLtv: budgetCap > 0 ? loanWithCap / budgetCap : 0,
    };
  }

  /* ---- 부대비용: 매매가 × 부대비용률 − 생애최초 취득세 감면 ---- */
  function sideCost(price: number): number {
    if (price <= 0) return 0;
    let cost = (price * input.costRate) / 100;
    if (input.firstTime) cost -= Math.min(2_000_000, cost); // 생애최초 취득세 감면(한도 200만원)
    return Math.max(cost, 0);
  }

  /* ---- 7~8단계: 희망 매매가 기준 최종 예산 ---- */
  function step8(region: RegionKey): Step8 {
    const price = region === "reg" ? input.priceReg : input.priceNon;
    const s5 = step5(region);
    let loan: number;
    let appliedType: LoanType;
    let ltvUsed: number;
    if (loanType !== "general" && price <= priceCap && price > 0) {
      ltvUsed = R.policyLtv[region];
      loan = Math.min(s5.amt, price * ltvUsed);
      appliedType = loanType;
    } else {
      ltvUsed = generalLtvOf(region);
      const adjGeneral = isPolicy ? (conservative * 120) / 150 : conservative;
      loan = Math.min(price * ltvUsed, adjGeneral);
      // capApplies가 이미 capByPrice 존재를 확인하지만, 좁히기 위해 함께 검사한다.
      if (capApplies(region) && R.capByPrice) loan = Math.min(loan, R.capByPrice(price));
      appliedType = "general";
    }
    const cost = sideCost(price);
    const availSeed = seed - cost; // 가용 종잣돈 = 종잣돈 − 부대비용
    const budget = availSeed + loan;
    return {
      price,
      loan,
      appliedType,
      ltvUsed,
      cost,
      availSeed,
      budget,
      ok: price > 0 && price <= budget,
      shortfall: Math.max(price - budget, 0),
      policyExceeded: loanType !== "general" && price > priceCap,
    };
  }

  /* ---- DSR 점검 (기존부채 포함, 스트레스 금리는 주담대·신용대출 공통 가산) ---- */
  const stressOn = !!input.useStress && R.stressAdd > 0;
  const dsrRateEff = input.dsrRate + (stressOn ? R.stressAdd : 0);
  const creditRateEff = input.creditRate + (stressOn ? R.stressAdd : 0);

  function dsrCheck(region: RegionKey): DsrCheck {
    const s8 = step8(region);
    const mPmt = pmt(dsrRateEff / 100 / 12, input.dsrYears * 12, s8.loan);
    const credit = s8.shortfall;
    const cPmt = (credit / 5 + credit * (creditRateEff / 100)) / 12;
    const tot = mPmt + cPmt + input.existingDebtMonthly;
    const monthlyGross = gross / 12;
    const ratio = monthlyGross > 0 ? tot / monthlyGross : 0;
    return {
      price: s8.price,
      loan: s8.loan,
      appliedType: s8.appliedType,
      mPmt,
      credit,
      cPmt,
      existing: input.existingDebtMonthly,
      tot,
      monthlyGross,
      ratio,
      pass: ratio <= 0.4,
    };
  }

  return {
    ruleset: R.id,
    seed,
    gross,
    net,
    netWorth: input.netWorth,
    houses,
    firstTime: input.firstTime,
    newlywed: input.newlywed,
    children: input.children,
    bornAfter23: input.bornAfter23,
    netWorthOK,
    newbornOK,
    didimOK,
    bogeumOK,
    loanType,
    isPolicy,
    monthlyNet,
    living: input.living,
    pay,
    months,
    affordable,
    conservative,
    didimLimit,
    bogeumStandalone,
    bogeumExtra,
    amtNewborn,
    amtDidim,
    amtDidimExtra,
    amtBogeum,
    amtGeneral,
    priceCap,
    s5: { reg: step5("reg"), non: step5("non") },
    s6: { reg: step6("reg"), non: step6("non") },
    s8: { reg: step8("reg"), non: step8("non") },
    dsr: { reg: dsrCheck("reg"), non: dsrCheck("non") },
    dsrRateEff,
    creditRateEff,
    stressOn,
  };
}
