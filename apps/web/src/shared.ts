/* 메인 계산기(app.ts)와 검색어별 계산기 페이지(quick.ts)가 함께 쓰는 DOM 조각 */

import { comma, fmt, parseMan } from "@naejip/core";
import type { RulesetId } from "@naejip/core";

export const ACTIVE_RULESET: RulesetId = "2026-10"; // 규제 변경 시 코어에 새 룰셋 추가 후 이 키만 교체

/* ---------- money input formatting ---------- */
export function attachMoneyInputs(scope: ParentNode = document): void {
  for (const node of scope.querySelectorAll<HTMLInputElement>("input[data-money]")) {
    const hint = document.createElement("span");
    hint.className = "money-hint";
    node.insertAdjacentElement("afterend", hint);
    const update = (): void => {
      const won = parseMan(node.value);
      hint.textContent = won > 0 ? "= " + fmt(won) : "";
    };
    node.addEventListener("blur", () => {
      const n = parseFloat(node.value.replace(/[^\d.]/g, ""));
      node.value = isNaN(n) ? "0" : comma(Math.round(n));
      update();
    });
    node.addEventListener("input", update);
    update();
  }
}
