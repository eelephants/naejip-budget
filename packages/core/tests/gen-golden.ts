/* 골든 스냅샷 생성기 — `npm run golden:update`로 tests/golden.json 재생성.
 * 룰셋/엔진 변경이 의도된 경우에만 재생성하고, diff를 반드시 눈으로 확인할 것. */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CASES } from "./cases.ts";
import { RULESETS, computeBudget } from "../src/index.ts";

const dir = dirname(fileURLToPath(import.meta.url));

const snapshot: Record<string, unknown> = {};
for (const c of CASES) {
  // JSON 직렬화(Infinity→null 포함)를 거쳐 정규화된 형태로 고정한다
  snapshot[c.id] = JSON.parse(JSON.stringify(computeBudget(c.input, RULESETS[c.ruleset])));
}
writeFileSync(join(dir, "golden.json"), JSON.stringify(snapshot, null, 1));
console.log(`golden.json 갱신 완료 (${CASES.length} cases)`);
