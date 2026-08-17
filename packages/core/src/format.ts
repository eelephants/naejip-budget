/* =========================================================
 * 표시 포맷 — 웹·앱 공용 (플랫폼 무의존)
 * 금액은 원 단위로 다루고, 입력은 만원 단위 문자열을 받는다.
 * ========================================================= */

import { EOK } from "./rulesets.ts";
import type { RegionKey } from "./rulesets.ts";
import type { LoanType } from "./calc.ts";

export const MAN = 10_000;

export const LOAN_LABEL: Record<LoanType, string> = {
  newborn: "신생아특례대출",
  didim: "디딤돌대출",
  bogeum: "기존보금자리론",
  general: "일반대출",
};

export const REGION_LABEL: Record<RegionKey, string> = {
  reg: "규제지역",
  non: "비규제지역",
};

/** 천단위 구분자 — toLocaleString은 RN(Hermes)의 Intl 지원 여부에 따라
 * 결과가 달라지므로 웹·앱 출력을 맞추려고 직접 넣는다. */
export function comma(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 190000000 → "1억 9,000만원" */
export function fmt(v: number | null | undefined): string {
  if (v === Infinity) return "한도없음";
  if (v == null || isNaN(v)) return "-";
  const neg = v < 0;
  const abs = Math.abs(Math.round(v));
  const eok = Math.floor(abs / EOK);
  const man = Math.round((abs - eok * EOK) / MAN);
  let s = "";
  if (eok) s += comma(eok) + "억";
  if (man) s += (s ? " " : "") + comma(man) + "만";
  if (!s) s = "0";
  return (neg ? "-" : "") + s + "원";
}

export function fmtWonExact(v: number): string {
  return comma(Math.round(v)) + "원";
}

export function pct(x: number, d = 1): string {
  return (x * 100).toFixed(d) + "%";
}

/** "19,000" (만원) → 190000000 (원) */
export function parseMan(s: string): number {
  const n = parseFloat(String(s).replace(/[^\d.]/g, ""));
  return (isNaN(n) ? 0 : n) * MAN;
}

/** "4.5" → 4.5 (숫자가 아니면 0) */
export function parseNum(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
