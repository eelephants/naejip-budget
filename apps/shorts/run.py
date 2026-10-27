"""
하이브리드 쇼츠 파이프라인

  [AI 배경] ──▶ 훅 4초 (코드로 헤드라인 합성)
                         ╲
                          ▶ 이어 붙이기 ──▶ 오디오 ──▶ 완성본
                         ╱
  [브리핑 수치] ──▶ 본문 슬라이드 (코드 렌더링)

사용법
  python3 run.py                         # hook.json, content.json 기본값으로 실행
  python3 run.py --platform instagram    # 릴스용 안전영역으로
  python3 run.py --narration voice.m4a   # 본인 내레이션을 얹기
  python3 run.py --bgm bgm.mp3           # 배경음악 (내레이션과 같이 쓰면 자동으로 낮춤)
"""
import argparse, json, os, subprocess, sys, tempfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hook_render import render_hook


def sh(*cmd):
    subprocess.run(cmd, check=True)


def fetch_media(src, workdir):
    """hook.json의 media가 URL이면 내려받고, 로컬 경로면 그대로 쓴다."""
    if not src.startswith('http'):
        return src if os.path.isabs(src) else os.path.join(HERE, src)
    ext = os.path.splitext(src.split('?')[0])[1] or '.png'
    dst = os.path.join(workdir, 'hook_media' + ext)
    print('AI 배경 내려받는 중:', src)
    urllib.request.urlretrieve(src, dst)
    return dst


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
    return float(out.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--hook', default=os.path.join(HERE, 'hook.json'))
    ap.add_argument('--content', default=os.path.join(HERE, 'content.json'))
    ap.add_argument('--platform', choices=['youtube', 'instagram'], default='youtube')
    ap.add_argument('--out', default=os.path.join(HERE, 'out', 'short.mp4'))
    ap.add_argument('--narration', help='본인 내레이션 오디오 파일')
    ap.add_argument('--bgm', help='배경음악 파일')
    a = ap.parse_args()

    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    hook = json.load(open(a.hook, encoding='utf-8'))

    with tempfile.TemporaryDirectory() as tmp:
        # 1) 훅: AI 배경 + 코드로 그린 헤드라인
        media = fetch_media(hook['media'], tmp)
        hook_mp4 = os.path.join(tmp, 'hook.mp4')
        render_hook(hook, media, hook_mp4, a.platform)

        # 2) 본문: 수치 슬라이드는 전부 코드 렌더링
        body_mp4 = os.path.join(tmp, 'body.mp4')
        sh(sys.executable, os.path.join(HERE, 'vendor', 'render_reel.py'),
           a.content, body_mp4, '--platform', a.platform)

        # 3) 이어 붙이기 — 두 구간의 해상도·fps·코덱이 같아서 재인코딩 없이 붙는다
        lst = os.path.join(tmp, 'list.txt')
        with open(lst, 'w') as f:
            f.write(f"file '{hook_mp4}'\nfile '{body_mp4}'\n")
        video = os.path.join(tmp, 'video.mp4')
        sh('ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
           '-c', 'copy', video)
        total = duration(video)

        # 4) 오디오 — 무음 영상은 도달이 떨어지고, 일부 업로드 API는 오디오 트랙을 요구한다
        if a.narration and a.bgm:
            sh('ffmpeg', '-y', '-loglevel', 'error', '-i', video, '-i', a.narration, '-i', a.bgm,
               '-filter_complex',
               '[2:a]volume=0.18,afade=t=out:st=%.2f:d=1.5[b];[1:a][b]amix=inputs=2:duration=first[a]' % (total - 1.5),
               '-map', '0:v', '-map', '[a]', '-t', f'{total:.2f}',
               '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', a.out)
        elif a.narration or a.bgm:
            aud = a.narration or a.bgm
            vol = '1.0' if a.narration else '0.35'
            sh('ffmpeg', '-y', '-loglevel', 'error', '-i', video, '-i', aud,
               '-filter_complex', f'[1:a]volume={vol},afade=t=out:st={total - 1.5:.2f}:d=1.5[a]',
               '-map', '0:v', '-map', '[a]', '-t', f'{total:.2f}',
               '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', a.out)
        else:
            sh('ffmpeg', '-y', '-loglevel', 'error', '-i', video,
               '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
               '-shortest', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
               '-movflags', '+faststart', a.out)

    print(f'\n완성: {a.out}  ({duration(a.out):.1f}초, {a.platform})')
    print('업로드 전 체크: 첫 프레임 수치 확인 · AI 생성 콘텐츠 라벨 표시')


if __name__ == '__main__':
    main()
