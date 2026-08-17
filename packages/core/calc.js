/* =========================================================
 * 예산 계산 엔진 — 순수 함수 (input, ruleset) => result
 * DOM/규제 데이터에 의존하지 않아 Node 테스트에서 그대로 사용한다.
 *
 * input (금액은 모두 원 단위):
 *   seed, gross, net, netWorth
 *   houses, firstTime, newlywed, children, bornAfter23  (boolean/number)
 *   living, loanRate(%), loanYears
 *   isMetro (비규제지역도 수도권인지)
 *   priceReg, priceNon (희망 매매가)
 *   costRate(%)  부대비용률 (취득세·중개보수 등)
 *   dsrRate(%), dsrYears, creditRate(%), useStress, existingDebtMonthly
 * ========================================================= */

(function () {
  var EOK = 100000000;

  function pmt(monthlyRate, months, principal) {
    if (principal <= 0) return 0;
    if (monthlyRate <= 0) return principal / months;
    var k = Math.pow(1 + monthlyRate, months);
    return (principal * monthlyRate * k) / (k - 1);
  }

  function computeBudget(input, R) {
    var seed = input.seed, gross = input.gross, net = input.net;
    var houses = input.houses;
    var noHouse = houses === 0;
    var isMetro = !!input.isMetro;

    /* ---- 2단계: 정책대출 자격 (소득 + 순자산 요건) ---- */
    var netWorthOK = input.netWorth <= R.netWorthCap; // 기금대출(신생아·디딤돌) 자산요건

    var newbornOK = noHouse && input.bornAfter23 && gross <= R.newbornIncomeMax && netWorthOK;
    var didimOK =
      noHouse && netWorthOK &&
      (gross <= 0.6 * EOK ||
        (gross <= 0.7 * EOK && (input.firstTime || input.children >= 2)) ||
        (gross <= 0.85 * EOK && input.newlywed));
    var bogeumOK =
      noHouse &&
      (gross <= 0.7 * EOK ||
        (input.children >= 3 && gross <= 1.0 * EOK) ||
        (input.children === 2 && gross <= 0.9 * EOK) ||
        (input.newlywed && gross <= 0.85 * EOK) ||
        (input.children === 1 && gross <= 0.8 * EOK));

    var loanType = newbornOK ? "newborn" : didimOK ? "didim" : bogeumOK ? "bogeum" : "general";
    var isPolicy = loanType === "newborn" || loanType === "didim";

    /* ---- 3단계: 소득 기준 감당가능 대출액 ---- */
    var monthlyNet = net / 12;
    var pay = Math.max(monthlyNet - input.living, 0);
    var months = input.loanYears * 12;
    var mr = input.loanRate / 100 / 12;
    var affordable =
      mr > 0 ? (pay * (Math.pow(1 + mr, months) - 1)) / (mr * Math.pow(1 + mr, months)) : pay * months;
    var conservative = pay * (isPolicy ? 150 : 120);

    /* ---- 4단계: 대출 종류별 한도 ---- */
    var didimLimit =
      input.children >= 2 || input.newlywed
        ? R.didimLimit.multi
        : input.firstTime
          ? R.didimLimit.first
          : R.didimLimit.base;
    var bogeumStandalone = input.children >= 3 ? 4 * EOK : 3.6 * EOK;
    var bogeumExtra = Math.max(bogeumStandalone - didimLimit, 0); // 디딤돌 한도 초과분의 보금자리 추가 조달

    var A = conservative;
    var amtNewborn = loanType === "newborn" ? Math.min(A, R.newbornLimit) : 0;
    var amtDidim = loanType === "didim" ? Math.min(A, didimLimit) : 0;
    var amtDidimExtra =
      loanType === "didim" ? (A > didimLimit + bogeumExtra ? bogeumExtra : Math.max(A - amtDidim, 0)) : 0;
    var amtBogeum = loanType === "bogeum" ? Math.min(A, bogeumStandalone) : 0;
    var amtGeneral = A;

    var capApplies = function (region) {
      return !!R.capByPrice && (region === "reg" || isMetro);
    };
    var generalLtvOf = function (region) {
      if (houses >= 2)
        return region === "reg" ? R.multiHouseLtv.reg : isMetro ? R.multiHouseLtv.metroNon : R.multiHouseLtv.non;
      return R.generalLtv[region];
    };

    /* ---- 5단계: 지역별 LTV ---- */
    function step5(region) {
      var ltv = loanType === "general" ? generalLtvOf(region) : R.policyLtv[region];
      var ltvCap = ltv >= 1 ? Infinity : seed / (1 - ltv) - seed;
      var amt, parts = null;
      if (loanType === "newborn") amt = Math.min(amtNewborn, ltvCap);
      else if (loanType === "didim") {
        var d = Math.min(ltvCap, amtDidim);
        var e = Math.max(Math.min(ltvCap - d, amtDidimExtra), 0);
        amt = d + e;
        parts = { d: d, e: e };
      } else if (loanType === "bogeum") amt = Math.min(ltvCap, amtBogeum);
      else {
        amt = Math.min(ltvCap, amtGeneral);
        if (capApplies(region)) amt = Math.min(amt, 6 * EOK); // 가격 미정 단계 → 최대 6억
      }
      return { ltv: ltv, ltvCap: ltvCap, amt: amt, parts: parts };
    }

    /* ---- 6단계: 정책대출 매매가 한도 ---- */
    var priceCap =
      loanType === "newborn" ? 9 * EOK
      : loanType === "didim" ? (input.newlywed || input.children >= 2 ? 6 * EOK : 5 * EOK)
      : loanType === "bogeum" ? 6 * EOK
      : Infinity;

    function step6(region) {
      var s5 = step5(region);
      var budgetBefore = seed + s5.amt;
      var loanWithCap = priceCap === Infinity ? s5.amt : Math.min(priceCap * s5.ltv, s5.amt);
      var budgetCap = Math.min(budgetBefore, priceCap);
      return {
        ltv: s5.ltv, ltvCap: s5.ltvCap, amt: s5.amt, parts: s5.parts,
        budgetBefore: budgetBefore, loanWithCap: loanWithCap, budgetCap: budgetCap,
        effLtv: budgetCap > 0 ? loanWithCap / budgetCap : 0,
      };
    }

    /* ---- 부대비용: 취득세·중개보수·법무사·이사 등 (매매가 × 부대비용률 − 생초 취득세 감면) ---- */
    function sideCost(price) {
      if (price <= 0) return 0;
      var cost = (price * input.costRate) / 100;
      if (input.firstTime) cost -= Math.min(2000000, cost); // 생애최초 취득세 감면(한도 200만원)
      return Math.max(cost, 0);
    }

    /* ---- 7~8단계: 희망 매매가 기준 최종 예산 ---- */
    function step8(region) {
      var price = region === "reg" ? input.priceReg : input.priceNon;
      var s5 = step5(region);
      var loan, appliedType, ltvUsed;
      if (loanType !== "general" && price <= priceCap && price > 0) {
        ltvUsed = R.policyLtv[region];
        loan = Math.min(s5.amt, price * ltvUsed);
        appliedType = loanType;
      } else {
        ltvUsed = generalLtvOf(region);
        var adjGeneral = isPolicy ? (conservative * 120) / 150 : conservative;
        loan = Math.min(price * ltvUsed, adjGeneral);
        if (capApplies(region)) loan = Math.min(loan, R.capByPrice(price));
        appliedType = "general";
      }
      var cost = sideCost(price);
      var availSeed = seed - cost;               // 가용 종잣돈 = 종잣돈 − 부대비용
      var budget = availSeed + loan;
      var ok = price > 0 && price <= budget;
      var shortfall = Math.max(price - budget, 0);
      return {
        price: price, loan: loan, appliedType: appliedType, ltvUsed: ltvUsed,
        cost: cost, availSeed: availSeed, budget: budget, ok: ok, shortfall: shortfall,
        policyExceeded: loanType !== "general" && price > priceCap,
      };
    }

    /* ---- DSR 점검 (기존부채 포함, 스트레스 금리는 주담대·신용대출 공통 가산) ---- */
    var stressOn = !!input.useStress && R.stressAdd > 0;
    var dsrRateEff = input.dsrRate + (stressOn ? R.stressAdd : 0);
    var creditRateEff = input.creditRate + (stressOn ? R.stressAdd : 0);

    function dsrCheck(region) {
      var s8 = step8(region);
      var mPmt = pmt(dsrRateEff / 100 / 12, input.dsrYears * 12, s8.loan);
      var credit = s8.shortfall;
      var cPmt = (credit / 5 + credit * (creditRateEff / 100)) / 12;
      var tot = mPmt + cPmt + input.existingDebtMonthly;
      var monthlyGross = gross / 12;
      var ratio = monthlyGross > 0 ? tot / monthlyGross : 0;
      return {
        price: s8.price, loan: s8.loan, appliedType: s8.appliedType,
        mPmt: mPmt, credit: credit, cPmt: cPmt, existing: input.existingDebtMonthly,
        tot: tot, monthlyGross: monthlyGross, ratio: ratio, pass: ratio <= 0.4,
      };
    }

    return {
      ruleset: R.id,
      seed: seed, gross: gross, net: net, netWorth: input.netWorth,
      houses: houses, firstTime: input.firstTime, newlywed: input.newlywed,
      children: input.children, bornAfter23: input.bornAfter23,
      netWorthOK: netWorthOK, newbornOK: newbornOK, didimOK: didimOK, bogeumOK: bogeumOK,
      loanType: loanType, isPolicy: isPolicy,
      monthlyNet: monthlyNet, living: input.living, pay: pay, months: months,
      affordable: affordable, conservative: conservative,
      didimLimit: didimLimit, bogeumStandalone: bogeumStandalone, bogeumExtra: bogeumExtra,
      amtNewborn: amtNewborn, amtDidim: amtDidim, amtDidimExtra: amtDidimExtra,
      amtBogeum: amtBogeum, amtGeneral: amtGeneral,
      priceCap: priceCap,
      s5: { reg: step5("reg"), non: step5("non") },
      s6: { reg: step6("reg"), non: step6("non") },
      s8: { reg: step8("reg"), non: step8("non") },
      dsr: { reg: dsrCheck("reg"), non: dsrCheck("non") },
      dsrRateEff: dsrRateEff, creditRateEff: creditRateEff, stressOn: stressOn,
    };
  }

  if (typeof module !== "undefined") module.exports = { computeBudget: computeBudget };
  if (typeof window !== "undefined") window.computeBudget = computeBudget;
})();
