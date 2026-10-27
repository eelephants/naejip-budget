#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
세로 정보형 영상 렌더러 (1080x1920 / H.264)

사용법:
    python3 render_reel.py content.json out.mp4 --platform instagram
    python3 render_reel.py content.json out.mp4 --platform youtube --silent-audio

content.json 스키마는 SKILL.md 참조.
숫자·텍스트를 코드로 그리기 때문에 생성형 모델과 달리 수치가 절대 틀어지지 않는다.
"""

import argparse, json, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
MARGIN = 88

# 플랫폼별 UI 가림 영역. 이 값을 벗어나면 앱 오버레이에 글자가 잘린다.
PLATFORMS = {
    # 인스타 릴스: 하단에 계정명·캡션·음원이 크게 깔린다
    'instagram': {'top': 250, 'bottom': 1560, 'right_reserve': 0},
    # 유튜브 쇼츠: 우측 액션레일(좋아요/댓글/공유)이 화면 중하단을 덮는다
    'youtube':   {'top': 210, 'bottom': 1620, 'right_reserve': 150},
}

THEME = {
    'bg_top': (12, 15, 20), 'bg_bot': (20, 26, 35),
    'ink': (243, 245, 248), 'mute': (124, 134, 151), 'dim': (78, 87, 102),
    'accent': (240, 180, 41), 'cool': (86, 156, 214), 'warm': (226, 90, 78),
    'rule': (38, 44, 55), 'card': (24, 30, 40),
}

KR_BLACK = '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'
KR_MED   = '/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc'
KR_REG   = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
NUM_BOLD = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
NUM_MED  = '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf'

_fc = {}
def kr(size, weight='black'):
    """한글 본문/제목. Poppins에는 '→' 글리프가 없으므로 화살표도 이 폰트로 그린다."""
    key = ('kr', size, weight)
    if key not in _fc:
        path = {'black': KR_BLACK, 'medium': KR_MED, 'regular': KR_REG}[weight]
        _fc[key] = ImageFont.truetype(path, size, index=1)   # index 1 = KR
    return _fc[key]

def num(size, weight='bold'):
    """숫자 전용. 한글 폰트의 숫자보다 좁고 강해서 수치가 눈에 박힌다."""
    key = ('num', size, weight)
    if key not in _fc:
        _fc[key] = ImageFont.truetype(NUM_BOLD if weight == 'bold' else NUM_MED, size)
    return _fc[key]

def color(name):
    return THEME.get(name, THEME['ink']) if isinstance(name, str) else tuple(name)


# ---------------------------------------------------------------- background
def make_bg():
    g = np.linspace(0, 1, H)[:, None, None]
    top, bot = np.array(THEME['bg_top'], np.float32), np.array(THEME['bg_bot'], np.float32)
    arr = np.repeat(top + (bot - top) * g, W, axis=1)
    arr += np.random.default_rng(7).normal(0, 2.0, (H, W, 1))   # 평면 그라디언트의 밴딩 방지
    return np.clip(arr, 0, 255).astype(np.uint8)


class Layer:
    """캔버스에서 실제 그려진 영역만 잘라 보관한다. 프레임당 합성 비용을 크게 줄인다."""
    def __init__(self, img, delay=0.0):
        bbox = img.getbbox() or (0, 0, 1, 1)
        self.pos = (bbox[0], bbox[1])
        crop = img.crop(bbox)
        self.rgb = np.array(crop.convert('RGB'), np.float32)
        self.a = np.array(crop.split()[3], np.float32)[:, :, None] / 255.0
        self.delay = delay


def canvas():
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))

def tracked(d, xy, text, font, fill, track=0):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + track
    return x

def wrap(d, text, font, maxw):
    out, line = [], ''
    for ch in text:
        if ch == '\n':
            out.append(line); line = ''; continue
        if d.textlength(line + ch, font=font) > maxw and line:
            out.append(line); line = ch
        else:
            line += ch
    if line:
        out.append(line)
    return out


# ---------------------------------------------------------------- blocks
def build_slide(slide, idx, total, cfg):
    """슬라이드 정의를 Layer 리스트로 변환. y커서를 블록끼리 넘겨가며 세로로 쌓는다."""
    layers = []
    full_w = W - MARGIN * 2
    top, bottom = cfg['top'], cfg['bottom']

    # ---- 키커 (섹션 라벨 + 회차 번호)
    c = canvas(); d = ImageDraw.Draw(c)
    d.rectangle([MARGIN, top, MARGIN + 56, top + 5], fill=color('accent'))
    tracked(d, (MARGIN, top + 30), slide.get('kicker', ''), kr(34), color('accent'), track=6)
    if slide.get('show_index', True):
        f, tag = num(30), f'{idx:02d}'
        d.text((W - MARGIN - d.textlength(tag, font=f), top + 30), tag, font=f, fill=color('dim'))
    layers.append(Layer(c, 0.0))

    y = top + 130
    delay = 0.1

    for block in slide.get('blocks', []):
        kind = block.get('type')
        c = canvas(); d = ImageDraw.Draw(c)
        avail = full_w - (cfg['right_reserve'] if y > 900 else 0)

        if kind == 'headline':
            size = block.get('size', 58)
            for i, line in enumerate(block['lines']):
                col = color(block.get('accent_line') == i and 'accent' or block.get('color', 'ink'))
                d.text((MARGIN, y), line, font=kr(size), fill=col)
                y += int(size * 1.22)
            y += 30

        elif kind == 'sub':
            f = kr(block.get('size', 40), 'medium')
            for line in wrap(d, block['text'], f, avail):
                d.text((MARGIN, y), line, font=f, fill=color(block.get('color', 'mute')))
                y += int(f.size * 1.35)
            y += 26

        elif kind == 'bars':
            # 값 비교. width_ratio는 0~1, 가장 큰 값을 1로 두면 길이가 정직하게 읽힌다.
            for it in block['items']:
                d.text((MARGIN, y), it['label'], font=kr(30, 'medium'), fill=color('mute'))
                bw = max(40, int(avail * 0.62 * it['width_ratio']))
                col = color(it.get('color', 'ink'))
                d.rounded_rectangle([MARGIN, y + 52, MARGIN + bw, y + 98], radius=6, fill=col)
                d.text((MARGIN + bw + 26, y + 44), it['value'], font=num(52), fill=col)
                y += 168

        elif kind == 'delta':
            # A → B 한 줄. 이 콘텐츠 유형에서 가장 자주 쓰이는 형태다.
            f_big, f_unit = num(block.get('size', 120)), kr(46)
            x = MARGIN
            d.text((x, y), block['from'], font=f_big, fill=color('dim'))
            x += d.textlength(block['from'], font=f_big) + 14
            if block.get('from_unit'):
                d.text((x, y + 66), block['from_unit'], font=f_unit, fill=color('dim'))
                x += d.textlength(block['from_unit'], font=f_unit) + 24
            d.text((x, y + 50), '→', font=kr(72, 'medium'), fill=color(block.get('color', 'accent')))
            x += 110
            col = color(block.get('color', 'accent'))
            d.text((x, y), block['to'], font=f_big, fill=col)
            x += d.textlength(block['to'], font=f_big) + 14
            if block.get('to_unit'):
                d.text((x, y + 66), block['to_unit'], font=f_unit, fill=col)
            y += int(f_big.size * 1.6)

        elif kind == 'rows':
            # 세부 항목 표. 구분선이 있어야 스캔이 된다.
            for r in block['rows']:
                d.text((MARGIN, y), r['label'], font=kr(36, 'medium'), fill=color('mute'))
                if 'from' in r:
                    d.text((MARGIN + 300, y - 4), r['from'], font=num(40), fill=color('dim'))
                    d.text((MARGIN + 376, y - 2), '→', font=kr(32, 'medium'), fill=color('dim'))
                    d.text((MARGIN + 440, y - 4), r['to'], font=num(40), fill=color('ink'))
                    if r.get('unit'):
                        d.text((MARGIN + 520, y + 2), r['unit'], font=kr(30, 'medium'), fill=color('mute'))
                else:
                    d.text((MARGIN + 300, y), r.get('value', ''), font=kr(36), fill=color('ink'))
                d.line([MARGIN, y + 66, MARGIN + avail, y + 66], fill=color('rule'), width=2)
                y += 100
            y += 20

        elif kind == 'cards':
            # 대립하는 견해를 나란히 둘 때. 좌측 컬러바가 입장 차이를 표시한다.
            for cd in block['cards']:
                d.rounded_rectangle([MARGIN, y, MARGIN + avail, y + 178], radius=18, fill=color('card'))
                d.rounded_rectangle([MARGIN, y, MARGIN + 8, y + 178], radius=4,
                                    fill=color(cd.get('tone', 'accent')))
                d.text((MARGIN + 44, y + 38), cd['name'], font=kr(34, 'medium'), fill=color('mute'))
                d.text((MARGIN + 44, y + 90), cd['value'], font=kr(58),
                       fill=color(cd.get('tone', 'accent')))
                y += 210

        elif kind == 'stat_card':
            d.rounded_rectangle([MARGIN, y, MARGIN + avail, y + 210], radius=18, fill=color('card'))
            d.text((MARGIN + 44, y + 40), block['label'], font=kr(34, 'medium'), fill=color('mute'))
            d.text((MARGIN + 44, y + 96), block['value'], font=num(78), fill=color('accent'))
            if block.get('unit'):
                off = d.textlength(block['value'], font=num(78))
                d.text((MARGIN + 60 + off, y + 130), block['unit'], font=kr(44), fill=color('accent'))
            y += 250

        elif kind == 'agenda':
            for r in block['rows']:
                d.text((MARGIN, y), r['key'], font=num(46), fill=color('accent'))
                d.text((MARGIN + 150, y + 6), r['text'], font=kr(38, 'medium'), fill=color('ink'))
                if r.get('tag'):
                    d.text((MARGIN + 150, y + 62), r['tag'], font=kr(28, 'medium'), fill=color('dim'))
                d.line([MARGIN, y + 122, MARGIN + avail, y + 122], fill=color('rule'), width=2)
                y += 168
            y += 20

        elif kind == 'cta':
            d.text((MARGIN, y), block['title'], font=kr(52), fill=color('ink'))
            y += 80
            if block.get('sub'):
                d.text((MARGIN, y), block['sub'], font=kr(34, 'medium'), fill=color('mute'))
                y += 60

        else:
            print(f'  ! 알 수 없는 블록 유형: {kind}', file=sys.stderr)
            continue

        layers.append(Layer(c, delay))
        delay += 0.3

    # ---- 각주 (하단 고정)
    if slide.get('footer'):
        c = canvas(); d = ImageDraw.Draw(c)
        f = kr(31, 'regular')
        lines = wrap(d, slide['footer'], f, full_w - cfg['right_reserve'])
        fy = bottom - len(lines) * 46 - 10
        d.rectangle([MARGIN, fy - 34, MARGIN + 40, fy - 32], fill=color('dim'))
        for ln in lines:
            d.text((MARGIN, fy), ln, font=f, fill=color('mute'))
            fy += 46
        layers.append(Layer(c, delay + 0.15))

    if y > bottom - 60:
        print(f'  ! 슬라이드 {idx} 내용이 안전영역을 {int(y - bottom)}px 넘습니다. '
              f'항목을 줄이거나 슬라이드를 나누세요.', file=sys.stderr)
    return layers


# ---------------------------------------------------------------- render
def ease_out(t):
    return 1 - (1 - t) ** 3

def render(content, out_path, platform, silent_audio):
    cfg = PLATFORMS[platform]
    bg = make_bg()
    slides = content['slides']
    total_dur = sum(s.get('duration', 6.5) for s in slides)
    print(f'{platform} / {total_dur:.1f}초 / {int(total_dur * FPS)}프레임')

    target = out_path if not silent_audio else out_path + '.tmp.mp4'
    proc = subprocess.Popen(
        ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
         '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', str(content.get('crf', 19)),
         '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target],
        stdin=subprocess.PIPE)

    elapsed = 0.0
    for si, slide in enumerate(slides, 1):
        dur = slide.get('duration', 6.5)
        layers = build_slide(slide, si, len(slides), cfg)
        for i in range(int(dur * FPS)):
            t = i / FPS
            frame = bg.astype(np.float32).copy()
            for L in layers:
                lt = t - L.delay
                if lt < 0:
                    continue
                a_in = ease_out(min(lt / 0.55, 1.0))
                dy = int(46 * (1 - a_in))
                a_out, out_start = 1.0, dur - 0.32
                if t > out_start:
                    a_out = max(0.0, 1 - (t - out_start) / 0.32)
                    dy -= int(26 * (1 - a_out))
                alpha = a_in * a_out
                if alpha <= 0.004:
                    continue
                x0, y0 = L.pos
                y0 += dy
                h, w = L.rgb.shape[:2]
                ys, ye, xs, xe = max(0, y0), min(H, y0 + h), max(0, x0), min(W, x0 + w)
                if ys >= ye or xs >= xe:
                    continue
                sy, sx = ys - y0, xs - x0
                sub = L.a[sy:sy + ye - ys, sx:sx + xe - xs] * alpha
                frame[ys:ye, xs:xe] = (frame[ys:ye, xs:xe] * (1 - sub)
                                       + L.rgb[sy:sy + ye - ys, sx:sx + xe - xs] * sub)
            # 진행 바 — 남은 길이를 보여주면 이탈이 줄어든다
            p = (elapsed + t) / total_dur
            frame[176:182, MARGIN:W - MARGIN] = np.array(THEME['rule'], np.float32)
            pw = int((W - MARGIN * 2) * p)
            if pw:
                frame[176:182, MARGIN:MARGIN + pw] = np.array(THEME['accent'], np.float32)
            proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
        elapsed += dur
        print(f'  슬라이드 {si}/{len(slides)}')

    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit('ffmpeg 인코딩 실패')

    if silent_audio:
        # 일부 업로드 API는 오디오 트랙이 없는 파일을 거부한다
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', target,
                        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
                        '-shortest', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
                        '-movflags', '+faststart', out_path], check=True)
        subprocess.run(['rm', '-f', target])
    print('완료:', out_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('content')
    ap.add_argument('output')
    ap.add_argument('--platform', choices=list(PLATFORMS), default='instagram')
    ap.add_argument('--silent-audio', action='store_true',
                    help='무음 AAC 트랙 추가 (API 업로드용)')
    a = ap.parse_args()
    render(json.load(open(a.content, encoding='utf-8')), a.output, a.platform, a.silent_audio)


if __name__ == '__main__':
    main()
