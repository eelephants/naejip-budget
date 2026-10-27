/* =========================================================
 * 검색어별 계산기 페이지(/calculator/*.html)의 빠른 계산기
 * 페이지마다 <form data-quick="종류" data-preset='{고정값}'> 하나를 두고,
 * 몇 개 안 되는 입력을 FormState로 옮겨 메인 계산기와 같은 엔진(@naejip/core)으로 계산한다.
 * ========================================================= */

import {
  DEFAULT_FORM,
  EOK,
  LOAN_LABEL,
  RULESETS,
  computeBudget,
  computeDsr,
  fmt,
  fmtWonExact,
  parseMan,
  parseNum,
  pct,
  toBudgetInput,
} from "@naejip/core";
import type { BudgetResult, FormState, RegionKey, Ruleset } from "@naejip/core";
import { ACTIVE_RULESET, attachMoneyInputs } from "./shared.ts";

type Kind = "didim" | "newborn" | "limit" | "dsr";

const R: Ruleset = RULESETS[ACTIVE_RULESET];

const form = document.querySelector<HTMLFormElement>("form[data-quick]");
const out = document.getElementById("quickResult");

/* ---------- 입력 → FormState ---------- */
const fieldValue = (name: string): string =>
  (form?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? "").replace(/,/g, "");
const has = (name: string): boolean => !!form?.querySelector(`[name="${name}"]`);

function readForm(): FormState {
  const preset = JSON.parse(form?.dataset.preset ?? "{}") as Partial<FormState>;
  const f: FormState = { ...DEFAULT_FORM, ...preset };
  // 부부 합산 값을 한 칸으로 받으므로 본인 칸에 넣고 배우자 칸은 0
  if (has("seed")) f.seedSelf = fieldValue("seed");
  if (has("gross")) f.grossSelf = fieldValue("gross");
  if (has("netMonthly")) f.netSelf = String(parseNum(fieldValue("netMonthly")) * 12); // 월 실수령액 → 연 세후소득(만원)
  if (has("living")) f.livingCost = fieldValue("living");
  if (has("netWorth")) f.netWorth = fieldValue("netWorth");
  if (has("children")) f.children = fieldValue("children");
  if (has("price")) f.priceReg = f.priceNon = fieldValue("price");
  for (const k of ["firstTime", "newlywed"] as const) if (has(k)) f[k] = fieldValue(k) === "Y";
  return f;
}

/* 메인 계산기로 이어 보기: 메인의 공유 링크와 같은 쿼리 형식 */
function fullCalcUrl(f: FormState): string {
  const p = new URLSearchParams();
  const keys = [
    "seedSelf", "seedSpouse", "grossSelf", "grossSpouse", "netSelf", "netSpouse", "netWorth",
    "children", "livingCost", "loanRate", "loanYears", "priceReg", "priceNon", "costRate",
    "dsrRate", "dsrYears", "creditRate", "existingDebt", "houses",
  ] as const;
  for (const k of keys) p.set(k, String(f[k]));
  for (const k of ["firstTime", "newlywed", "bornAfter23"] as const) p.set(k, f[k] ? "Y" : "N");
  p.set("metro", f.isMetro ? "1" : "0");
  p.set("stress", f.useStress ? "1" : "0");
  return "/?" + p.toString();
}

/* ---------- 렌더 조각 ---------- */
const rows = (items: [string, string][]): string =>
  `<dl class="answer-rows">${items.map(([k, v]) => `<div><dt>${k}</dt><dd class="num">${v}</dd></div>`).join("")}</dl>`;

const capOf = (res: BudgetResult, k: RegionKey): number =>
  res.s8[k].price > 0 ? res.s8[k].budget : res.priceCap === Infinity ? res.s6[k].budgetBefore : res.s6[k].budgetCap;

function budgetPair(res: BudgetResult): string {
  const one = (k: RegionKey, label: string, scope: string): string => {
    const priced = res.s8[k].price > 0;
    return `<div class="answer">
      <div class="answer-head"><h3>${label}</h3><span class="answer-scope">${scope}</span></div>
      <p class="answer-fig num">${fmt(capOf(res, k))}</p>
      <p class="answer-sub">${
        priced
          ? `매매가 ${fmt(res.s8[k].price)} 기준 최종 예산 · 대출 ${fmt(res.s8[k].loan)}`
          : `살 수 있는 집값 상한 · 종잣돈 ${fmt(res.seed)} + 대출 ${fmt(res.s6[k].loanWithCap)}`
      }</p>
    </div>`;
  };
  const topUp =
    res.loanType === "didim" && Math.max(res.s6.reg.loanWithCap, res.s6.non.loanWithCap) > res.didimLimit
      ? `<p class="note">디딤돌 한도 ${fmt(res.didimLimit)}을 넘는 대출은 보금자리론으로 채운다고 보고 계산했어요.</p>`
      : "";
  return `<div class="quick-pair">${one("reg", "규제지역", "서울 전역 등")}${one("non", "비규제지역", "수도권")}</div>${topUp}`;
}

const verdict = (ok: boolean, text: string): string => `<p class="quick-verdict ${ok ? "ok" : "bad"}">${text}</p>`;

const isEmpty = (f: FormState): boolean => parseMan(f.seedSelf) === 0 && parseMan(f.grossSelf) === 0;

/* ---------- 종류별 결과 ---------- */
function renderDidim(f: FormState): string {
  const res = computeBudget(toBudgetInput(f), R);
  const incomeCap = f.newlywed ? 0.85 * EOK : f.firstTime || parseNum(f.children) >= 2 ? 0.7 * EOK : 0.6 * EOK;
  const why = !res.netWorthOK
    ? `부부합산 순자산이 기준 ${fmt(R.netWorthCap)}을 넘어요.`
    : res.gross > incomeCap
      ? `부부합산 소득이 이 조건의 기준 ${fmt(incomeCap)}을 넘어요.`
      : "";
  const limit = res.didimLimit;
  const priceCap = f.newlywed || parseNum(f.children) >= 2 ? 6 * EOK : 5 * EOK;
  return `${verdict(res.didimOK, res.didimOK ? "디딤돌대출 대상이에요." : `디딤돌대출 대상이 아니에요. ${why}`)}
    ${rows([
      ["디딤돌 한도", fmt(limit)],
      ["매매가 상한", `${fmt(priceCap)} 이하 주택`],
      ["소득 기준", `${fmt(incomeCap)} 이하`],
      ["이 조건에서 이용할 대출", LOAN_LABEL[res.loanType]],
    ])}
    ${budgetPair(res)}`;
}

function renderNewborn(f: FormState): string {
  const res = computeBudget(toBudgetInput(f), R);
  const why = !res.netWorthOK
    ? `부부합산 순자산이 기준 ${fmt(R.netWorthCap)}을 넘어요.`
    : res.gross > R.newbornIncomeMax
      ? `부부합산 소득이 기준 ${fmt(R.newbornIncomeMax)}을 넘어요.`
      : "";
  return `${verdict(res.newbornOK, res.newbornOK ? "신생아특례대출 대상이에요." : `신생아특례대출 대상이 아니에요. ${why}`)}
    ${rows([
      ["신생아특례 한도", fmt(R.newbornLimit)],
      ["매매가 상한", "9억원 이하 주택"],
      ["소득 기준", `${fmt(R.newbornIncomeMax)} 이하 (맞벌이 한시 완화 기준)`],
      ["이 조건에서 이용할 대출", LOAN_LABEL[res.loanType]],
    ])}
    ${budgetPair(res)}`;
}

function renderLimit(f: FormState): string {
  const res = computeBudget(toBudgetInput(f), R);
  const priced = res.s8.reg.price > 0;
  const one = (k: RegionKey, label: string, scope: string): string => {
    const s8 = res.s8[k];
    const loan = priced ? s8.loan : res.s6[k].loanWithCap;
    const ltv = priced ? s8.ltvUsed : res.s6[k].ltv;
    const type = priced ? s8.appliedType : res.loanType;
    return `<div class="answer">
      <div class="answer-head"><h3>${label}</h3><span class="answer-scope">${scope}</span></div>
      <p class="answer-fig num">${fmt(loan)}</p>
      <p class="answer-sub">${priced ? `매매가 ${fmt(s8.price)} 집의 대출 한도` : "매매가 없이 본 최대 대출 한도"} · ${LOAN_LABEL[type]} · LTV ${pct(ltv, 0)}</p>
      ${
        priced
          ? rows([
              ["부대비용(추정)", fmt(s8.cost)],
              ["필요한 현금", fmt(Math.max(s8.price - s8.loan + s8.cost, 0))],
              ["가진 종잣돈", fmt(res.seed)],
            ]) + verdict(s8.ok, s8.ok ? "종잣돈과 대출로 살 수 있어요." : `${fmt(s8.shortfall)} 부족해요.`)
          : ""
      }
    </div>`;
  };
  return `<div class="quick-pair">${one("reg", "규제지역", "서울 전역 등")}${one("non", "비규제지역", "수도권")}</div>
    ${priced ? "" : '<p class="note">매매가를 넣으면 집값 구간별 주담대 한도(6억·4억·2억)와 부족 금액까지 나와요.</p>'}`;
}

function renderDsr(): string {
  const gross = parseMan(fieldValue("gross"));
  const q = {
    loan: parseMan(fieldValue("loan")),
    rate: parseNum(fieldValue("rate")),
    years: parseNum(fieldValue("years")),
    gross,
    existingDebtMonthly: parseMan(fieldValue("existing")),
    metroOrReg: fieldValue("area") !== "local",
    useStress: true,
  };
  if (gross === 0) return `<p class="quick-empty">세전 연소득을 넣으면 DSR이 나와요.</p>`;
  const d = computeDsr(q, R);
  const plain = computeDsr({ ...q, useStress: false }, R);
  return `<div class="answer">
      <div class="answer-head"><h3>스트레스 DSR</h3><span class="answer-scope">${q.metroOrReg ? "수도권·규제지역" : "지방"}</span></div>
      <p class="answer-fig num">${pct(d.ratio)}</p>
      <p class="answer-sub">적용금리 ${d.rate.toFixed(2)}% 기준 · 월 상환 ${fmtWonExact(d.tot)}</p>
      ${rows([
        ["가산금리 없이 본 DSR", pct(plain.ratio)],
        ["DSR 40%까지 빌릴 수 있는 주담대", fmt(d.maxLoan)],
        ["가산금리 없이 본 최대 주담대", fmt(plain.maxLoan)],
      ])}
      ${verdict(d.pass, d.pass ? "DSR 40% 이내예요." : "DSR 40%를 넘어요. 이 금액은 은행권 주담대로 받기 어려워요.")}
    </div>`;
}

function render(): void {
  if (!form || !out) return;
  const kind = form.dataset.quick as Kind;
  const link = document.getElementById("quickFull") as HTMLAnchorElement | null;
  if (kind === "dsr") {
    out.innerHTML = renderDsr();
    if (link) {
      const f: FormState = { ...DEFAULT_FORM, grossSelf: fieldValue("gross"), dsrRate: fieldValue("rate"), dsrYears: fieldValue("years"), existingDebt: fieldValue("existing") };
      link.href = fullCalcUrl(f);
    }
    return;
  }
  const f = readForm();
  if (isEmpty(f)) {
    out.innerHTML = `<p class="quick-empty">종잣돈과 소득을 넣으면 결과가 바로 나와요.</p>`;
  } else {
    out.innerHTML = kind === "didim" ? renderDidim(f) : kind === "newborn" ? renderNewborn(f) : renderLimit(f);
  }
  if (link) link.href = fullCalcUrl(f);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!form) return;
  attachMoneyInputs(form);
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
});

