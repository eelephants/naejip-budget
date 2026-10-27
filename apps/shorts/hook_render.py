"""
훅 구간 렌더러.

AI가 만든 배경(이미지 또는 영상) 위에 헤드라인과 수치를 코드로 그린다.
AI에게는 글자를 맡기지 않는다. 숫자가 틀리면 콘텐츠 전체가 무너지기 때문이다.

  이미지 → 천천히 밀고 들어가는 켄 번즈 효과로 움직임을 만든다 (무료 플랜에서도 가능)
  영상   → 9:16로 잘라 앞부분만 쓴다 (유료 플랜에서 Kling·Seedance 클립을 쓸 때)
"""
import subprocess, sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'vendor'))
from render_reel import W, H, FPS, MARGIN, THEME, PLATFORMS, kr, num, color  # 본문과 같은 폰트·색을 쓴다


def ease_out(t):
    return 1 - (1 - t) ** 3


def cover(img, w, h):
    """비율을 유지한 채 캔버스를 꽉 채우도록 확대 후 가운데를 자른다."""
    s = max(w / img.width, h / img.height)
    img = img.resize((int(img.width * s + 0.5), int(img.height * s + 0.5)), Image.LANCZOS)
    x, y = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))


def scrim():
    """글자가 읽히도록 위쪽을 어둡게 깐다. 하늘을 비워두라고 프롬프트에 적은 이유다."""
    g = np.zeros((H, W, 1), np.float32)
    top = np.linspace(0.78, 0.0, int(H * 0.55))[:, None, None]
    g[:len(top)] = top
    bot = np.linspace(0.0, 0.55, int(H * 0.30))[:, None, None]
    g[H - len(bot):] = bot
    return g


def text_layer(hook, cfg):
    """헤드라인·서브·각주를 한 장의 RGBA 레이어로 그린다."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    maxw = W - MARGIN * 2 - cfg['right_reserve']
    y = cfg['top'] + 90

    if hook.get('kicker'):
        f = kr(36, 'medium')
        d.text((MARGIN, y), hook['kicker'], font=f, fill=color('accent'))
        y += 70

    size = hook.get('size', 116)
    f = kr(size)
    while any(d.textlength(l, font=f) > maxw for l in hook['lines']) and size > 60:
        size -= 4
        f = kr(size)
    for i, line in enumerate(hook['lines']):
        fill = color('accent') if i == hook.get('accent_line', -1) else color('ink')
        d.text((MARGIN, y), line, font=f, fill=fill)
        y += int(size * 1.18)

    if hook.get('sub'):
        y += 40
        d.text((MARGIN, y), hook['sub'], font=kr(42, 'medium'), fill=color('ink'))

    if hook.get('footer'):
        d.text((MARGIN, cfg['bottom'] - 60), hook['footer'], font=kr(30, 'medium'), fill=color('ink'))

    # 사진 위 글자는 얇은 그림자가 있어야 어떤 배경에서도 읽힌다
    shadow = img.split()[3].filter(ImageFilter.GaussianBlur(10))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sh.putalpha(shadow.point(lambda a: int(a * 0.55)))
    return Image.alpha_composite(sh, img)


def frames_from_image(path, n, zoom):
    """켄 번즈: 넓게 시작해 천천히 밀고 들어간다. 무료 이미지 한 장으로 움직임을 만든다."""
    base = cover(Image.open(path).convert('RGB'), int(W * zoom), int(H * zoom))
    for i in range(n):
        z = 1 + (zoom - 1) * ease_out(i / max(n - 1, 1))
        cw, ch = int(W * zoom / z), int(H * zoom / z)
        x, y = (base.width - cw) // 2, (base.height - ch) // 2
        yield np.asarray(base.crop((x, y, x + cw, y + ch)).resize((W, H), Image.BICUBIC), np.float32)


def frames_from_video(path, n):
    cmd = ['ffmpeg', '-loglevel', 'error', '-i', path, '-vf',
           f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}',
           '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        last = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
        yield last
    p.wait()


def render_hook(hook, media_path, out_path, platform='youtube'):
    cfg = PLATFORMS[platform]
    dur = hook.get('duration', 4.0)
    n = int(dur * FPS)
    is_video = media_path.lower().endswith(('.mp4', '.mov', '.webm'))
    src = frames_from_video(media_path, n) if is_video else frames_from_image(media_path, n, hook.get('zoom', 1.10))

    txt = text_layer(hook, cfg)
    t_rgb = np.asarray(txt.convert('RGB'), np.float32)
    t_a = np.asarray(txt.split()[3], np.float32)[:, :, None] / 255.0
    sc = scrim()

    proc = subprocess.Popen(
        ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
         '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
         '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out_path],
        stdin=subprocess.PIPE)

    last = None
    for i in range(n):
        try:
            f = next(src)
            last = f
        except StopIteration:
            f = last  # 영상이 짧으면 마지막 프레임을 유지
        t = i / FPS
        frame = f * (1 - sc)
        a_in = ease_out(min(max(t - 0.25, 0) / 0.6, 1.0))   # 배경이 먼저 보이고 글자가 따라 들어온다
        a_out = 1.0 if t < dur - 0.3 else max(0.0, 1 - (t - (dur - 0.3)) / 0.3)
        a = t_a * a_in
        frame = frame * (1 - a) + t_rgb * a
        if a_out < 1:
            frame = frame * a_out + np.array(THEME['bg_top'], np.float32) * (1 - a_out)
        proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit('훅 인코딩 실패')
    print('훅 완료:', out_path, f'({dur:.1f}초)')


if __name__ == '__main__':
    hook = json.load(open(sys.argv[1], encoding='utf-8'))
    render_hook(hook, sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else 'youtube')
