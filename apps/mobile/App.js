/* =========================================================
 * 내집마련 예산 계산기 — 모바일 화면
 * 계산은 @naejip/core의 computeBudget(input, ruleset) 순수 함수를 웹과 공유한다.
 * 이 파일은 입력 상태와 표시만 담당한다.
 * ========================================================= */

import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LOAN_LABEL,
  REGION_LABEL,
  RULESETS,
  computeBudget,
  fmt,
  fmtWonExact,
  parseMan,
  parseNum,
  pct,
} from "@naejip/core";
import { Badge, C, Card, Check, MoneyField, NumField, Row, YesNo } from "./src/ui";

const ACTIVE_RULESET = "2026-08"; // 규제 변경 시 코어에 새 룰셋 추가 후 이 키만 교체

const DEFAULTS = {
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

const REGIONS = ["reg", "non"];

export default function App() {
  return (
    <SafeAreaProvider>
      <Screen />
    </SafeAreaProvider>
  );
}

function Screen() {
  const [f, setF] = useState(DEFAULTS);
  const insets = useSafeAreaInsets();
  const set = (key) => (value) => setF((prev) => ({ ...prev, [key]: value }));

  const R = RULESETS[ACTIVE_RULESET];
  const res = useMemo(
    () =>
      computeBudget(
        {
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
        },
        R
      ),
    [f, R]
  );

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} style={s.header}>
        <Text style={s.h1}>🏠 내집마련 예산 계산기</Text>
        <Text style={s.sub}>{R.name} 기준 · 금액은 모두 만원 단위</Text>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        stickyHeaderIndices={[0]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* 스크롤 중에도 예산이 보이도록 상단 고정 (ScrollView 기본 기능).
         * RN의 sticky 래퍼가 이 View의 style을 자기 쪽으로 가져가고 자식에는 flex:1만
         * 남기므로, 가로 배치는 반드시 한 단계 안쪽(stickyRow)에서 해야 한다. */}
        <View style={s.stickyBar}>
          <View style={s.stickyRow}>
            {REGIONS.map((k) => (
              <View key={k} style={s.stickyCell}>
                <Text style={s.stickyLabel}>{REGION_LABEL[k]}</Text>
                <Text style={s.stickyValue}>{fmt(res.s8[k].budget)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Card
          step="1단계"
          title="종잣돈과 소득"
          hint="본인·배우자의 전년도 원천징수영수증 기준 세전/세후 연소득 총액을 입력하세요."
        >
          <Text style={s.groupTitle}>본인</Text>
          <MoneyField label="종잣돈" value={f.seedSelf} onChange={set("seedSelf")} />
          <MoneyField label="세전소득(연봉)" value={f.grossSelf} onChange={set("grossSelf")} />
          <MoneyField label="세후소득(연봉)" value={f.netSelf} onChange={set("netSelf")} />
          <Text style={s.groupTitle}>배우자</Text>
          <MoneyField label="종잣돈" value={f.seedSpouse} onChange={set("seedSpouse")} />
          <MoneyField label="세전소득(연봉)" value={f.grossSpouse} onChange={set("grossSpouse")} />
          <MoneyField label="세후소득(연봉)" value={f.netSpouse} onChange={set("netSpouse")} />
          <View style={s.totals}>
            <Row label="종잣돈 합계" value={fmt(res.seed)} strong />
            <Row label="세전소득 합계" value={fmt(res.gross)} strong />
            <Row label="세후소득 합계" value={fmt(res.net)} strong />
          </View>
        </Card>

        <Card step="2단계" title="정책대출 자격">
          <NumField
            label="보유주택수"
            value={f.houses}
            onChange={set("houses")}
            unit="채"
            note="갈아타기(처분조건부 1주택)는 0으로 입력"
          />
          <YesNo
            label="생애최초 여부"
            value={f.firstTime}
            onChange={set("firstTime")}
            yes="생애최초"
            no="아니오"
          />
          <YesNo
            label="신혼부부 여부"
            value={f.newlywed}
            onChange={set("newlywed")}
            yes="신혼부부"
            no="아니오"
          />
          <NumField label="자녀수" value={f.children} onChange={set("children")} unit="명" />
          <YesNo
            label="'23.1.1 이후 출생 자녀"
            value={f.bornAfter23}
            onChange={set("bornAfter23")}
            yes="있음"
            no="없음"
          />
          <MoneyField
            label="부부합산 순자산"
            value={f.netWorth}
            onChange={set("netWorth")}
            note="기금대출(신생아·디딤돌) 자산요건 판정용 — 자산에서 부채를 뺀 금액"
          />

          <View style={s.strip}>
            <Text style={s.stripLabel}>이용가능 대출</Text>
            <Text style={s.stripValue}>{LOAN_LABEL[res.loanType]}</Text>
            <View style={s.badges}>
              <Badge ok={res.newbornOK} label="신생아특례" />
              <Badge ok={res.didimOK} label="디딤돌" />
              <Badge ok={res.bogeumOK} label="보금자리론" />
            </View>
            {!res.netWorthOK ? (
              <Text style={s.warn}>
                ⚠️ 부부합산 순자산이 기금대출 자산요건({fmt(R.netWorthCap)})을 초과하여 신생아특례·디딤돌
                이용이 제한됩니다.
              </Text>
            ) : null}
          </View>
        </Card>

        <Card
          step="3단계"
          title="소득으로 감당가능한 대출액"
          hint={`라이프스타일 변화를 감안해 월 상환액 × ${res.isPolicy ? 150 : 120}배를 보수적 감당액으로 씁니다.`}
        >
          <MoneyField label="월 생활비" value={f.livingCost} onChange={set("livingCost")} />
          <NumField label="대출금리" value={f.loanRate} onChange={set("loanRate")} unit="연 %" />
          <NumField label="상환기간" value={f.loanYears} onChange={set("loanYears")} unit="년" />
          <View style={s.totals}>
            <Row label="세후 월소득" value={fmt(res.monthlyNet)} />
            <Row label="상환가능 월원리금" value={fmt(res.pay)} />
            <Row label="감당가능 대출액" value={fmt(res.affordable)} />
            <Row label="보수적 감당가능 대출액" value={fmt(res.conservative)} strong />
          </View>
        </Card>

        <Card
          step="5~7단계"
          title="지역과 희망 매매가"
          hint="비규제지역이라도 수도권이면 주담대 6억 한도 등 수도권 규제가 그대로 적용됩니다."
        >
          <Check
            label="비규제지역 시나리오가 수도권입니다"
            value={f.isMetro}
            onChange={set("isMetro")}
            note="해제 = 지방(수도권 한도 미적용)"
          />
          <MoneyField label="규제지역의 집 매매가" value={f.priceReg} onChange={set("priceReg")} />
          <MoneyField label="비규제지역의 집 매매가" value={f.priceNon} onChange={set("priceNon")} />
          <NumField
            label="부대비용률 (매매가 대비)"
            value={f.costRate}
            onChange={set("costRate")}
            unit="%"
            note="취득세·중개보수·법무사·이사 등 통상 1.5~3%. 생애최초 취득세 감면(한도 200만원) 자동 반영"
          />
          <View style={s.totals}>
            {REGIONS.map((k) => (
              <Row
                key={k}
                label={`${REGION_LABEL[k]} LTV 기준 대출가능액`}
                value={`${fmt(res.s5[k].amt)} (LTV ${pct(res.s5[k].ltv, 0)})`}
              />
            ))}
          </View>
        </Card>

        <Card
          step="※"
          title="DSR 점검"
          hint="최종 예산상 대출금이 DSR 40%를 충족하는지 점검합니다. 부족분은 신용대출로 가정합니다."
        >
          <NumField label="주담대 금리" value={f.dsrRate} onChange={set("dsrRate")} unit="연 %" />
          <NumField label="주담대 상환기간" value={f.dsrYears} onChange={set("dsrYears")} unit="년" />
          <NumField
            label="신용대출 금리"
            value={f.creditRate}
            onChange={set("creditRate")}
            unit="연 %"
          />
          <MoneyField
            label="기존 대출 월 상환액"
            value={f.existingDebt}
            onChange={set("existingDebt")}
            note="마이너스통장·자동차 할부·카드론·학자금 포함 / 장기렌트·운용리스는 미포함"
          />
          <Check
            label="스트레스 DSR 가산금리 (수도권 +1.5%p)"
            value={f.useStress}
            onChange={set("useStress")}
            note={`의무 적용 · 현재 주담대 ${res.dsrRateEff.toFixed(2)}% / 신용 ${res.creditRateEff.toFixed(2)}% 적용 중`}
          />
        </Card>

        {REGIONS.map((k) => (
          <ResultCard key={k} region={k} res={res} />
        ))}

        <Text style={s.disclaimer}>
          참고용 도구입니다. 실제 대출 가능 여부·한도·금리는 개인 신용, 은행 심사, 규제 변경에 따라
          달라지므로 반드시 금융기관과 주택도시기금포털(nhuf.molit.go.kr)에서 확인하세요.
        </Text>
      </ScrollView>
    </View>
  );
}

function ResultCard({ region, res }) {
  const s8 = res.s8[region];
  const dsr = res.dsr[region];
  const isPolicyApplied = dsr.appliedType !== "general";
  const dsrVerdict = isPolicyApplied
    ? dsr.ratio <= 0.6
      ? "정책대출: DTI 60% 이내 ✅"
      : "정책대출 DTI 60% 초과 ⚠️"
    : dsr.pass
      ? "DSR 40% 이내 ✅"
      : "DSR 40% 초과 — 대출이 제한될 수 있습니다 ⚠️";

  return (
    <Card title={`📋 ${REGION_LABEL[region]} 최종 예산`}>
      <Text style={s.amount}>{fmt(s8.budget)}</Text>
      <Row label="종잣돈" value={fmt(res.seed)} />
      <Row label="부대비용(추정)" value={`−${fmt(s8.cost)}`} />
      <Row label="가용 종잣돈" value={fmt(s8.availSeed)} />
      <Row
        label="적용 대출"
        value={LOAN_LABEL[s8.appliedType] + (s8.policyExceeded ? " (정책 매매가 한도 초과)" : "")}
      />
      <Row label="LTV" value={pct(s8.ltvUsed, 0)} />
      <Row label="최종 대출가능액" value={fmt(s8.loan)} strong />
      <Row label="희망 매매가" value={fmt(s8.price)} />
      <Row label="월 상환 합계" value={fmtWonExact(dsr.tot)} />
      <Row
        label="DSR"
        value={`${pct(dsr.ratio)} — ${dsrVerdict}`}
        color={s8.price === 0 ? C.sub : dsr.pass || isPolicyApplied ? C.ok : C.bad}
      />

      {s8.price === 0 ? (
        <Text style={[s.verdict, s.verdictNeutral]}>매매가를 입력하면 판정이 나옵니다</Text>
      ) : s8.ok ? (
        <Text style={[s.verdict, s.verdictOk]}>이 집, 가용 종잣돈+담보대출로 살 수 있어요!</Text>
      ) : (
        <Text style={[s.verdict, s.verdictBad]}>
          예산이 {fmt(s8.shortfall)} 부족해요. 매매가를 낮추거나 종잣돈을 더 모아야 해요.
        </Text>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.header, paddingHorizontal: 16, paddingBottom: 14 },
  h1: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 6 },
  sub: { color: "#c9d6f5", fontSize: 12.5, marginTop: 4 },
  scroll: { flex: 1 },

  stickyBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  stickyRow: { flexDirection: "row", gap: 12 },
  stickyCell: { flex: 1 },
  stickyLabel: { fontSize: 11.5, color: C.sub, fontWeight: "600" },
  stickyValue: { fontSize: 16, color: C.brandInk, fontWeight: "800", marginTop: 2 },

  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.brandInk,
    marginTop: 14,
    textTransform: "uppercase",
  },
  totals: { marginTop: 14, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 4 },

  strip: { marginTop: 16, backgroundColor: C.chip, borderRadius: 10, padding: 12 },
  stripLabel: { fontSize: 11.5, color: C.sub, fontWeight: "600" },
  stripValue: { fontSize: 17, color: C.brandInk, fontWeight: "800", marginTop: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  warn: { fontSize: 12, color: C.warn, lineHeight: 17, marginTop: 8 },

  amount: { fontSize: 28, fontWeight: "800", color: C.ink, marginVertical: 8 },
  verdict: {
    marginTop: 12,
    padding: 11,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: "700",
    overflow: "hidden",
  },
  verdictOk: { backgroundColor: "#e7f7f1", color: C.ok },
  verdictBad: { backgroundColor: "#fdeceb", color: C.bad },
  verdictNeutral: { backgroundColor: "#f1f3f8", color: C.sub },

  disclaimer: {
    fontSize: 11.5,
    color: C.sub,
    lineHeight: 17,
    marginHorizontal: 16,
    marginTop: 8,
  },
});
