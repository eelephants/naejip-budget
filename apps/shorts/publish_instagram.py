"""
인스타그램 릴스 게시 (Instagram API with Instagram Login)

준비
  1. 인스타그램 계정을 프로페셔널(비즈니스 또는 크리에이터)로 전환
  2. developers.facebook.com 에서 앱 생성 → Instagram 제품 → "API setup with Instagram Login"
  3. 앱 대시보드에서 본인 계정을 연결하고 액세스 토큰 발급 (본인 계정이면 앱 리뷰 불필요)
  4. 환경변수 설정
       export IG_USER_ID=...          # 인스타그램 프로페셔널 계정 ID
       export IG_ACCESS_TOKEN=...     # 장기 토큰 (60일마다 갱신)
       export IG_API_VERSION=v24.0    # 선택. 비우면 지원되는 가장 오래된 버전으로 호출됨

영상은 파일 업로드가 아니라 공개 HTTPS URL로 넘긴다. Meta 서버가 그 주소에서 직접 내려받는다.

사용
  python3 publish_instagram.py --video-url https://.../short.mp4 --caption caption.txt
  python3 publish_instagram.py --video-url ... --caption caption.txt --dry-run   # 호출 내용만 확인
"""
import argparse, json, os, sys, time, urllib.parse, urllib.request

HOST = 'https://graph.instagram.com'


def api(method, path, params, token):
    ver = os.environ.get('IG_API_VERSION', '').strip()
    url = f"{HOST}/{ver + '/' if ver else ''}{path}"
    params = dict(params, access_token=token)
    data = None
    if method == 'GET':
        url += '?' + urllib.parse.urlencode(params)
    else:
        data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f'API 오류 {e.code}: {e.read().decode(errors="replace")}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--video-url', required=True, help='공개 HTTPS mp4 주소')
    ap.add_argument('--caption', help='캡션 텍스트 파일')
    ap.add_argument('--cover-offset-ms', type=int, default=0, help='커버로 쓸 프레임 위치(ms)')
    ap.add_argument('--no-feed', action='store_true', help='릴스 탭에만 올리고 피드에는 공유 안 함')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    ig, token = os.environ.get('IG_USER_ID'), os.environ.get('IG_ACCESS_TOKEN')
    caption = open(a.caption, encoding='utf-8').read().strip() if a.caption else ''
    params = {
        'media_type': 'REELS',
        'video_url': a.video_url,
        'caption': caption,
        'share_to_feed': 'false' if a.no_feed else 'true',
        'thumb_offset': str(a.cover_offset_ms),
    }

    if a.dry_run:
        print('컨테이너 생성 요청:', json.dumps(params, ensure_ascii=False, indent=2))
        return
    if not ig or not token:
        sys.exit('IG_USER_ID, IG_ACCESS_TOKEN 환경변수가 필요합니다')

    # 1) 컨테이너 생성 — Meta가 video_url에서 영상을 가져가 처리를 시작한다
    cid = api('POST', f'{ig}/media', params, token)['id']
    print('컨테이너:', cid)

    # 2) 처리 완료까지 대기 — 영상은 수십 초~몇 분 걸린다
    for i in range(60):
        st = api('GET', cid, {'fields': 'status_code,status'}, token)
        code = st.get('status_code')
        print(f'  상태: {code}')
        if code == 'FINISHED':
            break
        if code in ('ERROR', 'EXPIRED'):
            sys.exit(f'처리 실패: {st}')
        time.sleep(10)
    else:
        sys.exit('10분 안에 처리가 끝나지 않았습니다')

    # 3) 게시
    mid = api('POST', f'{ig}/media_publish', {'creation_id': cid}, token)['id']
    print('게시 완료. 미디어 ID:', mid)


if __name__ == '__main__':
    main()
