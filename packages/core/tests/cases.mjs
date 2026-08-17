/* 골든 테스트 케이스 10개 — 금액은 모두 원 단위 */

const MAN = 10_000;
const EOK = 100_000_000;

const base = {
  seed: 1.9 * EOK,
  gross: 8445 * MAN,
  net: 7488 * MAN,
  netWorth: 1.9 * EOK,
  houses: 0,
  firstTime: true,
  newlywed: true,
  children: 0,
  bornAfter23: false,
  living: 200 * MAN,
  loanRate: 4.0,
  loanYears: 30,
  isMetro: true,
  priceReg: 10 * EOK,
  priceNon: 10 * EOK,
  costRate: 2.0,
  dsrRate: 4.5,
  dsrYears: 30,
  creditRate: 6.0,
  useStress: true,
  existingDebtMonthly: 0,
};

export const CASES = [
  { id: "01-legacy-excel-example", ruleset: "2024-07", input: { ...base } },
  { id: "02-current-same-profile", ruleset: "2026-08", input: { ...base } },
  {
    id: "03-current-newborn",
    ruleset: "2026-08",
    input: { ...base, children: 1, bornAfter23: true, gross: 1.2 * EOK, net: 1.0 * EOK, priceReg: 8 * EOK, priceNon: 8 * EOK },
  },
  {
    id: "04-current-bogeum-3kids",
    ruleset: "2026-08",
    input: { ...base, newlywed: false, firstTime: false, children: 3, gross: 9500 * MAN, net: 8200 * MAN, priceReg: 5.5 * EOK, priceNon: 5.5 * EOK },
  },
  {
    id: "05-current-general-high-income",
    ruleset: "2026-08",
    input: { ...base, newlywed: false, firstTime: false, gross: 1.5 * EOK, net: 1.2 * EOK, seed: 4 * EOK, netWorth: 4 * EOK, priceReg: 12 * EOK, priceNon: 12 * EOK },
  },
  {
    id: "06-current-two-houses",
    ruleset: "2026-08",
    input: { ...base, houses: 2, newlywed: false, firstTime: false, priceReg: 8 * EOK, priceNon: 8 * EOK },
  },
  {
    id: "07-current-price-tier-caps",
    ruleset: "2026-08",
    input: { ...base, newlywed: false, firstTime: false, gross: 2 * EOK, net: 1.6 * EOK, seed: 10 * EOK, netWorth: 10 * EOK, priceReg: 20 * EOK, priceNon: 30 * EOK },
  },
  {
    id: "08-current-networth-exceeds-fund-cap",
    ruleset: "2026-08",
    input: { ...base, netWorth: 6 * EOK, gross: 8000 * MAN, net: 7000 * MAN, priceReg: 5.8 * EOK, priceNon: 5.8 * EOK },
  },
  {
    id: "09-legacy-firsttime-only",
    ruleset: "2024-07",
    input: { ...base, newlywed: false, firstTime: true, gross: 6800 * MAN, net: 6000 * MAN, priceReg: 4.8 * EOK, priceNon: 4.8 * EOK },
  },
  {
    id: "10-current-didim-income-boundary",
    ruleset: "2026-08",
    input: { ...base, newlywed: false, firstTime: false, gross: 6000 * MAN, net: 5300 * MAN, priceReg: 4.5 * EOK, priceNon: 4.5 * EOK },
  },
];
