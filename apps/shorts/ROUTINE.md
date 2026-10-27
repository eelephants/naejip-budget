# 매일 아침 루틴 설정 (claude.ai/code/routines)

- 저장소: eelephants/naejip-budget
- 일정: 매일 06:30 (KST)
- 커넥터: higgsfield.ai, Slack
- 환경 설치 스크립트:
  apt-get update && apt-get install -y ffmpeg fonts-noto-cjk
  pip install pillow numpy
  mkdir -p /usr/share/fonts/truetype/google-fonts && for w in Bold Medium; do curl -sL -o /usr/share/fonts/truetype/google-fonts/Poppins-$w.ttf https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-$w.ttf; done
- 네트워크 허용: github.com (폰트), *.cloudfront.net (힉스필드 결과), 영상 업로드 스토리지, graph.instagram.com (게시 자동화 시)
- 시크릿: 스토리지 업로드 토큰 (게시 자동화 시 IG_USER_ID, IG_ACCESS_TOKEN)

## 루틴 프롬프트

apps/shorts에서 오늘자 숏폼을 만들어. AGENTS.md의 숏폼 규칙을 따른다.

1. 오늘 브리핑을 읽는다. (출처: ___ 여기에 채우기)
2. prompts/hook_prompt.md 규칙대로 hook.json, content.json, caption.txt를 갱신한다. 규제 수치는 packages/core/src/rulesets.ts 현행 룰셋과 대조한다.
3. 힉스필드로 9:16 배경 이미지 1장을 생성해 hook.json의 media에 결과 URL을 넣는다. 크레딧이 부족하면 assets/의 기존 배경을 쓴다.
4. `cd apps/shorts && python3 run.py --out out/short.mp4` 로 렌더링하고 0.5초·3초·15초 프레임을 확인한다.
5. 영상을 스토리지에 올리고, Slack에 영상 링크·캡션·사용한 수치와 출처를 보낸다.
6. 커밋하지 않는다. 인스타에 게시하지 않는다.
