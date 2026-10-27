/* =========================================================
 * DOM 레이어 — 입력 수집 → computeBudget(input, ruleset) → 렌더링
 * 계산·룰셋·표시 포맷은 모두 @naejip/core (웹·앱 공용).
 * ========================================================= */

import {
  LOAN_LABEL,
  REGION_LABEL,
  REGIONS,
  RULESETS,
  comma,
  computeBudget,
  fmt,
  fmtWonExact,
  lowerEarner,
  parseMan,
  parseNum,
  pct,
} from "@naejip/core";
import type { BudgetInput, RegionKey, Step8 } from "@naejip/core";
import { ACTIVE_RULESET, attachMoneyInputs } from "./shared.ts";

const EOK = 100_000_000;

/* ---------- DOM helpers ---------- */
type Valued = HTMLInputElement | HTMLSelectElement;

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} 요소를 찾을 수 없습니다`);
  return node as T;
}

const valued = (id: string): Valued => el<Valued>(id);
const money = (id: string): number => parseMan(valued(id).value);
const numOf = (id: string): number => parseNum(valued(id).value);
const isY = (id: string): boolean => valued(id).value === "Y";
const isChecked = (id: string): boolean => el<HTMLInputElement>(id).checked;

/* ---------- input collection ---------- */
function collectInput(): BudgetInput {
  return {
    seed: money("seedSelf") + money("seedSpouse"),
    gross: money("grossSelf") + money("grossSpouse"),
    grossLower: lowerEarner(money("grossSelf"), money("grossSpouse")),
    net: money("netSelf") + money("netSpouse"),
    netWorth: money("netWorth"),
    houses: numOf("houses"),
    firstTime: isY("firstTime"),
    newlywed: isY("newlywed"),
    children: numOf("children"),
    bornAfter23: isY("bornAfter23"),
    living: money("livingCost"),
    loanRate: numOf("loanRate"),
    loanYears: numOf("loanYears"),
    isMetro: isChecked("isMetro"),
    priceReg: money("priceReg"),
    priceNon: money("priceNon"),
    costRate: numOf("costRate"),
    dsrRate: numOf("dsrRate"),
    dsrYears: numOf("dsrYears"),
    creditRate: numOf("creditRate"),
    useStress: isChecked("useStress"),
    existingDebtMonthly: money("existingDebt"),
  };
}

/* ---------- render ---------- */
function render(): void {
  const R = RULESETS[ACTIVE_RULESET];
  const res = computeBudget(collectInput(), R);

  // 1단계 합계
  el("seedTotal").textContent = fmt(res.seed);
  el("grossTotal").textContent = fmt(res.gross);
  el("netTotal").textContent = fmt(res.net);

  // 2단계 자격
  const badge = (ok: boolean, label: string): string =>
    `<span class="badge ${ok ? "y" : "n"}">${label} ${ok ? "가능" : "불가"}</span>`;
  const netWorthWarn = !res.netWorthOK
    ? `<p class="notice">부부합산 순자산이 기금대출 자산요건(${fmt(R.netWorthCap)})을 넘어 신생아특례·디딤돌은 이용할 수 없어요.</p>`
    : "";
  el("loanEligibility").innerHTML = `
    <div><span class="lbl">이용가능 대출</span> <span class="big">${LOAN_LABEL[res.loanType]}</span>
      ${res.loanType === "newborn" ? " <small>(주택가격 9억 이하)</small>" : ""}
      ${res.loanType === "didim" ? ` <small>(주택가격 ${res.newlywed || res.children >= 2 ? "6억" : "5억"} 이하)</small>` : ""}
      ${res.loanType === "bogeum" ? " <small>(주택가격 6억 이하)</small>" : ""}
    </div>
    <div class="badges">
      ${badge(res.newbornOK, "신생아특례")}
      ${badge(res.didimOK, "디딤돌")}
      ${badge(res.bogeumOK, "보금자리론")}
      <span class="badge y">일반대출 가능</span>
    </div>${netWorthWarn}`;

  el("loanCriteria").innerHTML = `
    <div class="table-scroll"><table>
      <thead><tr><th>대출</th><th style="text-align:left">조건 (${R.name})</th></tr></thead>
      <tbody>
        <tr><td>신생아특례대출</td><td style="text-align:left;white-space:normal">
          무주택(또는 1주택 대환) · '23.1.1 이후 출생아 가구 · 부부합산 소득 1.3억 이하(맞벌이 한시 완화 시 2억 수준) · 순자산 ${fmt(R.netWorthCap)} 이하 · 주택가격 9억 이하 · 한도 ${fmt(R.newbornLimit)}</td></tr>
        <tr><td>디딤돌대출</td><td style="text-align:left;white-space:normal">
          무주택 · 부부합산 소득 6천 이하(생애최초·2자녀 이상 7천, 신혼 8.5천 이하) · 순자산 ${fmt(R.netWorthCap)} 이하 · 매매가 5억(신혼·2자녀 6억) 이하 · 한도 일반 ${fmt(R.didimLimit.base)} / 생초 ${fmt(R.didimLimit.first)} / 신혼·2자녀 ${fmt(R.didimLimit.multi)}</td></tr>
        <tr><td>기존보금자리론</td><td style="text-align:left;white-space:normal">
          무주택(또는 처분조건 1주택) · 소득 7천 이하(1자녀 8천, 2자녀 9천, 3자녀 1억, 신혼 8.5천${R.bogeumSpouseMax ? ` — 신혼 맞벌이는 초과해도 부부 중 1인 ${fmt(R.bogeumSpouseMax)} 이하면 가능` : ""}) · 매매가 6억 이하 · 한도 3.6억(3자녀 이상 4억)</td></tr>
      </tbody>
    </table></div>`;

  // 3단계
  el("monthlyNet").textContent = fmt(res.monthlyNet);
  el("step3Table").innerHTML = `
    <thead><tr><th>세후 월소득</th><th>생활비</th><th>상환가능 월원리금</th><th>대출금리</th><th>상환기간</th><th>감당가능 대출액<br>(원리금균등 단순계산)</th><th>보수적 감당가능 대출액<br>(월원리금 × ${res.isPolicy ? 150 : 120})</th></tr></thead>
    <tbody><tr>
      <td>${fmt(res.monthlyNet)}</td><td>${fmt(res.living)}</td><td class="em">${fmt(res.pay)}</td>
      <td class="center">${numOf("loanRate")}%</td><td class="center">${numOf("loanYears")}년 (${res.months}개월)</td>
      <td>${fmt(res.affordable)}</td><td class="em">${fmt(res.conservative)}</td>
    </tr></tbody>`;
  el("step3Note").textContent =
    "라이프스타일 변화(출산·양육 등)를 감안해, 이후 단계에서는 보수적 감당가능 대출액(월원리금 × " +
    (res.isPolicy ? "150" : "120") +
    ")을 사용합니다. 정책대출(신생아특례·디딤돌) 대상이면 150, 아니면 120을 곱합니다.";

  // 4단계
  el("step4LimitTable").innerHTML = `
    <thead><tr><th>구분</th><th>신생아특례</th><th>디딤돌</th><th>디딤돌+보금자리 추가분</th><th>보금자리론 단독</th><th>일반대출</th></tr></thead>
    <tbody>
      <tr><td>'23.1.1 이후 출생</td><td>${fmt(R.newbornLimit)}</td><td class="muted">-</td><td class="muted">-</td><td class="muted">-</td><td class="muted">한도없음</td></tr>
      <tr><td>신혼·2자녀 이상</td><td class="muted">-</td><td>${fmt(R.didimLimit.multi)}</td><td>${fmt(Math.max(3.6 * EOK - R.didimLimit.multi, 0))}</td><td>3억 6,000만원 (3자녀↑ 4억)</td><td class="muted">한도없음</td></tr>
      <tr><td>생애최초</td><td class="muted">-</td><td>${fmt(R.didimLimit.first)}</td><td>${fmt(Math.max(3.6 * EOK - R.didimLimit.first, 0))}</td><td>3억 6,000만원</td><td class="muted">한도없음</td></tr>
      <tr><td>그 외</td><td class="muted">-</td><td>${fmt(R.didimLimit.base)}</td><td>${fmt(Math.max(3.6 * EOK - R.didimLimit.base, 0))}</td><td>3억 6,000만원</td><td class="muted">한도없음</td></tr>
    </tbody>`;

  const rowVal = (v: number, em: boolean): string =>
    `<td class="${em ? "em" : ""}">${v === 0 ? '<span class="muted">해당없음</span>' : fmt(v)}</td>`;
  el("step4Table").innerHTML = `
    <thead><tr><th>보수적<br>감당가능 대출액</th><th>신생아특례</th><th>디딤돌</th><th>디딤돌해당<br>보금자리 추가분</th><th>보금자리론</th><th>일반대출</th></tr></thead>
    <tbody><tr>
      <td class="em">${fmt(res.conservative)}</td>
      ${rowVal(res.amtNewborn, res.loanType === "newborn")}
      ${rowVal(res.amtDidim, res.loanType === "didim")}
      ${rowVal(res.amtDidimExtra, res.loanType === "didim")}
      ${rowVal(res.amtBogeum, res.loanType === "bogeum")}
      <td class="${res.loanType === "general" ? "em" : ""}">${fmt(res.amtGeneral)}</td>
    </tr></tbody>`;
  el("step4Note").textContent =
    res.loanType === "didim"
      ? "디딤돌 한도를 넘는 필요분은 보금자리론으로 추가 조달하는 구조입니다(디딤돌 + 보금자리 추가분)."
      : "현재 자격에 해당하는 대출 기준으로 한도를 적용했습니다.";

  // 5단계
  const s5row = (k: RegionKey): string => {
    const s = res.s5[k];
    const partTxt = s.parts ? `<br><small>디딤돌 ${fmt(s.parts.d)} + 보금자리 ${fmt(s.parts.e)}</small>` : "";
    return `<tr>
      <td>${REGION_LABEL[k]}</td><td>${fmt(res.seed)}</td><td class="center">${pct(s.ltv, 0)}</td>
      <td>${fmt(s.ltvCap)}</td><td class="em">${fmt(s.amt)}${partTxt}</td></tr>`;
  };
  el("step5Table").innerHTML = `
    <thead><tr><th>지역</th><th>종잣돈</th><th>LTV 상한</th><th>LTV 기준 대출가능액<br><small>종잣돈÷(1-LTV)-종잣돈</small></th><th>소득·한도·LTV 반영<br>대출가능액 (${LOAN_LABEL[res.loanType]})</th></tr></thead>
    <tbody>${s5row("reg")}${s5row("non")}</tbody>`;
  const multiWarn =
    res.houses >= 2 ? " 2주택 이상 보유세대는 규제지역·수도권 내 추가 구입 주담대가 금지(LTV 0%)됩니다." : "";
  el("step5Note").textContent =
    "현행: 일반 주담대는 규제지역 LTV 40%, 수도권 주담대 최대 6억 한도가 적용됩니다. 정책대출(기금)은 LTV 70%가 유지됩니다. 디딤돌 생애최초 LTV는 본래 80%이나 수도권·규제지역 소재 주택은 70%가 적용되며, 본 계산기는 수도권 전제로 70%를 사용합니다." +
    multiWarn;

  // 6단계
  const s6row = (k: RegionKey): string => {
    const s = res.s6[k];
    return `<tr>
      <td>${REGION_LABEL[k]}</td><td>${fmt(s.amt)}</td>
      <td>${res.priceCap === Infinity ? "한도없음" : fmt(res.priceCap)}</td>
      <td class="em">${fmt(s.loanWithCap)}</td>
      <td class="em">${res.priceCap === Infinity ? fmt(s.budgetBefore) : fmt(s.budgetCap)}</td>
      <td class="center">${pct(s.effLtv)}</td></tr>`;
  };
  el("step6Table").innerHTML = `
    <thead><tr><th>지역</th><th>대출가능액<br>(5단계)</th><th>${LOAN_LABEL[res.loanType]}<br>매매가 한도</th><th>매매가 한도 반영<br>대출가능액</th><th>예산 한도<br>(종잣돈+대출)</th><th>실효 LTV</th></tr></thead>
    <tbody>${s6row("reg")}${s6row("non")}</tbody>`;

  // 7~8단계
  const appliedLabel = (s: Step8): string =>
    LOAN_LABEL[s.appliedType] + (s.policyExceeded ? " (정책대출 매매가 한도 초과)" : "");
  const s8row = (k: RegionKey): string => {
    const s = res.s8[k];
    const verdict =
      s.price === 0
        ? '<span class="muted">매매가를 입력하세요</span>'
        : s.ok
          ? "가용 종잣돈+담보대출로 구입 가능"
          : `${fmt(s.shortfall)} 부족 — 신용대출 등을 검토하되 무리한 대출인지 점검하세요`;
    return `<tr>
      <td>${REGION_LABEL[k]}</td><td>${fmt(s.price)}</td>
      <td>${fmt(s.cost)}</td><td>${fmt(s.availSeed)}</td>
      <td class="center" style="white-space:normal">${appliedLabel(s)}</td>
      <td class="center">${pct(s.ltvUsed, 0)}</td>
      <td class="em">${fmt(s.loan)}</td>
      <td class="em">${fmt(s.budget)}</td>
      <td class="${s.price === 0 ? "" : s.ok ? "ok" : "bad"}" style="white-space:normal">${verdict}</td></tr>`;
  };
  el("step8Table").innerHTML = `
    <thead><tr><th>지역</th><th>매매가</th><th>부대비용<br>(추정)</th><th>가용 종잣돈<br>(종잣돈−부대비용)</th><th>적용 대출</th><th>LTV</th><th>최종 대출가능액</th><th>최종 예산<br>(가용 종잣돈+대출)</th><th>판정</th></tr></thead>
    <tbody>${s8row("reg")}${s8row("non")}</tbody>`;
  el("step8Note").textContent =
    "매매가가 정책대출 한도 이내면 정책대출을, 초과하면 일반대출(주담대 한도: 15억 이하 6억 / 25억 이하 4억 / 25억 초과 2억)을 적용합니다. 일반대출 전환 시 보수적 감당액도 120배 기준으로 재계산합니다. " +
    "부대비용은 취득세·중개보수·법무사·이사·기본 인테리어 등을 매매가 대비 비율로 추정한 값이며, 생애최초는 취득세 감면(한도 200만원)을 반영합니다.";

  // DSR
  const dsrRow = (k: RegionKey): string => {
    const d = res.dsr[k];
    const isPolicyApplied = d.appliedType !== "general";
    return `<tr>
      <td>${REGION_LABEL[k]}</td>
      <td>${fmt(d.loan)}</td><td>${fmtWonExact(d.mPmt)}<br><small>${d.rate.toFixed(2)}%</small></td>
      <td>${fmt(d.credit)}</td><td>${fmtWonExact(d.cPmt)}<br><small>${d.creditRate.toFixed(2)}%</small></td>
      <td>${fmtWonExact(d.existing)}</td>
      <td class="em">${fmtWonExact(d.tot)}</td>
      <td>${fmt(d.monthlyGross)}</td>
      <td class="center em">${pct(d.ratio)}</td>
      <td class="${d.price === 0 ? "" : d.pass ? "ok" : "bad"}" style="white-space:normal">${
        d.price === 0
          ? "-"
          : isPolicyApplied
            ? d.ratio <= 0.6
              ? "정책대출 DTI 60% 이내"
              : "정책대출 DTI 60% 초과"
            : d.pass
              ? "DSR 40% 이내"
              : "DSR 40% 초과 — 대출이 제한될 수 있어요"
      }</td></tr>`;
  };
  el("dsrTable").innerHTML = `
    <thead><tr><th>지역</th><th>주담대<br>(최종 대출액)</th><th>주담대 월상환<br><small>적용금리${res.stressOn ? " (스트레스 가산)" : ""}</small></th><th>신용대출<br>(부족분)</th><th>신용 월상환<br><small>적용금리</small></th><th>기존부채<br>월상환</th><th>월 상환 합계</th><th>세전 월소득</th><th>DSR</th><th>판정</th></tr></thead>
    <tbody>${dsrRow("reg")}${dsrRow("non")}</tbody>`;

  // 최종 요약 (오른쪽 레일) + 휴대폰 하단 결과 바
  const isEmpty = res.seed === 0 && res.gross === 0;
  const bar = el("resultBar");
  el("shareBtn").hidden = isEmpty;
  bar.hidden = isEmpty;
  if (isEmpty) {
    el("finalSummary").innerHTML = `<div class="empty-summary">
      <p>종잣돈과 소득을 넣으면 여기에 규제지역·비규제지역별로 살 수 있는 집값이 나와요.</p>
      <button type="button" class="btn-secondary" data-fill-example>예시로 채워 보기</button>
    </div>`;
    return;
  }

  // 대출 한도는 네 기준(소득·상품 한도·LTV·매매가 상한) 중 가장 작은 값으로 정해진다 → 어떤 기준이 막았는지 보여준다
  const limitsOf = (k: RegionKey): { label: string; value: number }[] => {
    const s = res.s6[k];
    const productCap =
      res.loanType === "newborn" ? R.newbornLimit
      : res.loanType === "didim" ? res.didimLimit + res.bogeumExtra
      : res.loanType === "bogeum" ? res.bogeumStandalone
      : R.capByPrice && (k === "reg" || isChecked("isMetro")) ? 6 * EOK
      : Infinity;
    return [
      { label: "소득으로 감당 가능", value: res.conservative },
      { label: res.loanType === "general" ? "주담대 한도" : `${LOAN_LABEL[res.loanType]} 한도`, value: productCap },
      { label: `LTV ${pct(s.ltv, 0)}`, value: s.ltvCap },
      { label: "정책대출 매매가 상한", value: res.priceCap === Infinity ? Infinity : res.priceCap * s.ltv },
    ];
  };
  const scale = Math.max(
    ...(["reg", "non"] as const).flatMap((k) => limitsOf(k).map((l) => l.value)).filter((v) => v !== Infinity),
    1,
  );
  const ladder = (k: RegionKey): string => {
    const rows = limitsOf(k);
    const min = Math.min(...rows.map((r) => r.value));
    const bind = rows.findIndex((r) => r.value === min);
    return `<div class="ladder">
      <p class="ladder-cap">네 기준 중 가장 작은 값이 대출 한도예요. 지금은 <b>${rows[bind].label}</b>에서 막혀요.</p>
      ${rows
        .map(
          (r, i) => `<div class="ladder-row${i === bind ? " bind" : ""}">
        <span class="ladder-lbl">${r.label}</span>
        <span class="ladder-val num">${r.value === Infinity ? "제한 없음" : fmt(r.value)}</span>
        <span class="ladder-track">${r.value === Infinity ? "" : `<span class="ladder-fill" style="width:${Math.max((r.value / scale) * 100, 0.5).toFixed(1)}%"></span>`}</span>
      </div>`,
        )
        .join("")}
    </div>`;
  };

  const figureOf = (k: RegionKey): number =>
    res.s8[k].price === 0 ? (res.priceCap === Infinity ? res.s6[k].budgetBefore : res.s6[k].budgetCap) : res.s8[k].budget;

  const answer = (k: RegionKey): string => {
    const s8 = res.s8[k];
    const s6 = res.s6[k];
    const head = `<div class="answer-head"><h3>${REGION_LABEL[k]}</h3>${
      k === "non" ? `<span class="answer-scope">${isChecked("isMetro") ? "수도권" : "지방"}</span>` : `<span class="answer-scope">서울 전역 등</span>`
    }</div>`;
    if (s8.price === 0) {
      return `<div class="answer">${head}
        <p class="answer-fig num">${fmt(figureOf(k))}</p>
        <p class="answer-sub">종잣돈 ${fmt(res.seed)} + 대출 ${fmt(s6.loanWithCap)} · ${LOAN_LABEL[res.loanType]}</p>
        ${ladder(k)}
      </div>`;
    }
    const d = res.dsr[k];
    return `<div class="answer">${head}
      <p class="answer-fig num">${fmt(s8.budget)}</p>
      <p class="answer-sub">매매가 ${fmt(s8.price)} 집 기준 최종 예산 · ${appliedLabel(s8)}</p>
      <dl class="answer-rows">
        <div><dt>가용 종잣돈</dt><dd class="num">${fmt(s8.availSeed)}</dd></div>
        <div><dt>부대비용(추정)</dt><dd class="num">−${fmt(s8.cost)}</dd></div>
        <div><dt>최종 대출가능액</dt><dd class="num">${fmt(s8.loan)}</dd></div>
        <div><dt>DSR</dt><dd class="num">${pct(d.ratio)}</dd></div>
      </dl>
      <p class="verdict ${s8.ok ? "ok" : "bad"}">${
        s8.ok ? "이 집은 가용 종잣돈과 담보대출로 살 수 있어요." : `예산이 ${fmt(s8.shortfall)} 부족해요. 매매가를 낮추거나 종잣돈을 더 모아야 해요.`
      }</p>
    </div>`;
  };

  const noPrice = res.s8.reg.price === 0 || res.s8.non.price === 0;
  el("finalSummary").innerHTML = `${answer("reg")}${answer("non")}
    ${showingExample ? '<p class="note note-example">예시 값으로 계산한 결과예요. 1단계부터 내 숫자로 바꿔 보세요.</p>' : ""}
    ${noPrice ? '<p class="note">7~8단계에 사고 싶은 집의 매매가를 넣으면 부대비용과 DSR까지 반영한 최종 판정이 나와요.</p>' : ""}
    <p class="note">기준: ${R.name} · 이용가능 대출 ${LOAN_LABEL[res.loanType]} · 보수적 감당가능 대출액 ${fmt(res.conservative)}</p>`;
  bar.innerHTML = `<span class="result-bar-fig"><span>규제지역 <b class="num">${fmt(figureOf("reg"))}</b></span><span>비규제지역 <b class="num">${fmt(figureOf("non"))}</b></span></span><span class="result-bar-go">결과 보기</span>`;
}

/* ---------- 예시 값 채우기 (빈 화면에서 결과를 먼저 보여주기) ---------- */
const EXAMPLE_VALUES: Record<string, string> = {
  seedSelf: "12000", seedSpouse: "8000",
  grossSelf: "5000", grossSpouse: "4500",
  netSelf: "4100", netSpouse: "3750",
  netWorth: "20000", livingCost: "250",
};
let showingExample = false;

function fillExample(): void {
  for (const [id, v] of Object.entries(EXAMPLE_VALUES)) {
    const node = valued(id);
    node.value = node.hasAttribute("data-money") ? comma(Number(v)) : v;
    node.dispatchEvent(new Event("input")); // 금액 힌트(= n억) 갱신 + 재계산
  }
  showingExample = true;
  render();
  el("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- URL 공유 ---------- */
const SHARE_FIELDS = [
  "seedSelf","seedSpouse","grossSelf","grossSpouse","netSelf","netSpouse","netWorth",
  "houses","firstTime","newlywed","children","bornAfter23",
  "livingCost","loanRate","loanYears","priceReg","priceNon","costRate",
  "dsrRate","dsrYears","creditRate","existingDebt",
] as const;

function buildShareUrl(): string {
  const p = new URLSearchParams();
  for (const id of SHARE_FIELDS) p.set(id, String(valued(id).value).replace(/,/g, ""));
  p.set("metro", isChecked("isMetro") ? "1" : "0");
  p.set("stress", isChecked("useStress") ? "1" : "0");
  return location.origin + location.pathname + "?" + p.toString();
}

function loadFromQuery(): void {
  const p = new URLSearchParams(location.search);
  if (![...p.keys()].length) return;
  for (const id of SHARE_FIELDS) {
    const v = p.get(id);
    if (v === null) continue;
    const node = valued(id);
    node.value = node.hasAttribute("data-money") ? comma(Number(v)) : v;
  }
  if (p.has("metro")) el<HTMLInputElement>("isMetro").checked = p.get("metro") === "1";
  if (p.has("stress")) el<HTMLInputElement>("useStress").checked = p.get("stress") === "1";
}

async function copyShareLink(): Promise<void> {
  const url = buildShareUrl();
  const btn = el("shareBtn");
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = "복사했어요. 붙여넣어 공유하세요";
  } catch {
    prompt("아래 링크를 복사하세요", url);
  }
  setTimeout(() => (btn.textContent = "입력값 담긴 링크 복사"), 2500);
}

/* ---------- tabs ---------- */
function attachTabs(): void {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".tab")) {
    btn.addEventListener("click", () => {
      for (const b of document.querySelectorAll(".tab")) b.classList.remove("active");
      for (const panel of document.querySelectorAll(".tab-panel")) panel.classList.remove("active");
      btn.classList.add("active");
      const name = btn.dataset.tab;
      if (name) el("tab-" + name).classList.add("active");
      document.body.dataset.tab = name ?? ""; // 하단 결과 바는 계산기 탭에서만
    });
  }
}

/* ---------- 규제지역 목록 렌더링 (코어의 REGIONS 사용) ---------- */
function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `'${y.slice(2)}.${Number(m)}.${Number(day)}`;
}

function renderRegions(): void {
  el("regionGroups").innerHTML = REGIONS.map(
    (g) => `
    <h3>${g.label}</h3>
    <p class="note" style="margin:0 0 6px">조정대상지역·투기과열지구: <b>${fmtDate(g.regDate)} 계약분부터</b> · 토지거래허가구역: <b>${fmtDate(g.tohuDate)} 계약분부터</b></p>
    <p class="region-chips">${g.items.map((t) => `<span>${t}</span>`).join("")}</p>`
  ).join("");
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadFromQuery();
  attachMoneyInputs();
  attachTabs();
  renderRegions();
  el("shareBtn").addEventListener("click", copyShareLink);
  // 빈 상태 요약의 버튼은 render마다 다시 그려지므로 위임으로 처리
  document.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-fill-example]")) fillExample();
  });
  const onEdit = (e: Event): void => {
    if (e.isTrusted) showingExample = false;
    render();
  };
  for (const node of document.querySelectorAll("input, select")) {
    node.addEventListener("input", onEdit);
    node.addEventListener("change", onEdit);
  }
  render();
  // 휴대폰 하단 결과 바: 결과 카드가 화면에 보이면 숨긴다
  const rail = el("result");
  new IntersectionObserver(([e]) => document.body.classList.toggle("result-visible", e.isIntersecting), {
    threshold: 0,
    rootMargin: "0px 0px 240px 0px", // 결과 카드가 들어오기 직전에 숨겨 숫자를 가리지 않게
  }).observe(rail);
});
