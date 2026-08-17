/* 화면 조각들 — 색상은 웹(style.css)의 팔레트와 동일하게 맞췄다. */
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { fmt, parseMan } from "@naejip/core";

export const C = {
  bg: "#f6f7fb",
  card: "#ffffff",
  ink: "#1c2230",
  sub: "#5b6478",
  line: "#e3e7ef",
  brand: "#2f6bff",
  brandInk: "#1d4fd6",
  ok: "#0d9f6e",
  warn: "#d97706",
  bad: "#dc2626",
  chip: "#eef2ff",
  header: "#16213e",
};

export function Card({ step, title, hint, children }) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        {step ? (
          <View style={s.stepNo}>
            <Text style={s.stepNoTxt}>{step}</Text>
          </View>
        ) : null}
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

/* 만원 단위 입력 — 아래에 "= 1억 9,000만원"으로 환산해 보여준다. */
export function MoneyField({ label, value, onChange, note }) {
  const won = parseMan(value);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="#aab1c2"
          selectTextOnFocus
        />
        <Text style={s.unit}>만원</Text>
      </View>
      {won > 0 ? <Text style={s.convert}>= {fmt(won)}</Text> : null}
      {note ? <Text style={s.note}>{note}</Text> : null}
    </View>
  );
}

export function NumField({ label, value, onChange, unit, note }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#aab1c2"
          selectTextOnFocus
        />
        {unit ? <Text style={s.unit}>{unit}</Text> : null}
      </View>
      {note ? <Text style={s.note}>{note}</Text> : null}
    </View>
  );
}

/* Y/N 두 칸 세그먼트 — 웹의 select를 모바일에서 한 번에 누를 수 있게 바꿨다. */
export function YesNo({ label, value, onChange, yes = "Y", no = "N", note }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.segment}>
        {[
          [true, yes],
          [false, no],
        ].map(([v, txt]) => {
          const on = value === v;
          return (
            <TouchableOpacity
              key={txt}
              style={[s.segBtn, on && s.segBtnOn]}
              onPress={() => onChange(v)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.segTxt, on && s.segTxtOn]}>{txt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {note ? <Text style={s.note}>{note}</Text> : null}
    </View>
  );
}

export function Check({ label, value, onChange, note }) {
  return (
    <View style={s.checkRow}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: C.brand, false: "#cbd2e0" }}
        thumbColor="#fff"
      />
      <View style={s.checkTxtWrap}>
        <Text style={s.checkLabel}>{label}</Text>
        {note ? <Text style={s.note}>{note}</Text> : null}
      </View>
    </View>
  );
}

export function Badge({ ok, label }) {
  return (
    <View style={[s.badge, ok ? s.badgeY : s.badgeN]}>
      <Text style={[s.badgeTxt, ok ? s.badgeTxtY : s.badgeTxtN]}>
        {label} {ok ? "가능" : "불가"}
      </Text>
    </View>
  );
}

export function Row({ label, value, strong, color }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, strong && s.rowValueStrong, color && { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  stepNo: { backgroundColor: C.chip, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  stepNoTxt: { color: C.brandInk, fontSize: 12, fontWeight: "700" },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: C.ink },
  hint: { fontSize: 12.5, color: C.sub, lineHeight: 18, marginTop: 4, marginBottom: 8 },

  field: { marginTop: 12 },
  label: { fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    backgroundColor: "#fbfcff",
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 11, fontSize: 16, color: C.ink },
  unit: { fontSize: 13, color: C.sub, marginLeft: 6 },
  convert: { fontSize: 12, color: C.brandInk, fontWeight: "600", marginTop: 5 },
  note: { fontSize: 11.5, color: C.sub, lineHeight: 16, marginTop: 5 },

  segment: { flexDirection: "row", gap: 8 },
  segBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#fbfcff",
  },
  segBtnOn: { backgroundColor: C.brand, borderColor: C.brand },
  segTxt: { fontSize: 14, color: C.sub, fontWeight: "600" },
  segTxtOn: { color: "#fff", fontWeight: "700" },

  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 14 },
  checkTxtWrap: { flex: 1 },
  checkLabel: { fontSize: 13, color: C.ink, fontWeight: "600", lineHeight: 19 },

  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeY: { backgroundColor: "#e7f7f1" },
  badgeN: { backgroundColor: "#f1f3f8" },
  badgeTxt: { fontSize: 12, fontWeight: "700" },
  badgeTxtY: { color: C.ok },
  badgeTxtN: { color: C.sub },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  rowLabel: { fontSize: 13, color: C.sub },
  rowValue: { fontSize: 13, color: C.ink, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  rowValueStrong: { fontSize: 15, fontWeight: "800" },
});
