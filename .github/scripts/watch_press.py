#!/usr/bin/env python3
"""정책브리핑(korea.kr) 보도자료에서 부동산 관련 신규 건을 찾아 GitHub Issue 본문을 만든다.

국토교통부 사이트(molit.go.kr)는 봇 접근 시 리다이렉트 루프라 직접 쓰지 못한다.
korea.kr 은 각 부처 보도자료 원문을 모아주고 newsId 가 안정적이라 이를 기준으로 중복을 거른다.
"""
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request

LIST_URL = "https://www.korea.kr/briefing/pressReleaseList.do"
VIEW_URL = "https://www.korea.kr/briefing/pressReleaseView.do?newsId="

# 부동산 예산 계산에 영향을 줄 수 있는 주제 전반
KEYWORDS = [
    "부동산", "주택", "주택담보대출", "전세", "청약",
    "재건축", "재개발", "분양", "가계부채", "LTV", "DSR",
]

# 이 앱의 룰셋(LTV·DSR·정책대출)을 좌우하는 부처만 남긴다.
# 국토부=기금대출·공급, 금융위/금감원=LTV·DSR, 기재부=세제
DEPTS = {"국토교통부", "금융위원회", "금융감독원", "기획재정부"}

SEEN_PATH = os.path.join(os.path.dirname(__file__), "..", "press-watch-seen.json")

ITEM_RE = re.compile(
    r'pressReleaseView\.do\?newsId=(\d+).*?'
    r'<strong>(.*?)</strong>.*?'
    r'<span class="source">\s*<span>([\d-]+)</span>\s*<span>(.*?)</span>',
    re.S,
)
TAG_RE = re.compile(r"<[^>]+>")


def clean(s: str) -> str:
    s = TAG_RE.sub("", s)
    return " ".join(html.unescape(s).split())


def fetch(keyword: str) -> str:
    url = LIST_URL + "?" + urllib.parse.urlencode({"srchWord": keyword})
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def main() -> int:
    seen = set()
    if os.path.exists(SEEN_PATH):
        with open(SEEN_PATH, encoding="utf-8") as f:
            seen = set(json.load(f).get("newsIds", []))

    found: dict[str, dict] = {}
    for kw in KEYWORDS:
        try:
            html = fetch(kw)
        except Exception as e:  # 한 키워드 실패가 전체를 막지 않는다
            print(f"warn: '{kw}' 조회 실패: {e}", file=sys.stderr)
            continue
        for news_id, title, date, dept in ITEM_RE.findall(html):
            dept = clean(dept)
            if dept not in DEPTS or news_id in seen or news_id in found:
                continue
            found[news_id] = {
                "id": news_id,
                "title": clean(title),
                "date": date,
                "dept": dept,
                "hit": kw,
            }

    items = sorted(found.values(), key=lambda x: x["date"], reverse=True)
    print(f"조회 완료: 신규 {len(items)}건 (기존 {len(seen)}건 제외)", file=sys.stderr)

    if items:
        lines = [
            "국토교통부·금융위 등에서 부동산 관련 보도자료가 새로 올라왔습니다.",
            "",
            "규제가 바뀌었다면 `packages/core/src/rulesets.ts` 에 새 룰셋을 추가하고",
            "각 클라이언트의 `ACTIVE_RULESET` 을 교체한 뒤 `npm test` 로 기존 룰셋 회귀를 확인하세요.",
            "",
        ]
        for it in items:
            lines.append(f"- **{it['date']} · {it['dept']}** — [{it['title']}]({VIEW_URL}{it['id']})")
            lines.append(f"  <sub>검색어: {it['hit']}</sub>")
        body = "\n".join(lines)

        out = os.environ.get("GITHUB_OUTPUT")
        if out:
            with open(out, "a", encoding="utf-8") as f:
                f.write("has_new=true\n")
                f.write(f"count={len(items)}\n")
                f.write("body<<__EOF__\n" + body + "\n__EOF__\n")
        else:
            print(body)

        seen.update(found)
        # 무한정 쌓이지 않게 최근 2000건만 유지
        kept = sorted(seen, reverse=True)[:2000]
        with open(SEEN_PATH, "w", encoding="utf-8") as f:
            json.dump({"newsIds": kept}, f, ensure_ascii=False, indent=1)
            f.write("\n")
    else:
        out = os.environ.get("GITHUB_OUTPUT")
        if out:
            with open(out, "a", encoding="utf-8") as f:
                f.write("has_new=false\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
