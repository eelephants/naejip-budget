/* =========================================================
 * 폼 모델 — 앱(React Native / 앱인토스)이 공유하는 입력 상태
 * 화면에서는 문자열로 들고 있다가 계산 직전에 숫자로 바꾼다.
 * (웹은 DOM에서 직접 값을 읽으므로 이 모듈을 쓰지 않는다.)
 * ========================================================= */

import { parseMan, parseNum } from "./format.ts";
import type { BudgetInput } from "./calc.ts";

export interface FormState {
  seedSelf: string;
  seedSpouse: string;
  grossSelf: string;
  grossSpouse: string;
  netSelf: string;
  netSpouse: string;
  netWorth: string;
  houses: string;
  firstTime: boolean;
  newlywed: boolean;
  children: string;
  bornAfter23: boolean;
  livingCost: string;
  loanRate: string;
  loanYears: string;
  isMetro: boolean;
  priceReg: string;
  priceNon: string;
  costRate: string;
  dsrRate: string;
  dsrYears: string;
  creditRate: string;
  existingDebt: string;
  useStress: boolean;
}

export const DEFAULT_FORM: FormState = {
  seedSelf: "0",
  seedSpouse: "0",
  grossSelf: "0",
  grossSpouse: "0",
  netSelf: "0",
  netSpouse: "0",
  netWorth: "0",
  houses: "0",
  firstTime: false,
  newlywed: false,
  children: "0",
  bornAfter23: false,
  livingCost: "0",
  loanRate: "4.0",
  loanYears: "30",
  isMetro: true,
  priceReg: "0",
  priceNon: "0",
  costRate: "2.0",
  dsrRate: "4.5",
  dsrYears: "30",
  creditRate: "6.0",
  existingDebt: "0",
  useStress: true,
};

export function toBudgetInput(f: FormState): BudgetInput {
  return {
    seed: parseMan(f.seedSelf) + parseMan(f.seedSpouse),
    gross: parseMan(f.grossSelf) + parseMan(f.grossSpouse),
    net: parseMan(f.netSelf) + parseMan(f.netSpouse),
    netWorth: parseMan(f.netWorth),
    houses: parseNum(f.houses),
    firstTime: f.firstTime,
    newlywed: f.newlywed,
    children: parseNum(f.children),
    bornAfter23: f.bornAfter23,
    living: parseMan(f.livingCost),
    loanRate: parseNum(f.loanRate),
    loanYears: parseNum(f.loanYears),
    isMetro: f.isMetro,
    priceReg: parseMan(f.priceReg),
    priceNon: parseMan(f.priceNon),
    costRate: parseNum(f.costRate),
    dsrRate: parseNum(f.dsrRate),
    dsrYears: parseNum(f.dsrYears),
    creditRate: parseNum(f.creditRate),
    useStress: f.useStress,
    existingDebtMonthly: parseMan(f.existingDebt),
  };
}
