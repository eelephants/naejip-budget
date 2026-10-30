# 하이브리드 부동산 쇼츠 파이프라인

AI는 첫 4초의 배경만 만들고, 숫자와 글자는 전부 코드로 그린다.

```
브리핑 ─┬─ Claude: 배경 프롬프트 + hook.json 작성 (prompts/hook_prompt.md)
        │      └─ 힉스필드: 9:16 배경 이미지 또는 영상 생성
        ├─ hook_render.py: AI 배경 + 코드 헤드라인 → 훅 4초
        ├─ vendor/render_reel.py: content.json → 본문 수치 슬라이드
        └─ run.py: 이어 붙이기 → 오디오 → out/short.mp4
```

## 실행

```bash
python3 -m pip install pillow numpy   # ffmpeg, Noto Sans CJK(Black·Medium·Regular) 필요. Poppins는 assets/fonts에 포함
python3 run.py                    # 유튜브 쇼츠용
python3 run.py --platform instagram --out out/reels.mp4
python3 run.py --narration voice.m4a --bgm bgm.mp3
```

## 폰트

렌더러는 `assets/fonts/` → `/usr/share/fonts/opentype/noto` → `/usr/share/fonts/truetype/google-fonts` → `~/Library/Fonts` → `/Library/Fonts` 순서로 찾는다. 다른 폴더는 `SHORTS_FONT_DIRS`(경로 구분자 `:`)로 더한다.

- Poppins Bold·Medium: 저장소에 포함 (SIL OFL 1.1, `assets/fonts/OFL.txt`)
- Noto Sans CJK: 우분투는 `fonts-noto-cjk`(Regular·Bold)와 `fonts-noto-cjk-extra`(Black·Medium)를 함께 설치한다. Black·Medium이 없으면 Bold·Regular로 대체하고 경고를 남긴다

## 매일 바꾸는 파일

- `hook.json` — `media`에 힉스필드 결과 URL(또는 로컬 경로), 헤드라인, 핵심 수치
- `content.json` — 본문 슬라이드 수치

`media`가 이미지면 켄 번즈(천천히 밀고 들어가기)로 움직임을 만들고,
`.mp4`면 영상을 9:16으로 잘라 그대로 쓴다. 나머지 코드는 같다.

## 힉스필드 플랜별 구성

| 플랜 | 훅 배경 | 월 30편 비용 |
|---|---|---|
| 무료 (10크레딧) | 이미지 + 켄 번즈 | 이미지 장당 약 2크레딧 → 테스트 몇 장 |
| Starter $19 | 이미지 + 켄 번즈 | 리테이크 포함 충분 |
| Plus 이상 | Kling·Seedance 5초 영상 | 계산기로 확인 |

## 업로드 전 체크

1. 훅 첫 프레임의 수치가 브리핑과 같은지
2. 배경에 글자·간판·로고가 섞여 들어가지 않았는지
3. 유튜브·틱톡·인스타 업로드 시 AI 생성 콘텐츠 라벨 표시
4. 설명란에 "정보 제공 목적이며 투자 조언이 아닙니다" 한 줄

## 인스타그램 자동 게시 (publish_instagram.py)

Claude에는 인스타그램 커넥터가 없어서 Meta 공식 API로 직접 올린다.

1. 인스타 계정을 프로페셔널(비즈니스·크리에이터)로 전환
2. Meta 개발자 앱 → Instagram 제품 → "API setup with Instagram Login" (페이스북 페이지 불필요)
3. 앱 대시보드에서 본인 계정 토큰 발급 → `IG_USER_ID`, `IG_ACCESS_TOKEN` 설정
4. 렌더한 mp4를 공개 HTTPS 주소에 올린다 (Vercel Blob, Supabase Storage, S3 등)
5. `python3 publish_instagram.py --video-url <주소> --caption caption.txt`

주의: API로 올리면 인스타 음원 라이브러리를 쓸 수 없다. `run.py --bgm`으로 음원을 미리 섞어서 렌더할 것.
