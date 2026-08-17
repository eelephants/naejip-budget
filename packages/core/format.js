/* =========================================================
 * 표시 포맷 — 웹·앱 공용 (DOM 무의존)
 * 금액은 모두 원 단위로 다루고, 입력은 만원 단위 문자열을 받는다.
 * ========================================================= */

(function () {
  var MAN = 10000;
  var EOK = 100000000;

  var LOAN_LABEL = {
    newborn: "신생아특례대출",
    didim: "디딤돌대출",
    bogeum: "기존보금자리론",
    general: "일반대출",
  };

  var REGION_LABEL = { reg: "규제지역", non: "비규제지역" };

  /* 천단위 구분자 — toLocaleString은 RN(Hermes) Intl 유무에 따라
   * 구분자가 빠질 수 있어 웹·앱 출력을 맞추려고 직접 넣는다. */
  function comma(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /* 190000000 → "1억 9,000만원" */
  function fmt(v) {
    if (v === Infinity) return "한도없음";
    if (v == null || isNaN(v)) return "-";
    var neg = v < 0;
    v = Math.abs(Math.round(v));
    var eok = Math.floor(v / EOK);
    var man = Math.round((v - eok * EOK) / MAN);
    var s = "";
    if (eok) s += comma(eok) + "억";
    if (man) s += (s ? " " : "") + comma(man) + "만";
    if (!s) s = "0";
    return (neg ? "-" : "") + s + "원";
  }

  function fmtWonExact(v) {
    return comma(Math.round(v)) + "원";
  }

  function pct(x, d) {
    return (x * 100).toFixed(d == null ? 1 : d) + "%";
  }

  /* "19,000" (만원) → 190000000 (원) */
  function parseMan(s) {
    var n = parseFloat(String(s).replace(/[^\d.]/g, ""));
    return (isNaN(n) ? 0 : n) * MAN;
  }

  /* "4.5" → 4.5 (숫자 아니면 0) */
  function parseNum(s) {
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  var api = {
    MAN: MAN,
    comma: comma,
    LOAN_LABEL: LOAN_LABEL,
    REGION_LABEL: REGION_LABEL,
    fmt: fmt,
    fmtWonExact: fmtWonExact,
    pct: pct,
    parseMan: parseMan,
    parseNum: parseNum,
  };

  if (typeof module !== "undefined") module.exports = api;
  if (typeof window !== "undefined") {
    for (var k in api) window[k] = api[k];
  }
})();
