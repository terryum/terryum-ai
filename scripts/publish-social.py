#!/usr/bin/env python3
"""
소셜미디어 자동 공유 스크립트.

posts/index.json에서 essays|tech 포스트를 찾아
Facebook Page, Threads, LinkedIn, X(Twitter), Bluesky에 공유한다.

사용법:
    python scripts/publish-social.py [--dry-run] [--slug=<slug>] [--platform=facebook,threads,linkedin,x,bluesky]

환경변수 (.env.local):
    FACEBOOK_PAGE_ID                Facebook Page ID
    FACEBOOK_PAGE_ACCESS_TOKEN      Long-lived Page Access Token (만료 없음)

    THREADS_ACCESS_TOKEN            User Access Token (60일 만료)
    THREADS_USER_ID                 Threads 사용자 ID
    THREADS_TOKEN_CREATED           발급일 YYYY-MM-DD (만료 경고용)

    LINKEDIN_ACCESS_TOKEN           OAuth 2.0 Bearer Token (60일 만료)
    LINKEDIN_PERSON_URN             urn:li:person:{ID}
    LINKEDIN_TOKEN_CREATED          발급일 YYYY-MM-DD

    X_API_KEY                       OAuth 1.0a API Key
    X_API_SECRET                    OAuth 1.0a API Secret
    X_ACCESS_TOKEN                  OAuth 1.0a Access Token
    X_ACCESS_TOKEN_SECRET           OAuth 1.0a Access Token Secret

    BLUESKY_IDENTIFIER              Bluesky handle (e.g. user.bsky.social)
    BLUESKY_APP_PASSWORD            App-specific password (만료 없음)

    SITE_BASE_URL                   홈페이지 베이스 URL (기본: https://terry.artlab.ai)
"""
# social_common 임포트가 UTF-8 설정 + dotenv 로드를 처리함
from social_common import (
    REPO_ROOT, POSTS_DIR, INDEX_PATH, PUBLISHABLE_TYPES,
    load_index, read_mdx_frontmatter,
    get_publishable_candidates, find_post_by_slug, sort_by_published_at,
)

import os
import re
import sys
import json
import argparse
from datetime import date, datetime
from pathlib import Path

import requests

SITE_BASE_URL = os.environ.get("SITE_BASE_URL", "https://terry.artlab.ai")
FACEBOOK_BASE_URL = os.environ.get("FACEBOOK_BASE_URL", "https://terry-artlab.vercel.app")

PUBLISHED_CACHE = REPO_ROOT / ".social-published.json"

ALL_PLATFORMS = ["facebook", "threads", "linkedin", "x", "bluesky"]

# 토큰 만료 경고 임계값 (일)
TOKEN_WARN_DAYS = 45
TOKEN_EXPIRE_DAYS = 60


# ─── 토큰 만료 확인 ──────────────────────────────────────────────────────────

def check_token_expiry(platform: str, created_env: str) -> bool:
    """토큰 발급일 기준 만료 여부 확인. 건너뛰어야 하면 False 반환."""
    created_str = os.environ.get(created_env, "")
    if not created_str:
        return True  # 날짜 없으면 경고 없이 진행

    try:
        created = datetime.strptime(created_str, "%Y-%m-%d").date()
    except ValueError:
        print(f"  [WARNING] {created_env} 날짜 형식이 잘못됨 (YYYY-MM-DD 필요): {created_str}")
        return True

    elapsed = (date.today() - created).days
    if elapsed >= TOKEN_EXPIRE_DAYS:
        print(f"  [ERROR] {platform} 토큰 만료 — 발급 후 {elapsed}일 경과 (갱신 후 재실행)")
        return False
    if elapsed >= TOKEN_WARN_DAYS:
        remaining = TOKEN_EXPIRE_DAYS - elapsed
        print(f"  [WARNING] {platform} 토큰 만료 임박 ({remaining}일 남음 — 빠른 갱신 권장)")
    return True


# ─── Index / Cache ───────────────────────────────────────────────────────────

def load_published_cache() -> dict:
    """플랫폼별 발행 목록 로드. {platform: [slug, ...]}"""
    if PUBLISHED_CACHE.exists():
        with open(PUBLISHED_CACHE, encoding="utf-8") as f:
            data = json.load(f)
        # 구버전 호환 (단일 리스트인 경우)
        if isinstance(data, list):
            return {p: [] for p in ALL_PLATFORMS}
        return {p: data.get(p, []) for p in ALL_PLATFORMS}
    return {p: [] for p in ALL_PLATFORMS}


def save_published_cache(cache: dict):
    # set()으로 dedup 후 정렬 (중복 slug 저장 방지)
    data = {p: sorted(set(slugs)) for p, slugs in cache.items()}
    with open(PUBLISHED_CACHE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def find_target_post(posts: list, target_slug: "str | None", cache: dict, platforms: list) -> "dict | None":
    """발행 대상 포스트 반환. 플랫폼 중 하나라도 미발행이면 대상."""
    candidates = get_publishable_candidates(posts)
    if not candidates:
        return None

    if target_slug:
        post = find_post_by_slug(candidates, target_slug)
        if not post:
            print(f"Error: slug '{target_slug}'을 publishable 포스트에서 찾을 수 없습니다.", file=sys.stderr)
        return post

    # 플랫폼 중 하나라도 미발행인 포스트 필터
    def needs_publish(post):
        slug = post["slug"]
        return any(slug not in cache[p] for p in platforms)

    unpublished = [p for p in candidates if needs_publish(p)]
    if not unpublished:
        print("모든 publishable 포스트가 선택된 플랫폼에 이미 발행되었습니다.")
        return None

    return sort_by_published_at(unpublished)[0]


# ─── 포스트 콘텐츠 빌더 ──────────────────────────────────────────────────────

def extract_ai_summary(ai_summary) -> str:
    """ai_summary가 dict이면 one_liner 또는 problem+solution을 텍스트로 변환."""
    if not ai_summary:
        return ""
    if isinstance(ai_summary, str):
        return ai_summary
    if isinstance(ai_summary, dict):
        # one_liner 우선, 없으면 problem + solution 조합
        if ai_summary.get("one_liner"):
            return ai_summary["one_liner"]
        parts = []
        if ai_summary.get("problem"):
            parts.append(ai_summary["problem"])
        if ai_summary.get("solution"):
            parts.append(ai_summary["solution"])
        return " ".join(parts)
    return str(ai_summary)


def get_hashtags(post: dict, locale: str) -> str:
    """index.json display_tags 기반 해시태그 문자열."""
    tags = post.get("display_tags", [])
    if not tags:
        return ""
    return " ".join(f"#{t.replace(' ', '')}" for t in tags[:3])


def build_facebook_text(post: dict, fm: dict) -> tuple[str, str]:
    """(text, url)
    url은 Facebook link 파라미터용 — OG 태그가 직접 있는 언어 페이지를 사용.
    """
    title = fm.get("title") or post.get("title_ko", post["slug"])
    description = fm.get("summary") or fm.get("card_summary") or extract_ai_summary(post.get("ai_summary"))
    url = f"{FACEBOOK_BASE_URL}/ko/posts/{post['slug']}"
    tags = get_hashtags(post, "ko")

    lines = []
    if description:
        lines.append(description)
    if tags:
        lines.append("")
        lines.append(tags)

    return "\n".join(lines), url


def build_threads_text(post: dict, fm: dict) -> tuple[str, str]:
    """(text, url) — 500자 제한"""
    description = fm.get("summary") or fm.get("card_summary") or extract_ai_summary(post.get("ai_summary"))
    url = f"{FACEBOOK_BASE_URL}/posts/{post['slug']}?utm_source=threads&utm_medium=social"
    tags = get_hashtags(post, "ko")

    # URL은 link_attachment로 전달 — 텍스트에서 숨김
    read_more = "\n\nRead more ↓"
    tag_part = f"\n{tags}" if tags else ""
    suffix = read_more + tag_part

    # 500자 제한 — 설명 truncate
    body = description or ""

    max_body = 500 - len(suffix) - 2  # 여유 2자
    if len(body) > max_body:
        body = body[: max_body - 3] + "..."

    return body + suffix, url


def build_linkedin_text(post: dict, fm: dict) -> tuple[str, str]:
    """(text, url) — 3000자. URL은 ARTICLE 카드로 별도 첨부."""
    description = fm.get("summary") or fm.get("card_summary") or extract_ai_summary(post.get("ai_summary"))
    url = f"{SITE_BASE_URL}/posts/{post['slug']}"
    tags = get_hashtags(post, "en")

    lines = []
    if description:
        lines.append(description)
    if tags:
        lines.append("")
        lines.append(tags)

    return "\n".join(lines), url


def build_x_text(post: dict, fm: dict) -> tuple[str, str]:
    """(text, url) — 280자 (URL은 23자로 계산)"""
    description = fm.get("summary") or fm.get("card_summary") or extract_ai_summary(post.get("ai_summary"))
    # X 카드 크롤러 캐시 우회를 위해 타임스탬프 쿼리 추가
    cache_bust = date.today().strftime("%Y%m%d")
    url = f"{SITE_BASE_URL}/posts/{post['slug']}?v={cache_bust}"
    tags = get_hashtags(post, "en")

    # URL은 Twitter t.co로 23자 고정, 해시태그 포함 후 설명 truncate
    tag_part = f"\n{tags}" if tags else ""
    suffix = f"\n\nRead more ↓\n{url}" + tag_part

    url_char_count = 23  # t.co URL 고정 길이
    suffix_count = 14 + url_char_count + len(tag_part)  # "\n\nRead more ↓\n" + url + tags
    max_desc = 280 - suffix_count - 5  # 5자 안전 마진 (weighted count 경계 방지)

    body = description or ""
    if len(body) > max_desc:
        body = body[: max_desc - 3] + "..."

    return body + suffix, url


def build_bluesky_text(post: dict, fm: dict) -> tuple[str, str]:
    """(text, url) — 300 grapheme 제한. URL은 external embed로 별도 첨부."""
    description = fm.get("summary") or fm.get("card_summary") or extract_ai_summary(post.get("ai_summary"))
    url = f"{SITE_BASE_URL}/posts/{post['slug']}"
    tags = get_hashtags(post, "en")

    # URL은 external embed로 전달 — 텍스트에 포함하지 않음
    tag_part = f"\n\n{tags}" if tags else ""
    suffix = "\n\nRead more ↓" + tag_part

    max_desc = 300 - len(suffix) - 5  # 안전 마진
    body = description or ""
    if len(body) > max_desc:
        body = body[: max_desc - 3] + "..."

    return body + suffix, url


# ─── Facebook API ────────────────────────────────────────────────────────────

def publish_facebook(text: str, url: str, dry_run: bool, image_url: str = "") -> bool:
    page_id = os.environ.get("FACEBOOK_PAGE_ID", "")
    token = os.environ.get("FACEBOOK_PAGE_ACCESS_TOKEN", "")

    if dry_run:
        print(f"\n[DRY RUN] Facebook Page")
        print(f"  PAGE_ID : {page_id or '(미설정)'}")
        print(f"  Text    :\n{text}\n")
        if image_url:
            print(f"  Image   : {image_url}")
        return True

    if not page_id or not token:
        print("  [SKIP] FACEBOOK_PAGE_ID 또는 FACEBOOK_PAGE_ACCESS_TOKEN 미설정")
        return False

    if image_url:
        # 이미지가 있으면 /photos 엔드포인트 사용 (이미지 + 텍스트)
        resp = requests.post(
            f"https://graph.facebook.com/v20.0/{page_id}/photos",
            data={"message": text, "url": image_url, "access_token": token},
            timeout=30,
        )
    else:
        resp = requests.post(
            f"https://graph.facebook.com/v20.0/{page_id}/feed",
            data={"message": text, "link": url, "access_token": token},
            timeout=20,
        )
    if resp.status_code == 200:
        post_id = resp.json().get("id", "?")
        # permalink_url을 API로 직접 조회
        pl_resp = requests.get(
            f"https://graph.facebook.com/v20.0/{post_id}",
            params={"fields": "permalink_url", "access_token": token},
            timeout=10,
        )
        permalink = pl_resp.json().get("permalink_url", "") if pl_resp.status_code == 200 else ""
        print(f"  ✓ Facebook 게시 완료 (post_id={post_id})")
        if permalink:
            print(f"  ✓ Facebook URL: {permalink}")
        return True
    else:
        print(f"  ✗ Facebook 실패 ({resp.status_code}): {resp.text[:300]}", file=sys.stderr)
        return False


# ─── Threads API ─────────────────────────────────────────────────────────────

def publish_threads(text: str, url: str, dry_run: bool, image_url: str = "") -> bool:
    token = os.environ.get("THREADS_ACCESS_TOKEN", "")
    user_id = os.environ.get("THREADS_USER_ID", "")

    if dry_run:
        print(f"\n[DRY RUN] Threads")
        print(f"  USER_ID : {user_id or '(미설정)'}")
        print(f"  Text    :\n{text}\n")
        print(f"  Link    : {url}")
        if image_url:
            print(f"  Image   : {image_url}")
        return True

    if not check_token_expiry("Threads", "THREADS_TOKEN_CREATED"):
        return False

    if not token or not user_id:
        print("  [SKIP] THREADS_ACCESS_TOKEN 또는 THREADS_USER_ID 미설정")
        return False

    base = f"https://graph.threads.net/v1.0/{user_id}"
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: 미디어 컨테이너 생성
    if image_url:
        container_data = {"media_type": "IMAGE", "text": text, "image_url": image_url}
    else:
        container_data = {"media_type": "TEXT", "text": text, "link_attachment": url}
    resp1 = requests.post(
        f"{base}/threads",
        json=container_data,
        headers=headers,
        timeout=20,
    )
    if resp1.status_code not in (200, 201):
        print(f"  ✗ Threads 컨테이너 생성 실패 ({resp1.status_code}): {resp1.text[:300]}", file=sys.stderr)
        return False

    creation_id = resp1.json().get("id")
    if not creation_id:
        print(f"  ✗ Threads creation_id 없음: {resp1.text[:300]}", file=sys.stderr)
        return False

    # Step 2: 게시
    resp2 = requests.post(
        f"{base}/threads_publish",
        json={"creation_id": creation_id},
        headers=headers,
        timeout=20,
    )
    if resp2.status_code in (200, 201):
        thread_id = resp2.json().get("id", "?")
        print(f"  ✓ Threads 게시 완료 (id={thread_id})")
        # permalink 조회
        pl_resp = requests.get(
            f"https://graph.threads.net/v1.0/{thread_id}",
            params={"fields": "permalink", "access_token": token},
            timeout=10,
        )
        permalink = pl_resp.json().get("permalink", "") if pl_resp.status_code == 200 else ""
        if permalink:
            print(f"  ✓ Threads URL: {permalink}")
        return True
    else:
        print(f"  ✗ Threads 게시 실패 ({resp2.status_code}): {resp2.text[:300]}", file=sys.stderr)
        return False


# ─── LinkedIn API ────────────────────────────────────────────────────────────

def _upload_linkedin_image(token: str, person_urn: str, image_url: str) -> "str | None":
    """이미지 URL → LinkedIn 이미지 업로드 → asset URN 반환."""
    # Step 1: 업로드 등록
    register_payload = {
        "registerUploadRequest": {
            "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
            "owner": person_urn,
            "serviceRelationships": [
                {"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}
            ],
        }
    }
    reg_resp = requests.post(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        json=register_payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=20,
    )
    if reg_resp.status_code not in (200, 201):
        print(f"  [WARNING] LinkedIn 이미지 등록 실패 ({reg_resp.status_code}): {reg_resp.text[:200]}")
        return None

    reg_data = reg_resp.json().get("value", {})
    upload_url = reg_data.get("uploadMechanism", {}).get(
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest", {}
    ).get("uploadUrl", "")
    asset = reg_data.get("asset", "")

    if not upload_url or not asset:
        print(f"  [WARNING] LinkedIn 업로드 URL/asset 없음")
        return None

    # Step 2: 이미지 다운로드
    try:
        img_resp = requests.get(image_url, timeout=20)
        if img_resp.status_code != 200:
            print(f"  [WARNING] 이미지 다운로드 실패 ({img_resp.status_code})")
            return None
    except Exception as e:
        print(f"  [WARNING] 이미지 다운로드 실패: {e}")
        return None

    # Step 3: 이미지 업로드
    up_resp = requests.put(
        upload_url,
        data=img_resp.content,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": img_resp.headers.get("Content-Type", "image/png"),
        },
        timeout=30,
    )
    if up_resp.status_code not in (200, 201):
        print(f"  [WARNING] LinkedIn 이미지 업로드 실패 ({up_resp.status_code}): {up_resp.text[:200]}")
        return None

    return asset


def publish_linkedin(text: str, url: str, dry_run: bool, image_url: str = "") -> bool:
    token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "")
    person_urn = os.environ.get("LINKEDIN_PERSON_URN", "")

    if dry_run:
        print(f"\n[DRY RUN] LinkedIn")
        print(f"  URN     : {person_urn or '(미설정)'}")
        print(f"  Text    :\n{text}\n")
        print(f"  Link    : {url}")
        if image_url:
            print(f"  Image   : {image_url}")
        return True

    if not check_token_expiry("LinkedIn", "LINKEDIN_TOKEN_CREATED"):
        return False

    if not token or not person_urn:
        print("  [SKIP] LINKEDIN_ACCESS_TOKEN 또는 LINKEDIN_PERSON_URN 미설정")
        return False

    # 이미지가 있으면 IMAGE 카테고리로 포스팅
    media_category = "ARTICLE"
    media_entry = {"status": "READY", "originalUrl": url}

    if image_url:
        print(f"  LinkedIn 이미지 업로드 중...")
        asset = _upload_linkedin_image(token, person_urn, image_url)
        if asset:
            media_category = "IMAGE"
            media_entry = {
                "status": "READY",
                "media": asset,
                "description": {"text": url},
            }

    payload = {
        "author": person_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": media_category,
                "media": [media_entry],
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    resp = requests.post(
        "https://api.linkedin.com/v2/ugcPosts",
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
        },
        timeout=20,
    )
    if resp.status_code in (200, 201):
        post_id = resp.headers.get("x-restli-id", "?")
        print(f"  ✓ LinkedIn 게시 완료 (id={post_id})")
        return True
    else:
        print(f"  ✗ LinkedIn 실패 ({resp.status_code}): {resp.text[:300]}", file=sys.stderr)
        return False


# ─── X (Twitter) API ────────────────────────────────────────────────────────

def _upload_x_media(auth, image_url: str) -> "str | None":
    """이미지 URL → X 미디어 업로드 → media_id 반환."""
    try:
        img_resp = requests.get(image_url, timeout=20)
        if img_resp.status_code != 200:
            print(f"  [WARNING] 이미지 다운로드 실패 ({img_resp.status_code})")
            return None
    except Exception as e:
        print(f"  [WARNING] 이미지 다운로드 실패: {e}")
        return None

    import base64
    media_data = base64.b64encode(img_resp.content).decode("utf-8")
    content_type = img_resp.headers.get("Content-Type", "image/png")

    resp = requests.post(
        "https://upload.twitter.com/1.1/media/upload.json",
        data={"media_data": media_data},
        auth=auth,
        timeout=30,
    )
    if resp.status_code in (200, 201, 202):
        media_id = resp.json().get("media_id_string")
        return media_id
    else:
        print(f"  [WARNING] X 미디어 업로드 실패 ({resp.status_code}): {resp.text[:200]}")
        return None


def publish_x(text: str, dry_run: bool, image_url: str = "") -> bool:
    api_key = os.environ.get("X_API_KEY", "")
    api_secret = os.environ.get("X_API_SECRET", "")
    access_token = os.environ.get("X_ACCESS_TOKEN", "")
    access_secret = os.environ.get("X_ACCESS_TOKEN_SECRET", "")

    if dry_run:
        print(f"\n[DRY RUN] X (Twitter)")
        print(f"  API_KEY : {api_key[:8] + '...' if api_key else '(미설정)'}")
        print(f"  Text    :\n{text}\n")
        if image_url:
            print(f"  Image   : {image_url}")
        return True

    if not all([api_key, api_secret, access_token, access_secret]):
        print("  [SKIP] X OAuth 1.0a 환경변수 미설정 (X_API_KEY/SECRET, X_ACCESS_TOKEN/SECRET)")
        return False

    try:
        from requests_oauthlib import OAuth1
    except ImportError:
        print("  ✗ requests-oauthlib 패키지 필요: pip install requests-oauthlib", file=sys.stderr)
        return False

    auth = OAuth1(api_key, api_secret, access_token, access_secret)

    tweet_payload = {"text": text}
    if image_url:
        print(f"  X 이미지 업로드 중...")
        media_id = _upload_x_media(auth, image_url)
        if media_id:
            tweet_payload["media"] = {"media_ids": [media_id]}

    resp = requests.post(
        "https://api.twitter.com/2/tweets",
        json=tweet_payload,
        auth=auth,
        headers={"Content-Type": "application/json"},
        timeout=20,
    )
    if resp.status_code in (200, 201):
        tweet_id = resp.json().get("data", {}).get("id", "?")
        print(f"  ✓ X(Twitter) 게시 완료 (tweet_id={tweet_id})")
        return True
    else:
        print(f"  ✗ X 실패 ({resp.status_code}): {resp.text[:300]}", file=sys.stderr)
        return False


# ─── Bluesky (AT Protocol) API ──────────────────────────────────────────────

def _build_bluesky_facets(text: str) -> list:
    """해시태그에 대한 Bluesky rich text facets 생성 (UTF-8 바이트 오프셋 기반)."""
    facets = []
    for match in re.finditer(r"#(\w+)", text):
        tag = match.group(1)
        byte_start = len(text[: match.start()].encode("utf-8"))
        byte_end = len(text[: match.end()].encode("utf-8"))
        facets.append({
            "index": {"byteStart": byte_start, "byteEnd": byte_end},
            "features": [{"$type": "app.bsky.richtext.facet#tag", "tag": tag}],
        })
    return facets


def _fetch_og_tags(url: str) -> dict:
    """URL에서 OG 태그(title, description, image)를 파싱."""
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "bot"})
        html = resp.text
    except Exception as e:
        print(f"  [WARNING] OG 태그 fetch 실패: {e}")
        return {}

    import html as html_mod

    tags = {}
    for match in re.finditer(r'<meta\s+(?:property|name)=["\']og:(\w+)["\']\s+content=["\']([^"\']*)["\']', html):
        tags[match.group(1)] = html_mod.unescape(match.group(2))
    # 역순 속성도 매칭 (content가 먼저 오는 경우)
    for match in re.finditer(r'<meta\s+content=["\']([^"\']*?)["\']\s+(?:property|name)=["\']og:(\w+)["\']', html):
        tags.setdefault(match.group(2), html_mod.unescape(match.group(1)))
    return tags


def _upload_bluesky_blob(image_url: str, access_token: str) -> "dict | None":
    """이미지 URL을 다운로드 → Bluesky blob으로 업로드, blob ref 반환."""
    try:
        img_resp = requests.get(image_url, timeout=20)
        if img_resp.status_code != 200:
            print(f"  [WARNING] OG 이미지 다운로드 실패 ({img_resp.status_code})")
            return None
    except Exception as e:
        print(f"  [WARNING] OG 이미지 다운로드 실패: {e}")
        return None

    content_type = img_resp.headers.get("Content-Type", "image/png")
    blob_resp = requests.post(
        "https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
        data=img_resp.content,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": content_type,
        },
        timeout=30,
    )
    if blob_resp.status_code == 200:
        return blob_resp.json().get("blob")
    else:
        print(f"  [WARNING] Bluesky blob 업로드 실패 ({blob_resp.status_code}): {blob_resp.text[:200]}")
        return None


def publish_bluesky(text: str, url: str, dry_run: bool, image_url: str = "") -> bool:
    identifier = os.environ.get("BLUESKY_IDENTIFIER", "")
    app_password = os.environ.get("BLUESKY_APP_PASSWORD", "")

    if dry_run:
        print(f"\n[DRY RUN] Bluesky")
        print(f"  HANDLE  : {identifier or '(미설정)'}")
        print(f"  Text    :\n{text}\n")
        print(f"  Link    : {url}")
        if image_url:
            print(f"  Image   : {image_url}")
        return True

    if not identifier or not app_password:
        print("  [SKIP] BLUESKY_IDENTIFIER 또는 BLUESKY_APP_PASSWORD 미설정")
        return False

    # Step 1: 세션 생성
    session_resp = requests.post(
        "https://bsky.social/xrpc/com.atproto.server.createSession",
        json={"identifier": identifier, "password": app_password},
        timeout=20,
    )
    if session_resp.status_code != 200:
        print(f"  ✗ Bluesky 세션 생성 실패 ({session_resp.status_code}): {session_resp.text[:300]}", file=sys.stderr)
        return False

    session = session_resp.json()
    access_token = session["accessJwt"]
    did = session["did"]

    # Step 2: 이미지 blob 업로드
    # 직접 image_url이 주어진 경우 우선 사용, 없으면 OG 태그에서 가져옴
    target_image = image_url
    if not target_image:
        og = _fetch_og_tags(url)
        target_image = og.get("image", "")
    else:
        og = {}

    og_title = og.get("title", "")
    og_desc = og.get("description", "")

    thumb_blob = None
    if target_image:
        print(f"  이미지 업로드 중: {target_image}")
        thumb_blob = _upload_bluesky_blob(target_image, access_token)

    # Step 3: facets + record 구성
    facets = _build_bluesky_facets(text)
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")

    record = {
        "$type": "app.bsky.feed.post",
        "text": text,
        "createdAt": now,
    }
    if facets:
        record["facets"] = facets

    # 이미지가 있으면 이미지 embed, 없으면 external link embed
    if thumb_blob and image_url:
        record["embed"] = {
            "$type": "app.bsky.embed.images",
            "images": [{"alt": og_title or text[:100], "image": thumb_blob}],
        }
    else:
        external = {
            "uri": url,
            "title": og_title,
            "description": og_desc,
        }
        if thumb_blob:
            external["thumb"] = thumb_blob
        record["embed"] = {
            "$type": "app.bsky.embed.external",
            "external": external,
        }

    # Step 4: 포스트 생성
    resp = requests.post(
        "https://bsky.social/xrpc/com.atproto.repo.createRecord",
        json={
            "repo": did,
            "collection": "app.bsky.feed.post",
            "record": record,
        },
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        timeout=20,
    )
    if resp.status_code == 200:
        rkey = resp.json().get("uri", "").split("/")[-1]
        post_url = f"https://bsky.app/profile/{identifier}/post/{rkey}"
        print(f"  ✓ Bluesky 게시 완료 (rkey={rkey})")
        print(f"  ✓ Bluesky URL: {post_url}")
        return True
    else:
        print(f"  ✗ Bluesky 실패 ({resp.status_code}): {resp.text[:300]}", file=sys.stderr)
        return False


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="소셜미디어 자동 공유")
    parser.add_argument("--dry-run", action="store_true", help="실제 발행 없이 출력만")
    parser.add_argument("--slug", help="특정 포스트 slug (기본: 최신 미발행)")
    parser.add_argument(
        "--platform",
        default=",".join(ALL_PLATFORMS),
        help="플랫폼 (facebook,threads,linkedin,x — 기본: 전체)",
    )
    args = parser.parse_args()

    platforms = [p.strip() for p in args.platform.split(",") if p.strip() in ALL_PLATFORMS]
    if not platforms:
        print(f"Error: 유효한 플랫폼이 없습니다. 가능한 값: {', '.join(ALL_PLATFORMS)}", file=sys.stderr)
        sys.exit(1)

    print(f"대상 플랫폼: {', '.join(platforms)}")

    index = load_index()
    posts = index.get("posts", [])
    cache = load_published_cache()

    post = find_target_post(posts, args.slug, cache, platforms)
    if not post:
        sys.exit(0)

    slug = post["slug"]
    content_type = post["content_type"]
    print(f"\n대상 포스트: [{content_type}] {slug}")

    # frontmatter를 1회만 읽어 각 builder에 전달
    fm_ko = read_mdx_frontmatter(slug, content_type, "ko")
    fm_en = read_mdx_frontmatter(slug, content_type, "en")

    results: dict[str, bool] = {}

    for platform in platforms:
        already = cache[platform]
        if not args.slug and slug in already:
            print(f"\n[{platform.upper()}] 이미 발행됨 — 건너뜀")
            results[platform] = True  # 이미 완료 = 성공으로 처리
            continue

        print(f"\n[{platform.upper()}]")

        if platform == "facebook":
            text, url = build_facebook_text(post, fm_ko)
            ok = publish_facebook(text, url, args.dry_run)

        elif platform == "threads":
            text, url = build_threads_text(post, fm_ko)
            ok = publish_threads(text, url, args.dry_run)

        elif platform == "linkedin":
            text, url = build_linkedin_text(post, fm_en)
            ok = publish_linkedin(text, url, args.dry_run)

        elif platform == "x":
            text, url = build_x_text(post, fm_en)
            ok = publish_x(text, args.dry_run)

        elif platform == "bluesky":
            text, url = build_bluesky_text(post, fm_en)
            ok = publish_bluesky(text, url, args.dry_run)

        else:
            ok = False

        results[platform] = ok

        if not args.dry_run and ok:
            cache[platform].append(slug)

    # 캐시 저장 (dry_run 제외)
    if not args.dry_run:
        success_count = sum(1 for ok in results.values() if ok)
        if success_count > 0:
            save_published_cache(cache)
            print(f"\n캐시 저장: {slug} ({success_count}/{len(platforms)} 플랫폼 성공)")

    # 결과 요약
    print("\n─── 결과 요약 ───")
    for platform, ok in results.items():
        status = "✓ 완료" if ok else "✗ 실패"
        print(f"  {platform:10s} : {status}")

    failed = [p for p, ok in results.items() if not ok]
    if failed:
        print(f"\n실패 플랫폼: {', '.join(failed)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
