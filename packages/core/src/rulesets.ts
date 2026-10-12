/* =========================================================
 * 규제 룰셋 — 날짜 키 데이터
 * 계산 엔진(calc.ts)은 (input, ruleset) => result 순수 함수이며,
 * 규제 변경은 이 파일에 새 룰셋을 추가하는 것으로 흡수한다.
 * ========================================================= */

export const EOK = 100_000_000;

/** 규제지역 / 비규제지역 두 시나리오 키 */
export type RegionKey = "reg" | "non";

export type RulesetId = "2024-07" | "2026-08" | "2026-10";

export interface Ruleset {
  id: RulesetId;
  name: string;
  /** 신생아특례 부부합산 소득 상한 */
  newbornIncomeMax: number;
  newbornLimit: number;
  didimLimit: { multi: number; first: number; base: number };
  /** 기금대출(디딤돌·신생아) 순자산 요건 */
  netWorthCap: number;
  /** LTV — 무주택/처분조건부 1주택 */
  policyLtv: Record<RegionKey, number>;
  generalLtv: Record<RegionKey, number>;
  /** LTV — 2주택 이상 보유세대 */
  multiHouseLtv: { reg: number; non: number; metroNon: number };
  /** 주담대 시가별 절대한도. 해당 규제가 없던 시점은 null */
  capByPrice: ((price: number) => number) | null;
  /** 스트레스 DSR 가산금리(%p) — 주담대는 수도권·규제지역(metro)/지방(local) 차등,
   *  신용대출은 잔액이 creditMin 초과일 때만 가산 */
  stress: { metro: number; local: number; credit: number; creditMin: number };
  /** 보금자리론 신혼 맞벌이 결혼페널티 완화: 합산 기준 초과여도 부부 중 1인 소득이 이 값 이하면 가능. 없던 시점은 null */
  bogeumSpouseMax: number | null;
  /** 의무 적용 여부 (해제는 미적용 시와의 비교용) */
  stressForced: boolean;
}

export const RULESETS: Record<RulesetId, Ruleset> = {
  /* 강의 원본 기준 (월부 내마기초 예산표가 작성된 2024년 7월 시점 규제) */
  "2024-07": {
    id: "2024-07",
    name: "2024.7 기준 (강의 과제용)",
    newbornIncomeMax: 1.3 * EOK,
    newbornLimit: 5 * EOK,
    didimLimit: { multi: 4 * EOK, first: 3 * EOK, base: 2.5 * EOK },
    netWorthCap: 4.69 * EOK, // 2024 기준
    policyLtv: { reg: 0.7, non: 0.7 },
    generalLtv: { reg: 0.5, non: 0.7 },
    multiHouseLtv: { reg: 0.3, non: 0.6, metroNon: 0.6 },
    capByPrice: null, // 시가별 절대한도 없음
    stress: { metro: 0, local: 0, credit: 0, creditMin: 0 },
    bogeumSpouseMax: null,
    stressForced: false,
  },

  /* 현행 규제 (6.27 대책 + 10.15 대책 반영, 2026.8 기준) */
  "2026-08": {
    id: "2026-08",
    name: "현행 규제 반영 (2026.8)",
    newbornIncomeMax: 2.0 * EOK, // 맞벌이 한시 완화 기준(부부합산 2억 수준)
    newbornLimit: 4 * EOK, // '25.6.28~ 5억 → 4억
    didimLimit: { multi: 3.2 * EOK, first: 2.4 * EOK, base: 2 * EOK }, // 4→3.2, 3→2.4, 2.5→2
    netWorthCap: 5.11 * EOK, // 2026 기준, 매년 변동
    policyLtv: { reg: 0.7, non: 0.7 }, // 기금대출 LTV 유지
    generalLtv: { reg: 0.4, non: 0.7 }, // 10.15 대책: 규제지역 70→40%
    multiHouseLtv: { reg: 0, non: 0.6, metroNon: 0 }, // 규제지역·수도권 추가구입 주담대 금지
    capByPrice: (p) => (p <= 15 * EOK ? 6 * EOK : p <= 25 * EOK ? 4 * EOK : 2 * EOK),
    stress: { metro: 1.5, local: 1.5, credit: 1.5, creditMin: 0 }, // 당시 계산기 기준: 일괄 +1.5%p
    bogeumSpouseMax: null,
    stressForced: true,
  },

  /* 현행 규제 (2026.10 기준) — 2026-08 대비 변경분
   * - 스트레스 DSR: 10.15 대책 수도권·규제지역 주담대 하한 3.0%p, 지방 주담대 1.5%p × 적용비율 50%('26 하반기 유지),
   *   신용대출은 잔액 1억 초과분만 1.5%p
   * - 8.13 대책 후속: 보금자리론 신혼 맞벌이는 부부 중 1인 연소득 7천 이하면 가능 ('26.10.19 신청분~) */
  "2026-10": {
    id: "2026-10",
    name: "현행 규제 반영 (2026.10)",
    newbornIncomeMax: 2.0 * EOK,
    newbornLimit: 4 * EOK,
    didimLimit: { multi: 3.2 * EOK, first: 2.4 * EOK, base: 2 * EOK },
    netWorthCap: 5.11 * EOK,
    policyLtv: { reg: 0.7, non: 0.7 },
    generalLtv: { reg: 0.4, non: 0.7 },
    multiHouseLtv: { reg: 0, non: 0.6, metroNon: 0 },
    capByPrice: (p) => (p <= 15 * EOK ? 6 * EOK : p <= 25 * EOK ? 4 * EOK : 2 * EOK),
    stress: { metro: 3.0, local: 0.75, credit: 1.5, creditMin: 1 * EOK },
    bogeumSpouseMax: 0.7 * EOK,
    stressForced: true,
  },
};

export interface RegionGroup {
  label: string;
  /** 조정대상지역·투기과열지구 효력 시작일 (계약분 기준) */
  regDate: string;
  /** 토지거래허가구역 효력 시작일 */
  tohuDate: string;
  items: string[];
}

/* 규제지역·토지거래허가구역 — 규제지역 시행일과 토허 시행일을 분리해서 관리 */
export const REGIONS: RegionGroup[] = [
  {
    label: "서울특별시 — 전역 (25개 구 전체)",
    regDate: "2025-10-16",
    tohuDate: "2025-10-20",
    items: ["강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"],
  },
  {
    label: "경기도 — 12개 지역",
    regDate: "2025-10-16",
    tohuDate: "2025-10-20",
    items: ["과천시","광명시","성남시 분당구","성남시 수정구","성남시 중원구","수원시 영통구","수원시 장안구","수원시 팔달구","안양시 동안구","용인시 수지구","의왕시","하남시"],
  },
  {
    label: "경기도 — 추가 지정",
    regDate: "2026-07-01",
    tohuDate: "2026-07-05",
    items: ["화성시 동탄", "용인시 기흥구", "구리시"],
  },
];
