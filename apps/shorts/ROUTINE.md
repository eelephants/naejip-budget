# 매일 아침 루틴 설정 (claude.ai/code/routines)

브리핑과 숏폼은 루틴 두 개로 나뉜다. 브리핑 루틴이 Slack #알림에 올린 글을 숏폼 루틴이 읽는다.

| 시각 (KST) | 루틴 | 하는 일 |
|---|---|---|
| 09:00 | [Daily] 부동산 | 웹 검색으로 브리핑 작성 → 앱 푸시 + Slack #알림 게시 |
| 09:30 | [Daily] 부동산 숏폼 | #알림의 오늘 브리핑 → 영상 렌더 → #알림 스레드에 영상·캡션 |

## 브리핑 → 숏폼 연결 규칙

- 채널: Slack 비공개 채널 #알림 (`C0C8VKUGAJ0`)
- 브리핑 메시지 첫 줄은 `부동산 브리핑 YYYY-MM-DD` (KST 날짜)로 시작한다. 숏폼 루틴은 이 줄로 오늘 글을 찾는다.
- 뉴스가 없는 날은 `부동산 브리핑 YYYY-MM-DD — 특이사항 없음` 한 줄만 올라온다. 숏폼 루틴은 이 줄을 보면 영상을 만들지 않는다.
- 브리핑 형식을 바꾸면 숏폼 루틴 프롬프트도 함께 고친다.

## 숏폼 루틴 설정

- 저장소: eelephants/naejip-budget
- 일정: 매일 09:30 (KST)
- 커넥터: Slack, higgsfield.ai
- 실행 중 설치 (프롬프트 0단계):
  `apt-get install -y ffmpeg fonts-noto-cjk fonts-noto-cjk-extra && python3 -m pip install pillow numpy`
  - Black·Medium 굵기는 fonts-noto-cjk-extra에 있다. 빠지면 렌더러가 Bold·Regular로 대체하고 경고를 남긴다
  - Poppins는 `assets/fonts/`에 들어 있어 내려받지 않는다 (루틴 환경은 GitHub raw가 막혀 있다)
  - `pip` 대신 `python3 -m pip`를 쓴다. 환경에 파이썬이 둘 있어 `pip`가 다른 쪽에 설치한 적이 있다
- 네트워크: *.cloudfront.net (힉스필드 결과), files.slack.com (영상 업로드)
- 시크릿: 없음. 인스타 게시를 자동화할 때만 IG_USER_ID, IG_ACCESS_TOKEN

## 숏폼 루틴 프롬프트 요약

1. 환경 준비, `apps/shorts`가 없으면 파이프라인 브랜치를 체크아웃
2. #알림에서 오늘 브리핑을 찾는다. 없으면 10분 간격으로 3번 더 보고, 끝내 없으면 보고하고 멈춘다
3. `prompts/hook_prompt.md` 규칙대로 hook.json, content.json, caption.txt를 갱신한다. 수치는 브리핑에서 그대로 옮기고, 규제 수치는 `packages/core/src/rulesets.ts` 현행 룰셋과 대조한다
4. 힉스필드로 9:16 배경 이미지 1장을 만든다. 실패하거나 크레딧이 부족하면 `assets/hook_bg.jpg`
5. `python3 run.py --out out/short.mp4`로 렌더하고 0.5초·3초·15초 프레임을 확인한다
6. 브리핑 메시지 스레드에 영상, 캡션, 사용한 수치와 출처를 올린다
7. 커밋하지 않는다. 인스타에 게시하지 않는다
