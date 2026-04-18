#!/usr/bin/env python3
"""
Substack 자동 티저 포스팅 스크립트.

posts/index.json에서 가장 최근 essays|tech 포스트를 찾아
EN/KO Substack Publication에 티저 + 홈페이지 링크를 포스팅한다.

사용법:
    python scripts/publish-substack.py [--dry-run] [--slug=<slug>]

환경변수 (.env.local):
    SUBSTACK_COOKIE                 substack.sid 쿠키값
                                    Chrome → F12 → Application → Cookies → substack.com → substack.sid
    NEXT_PUBLIC_SUBSTACK_EN_URL     영어 Substack URL (예: https://terry-en.substack.com)
    NEXT_PUBLIC_SUBSTACK_KO_URL     한국어 Substack URL (예: https://terry-ko.substack.com)
    SITE_BASE_URL                   홈페이지 베이스 URL (기본: https://www.terryum.ai)
"""
# social_common 임포트가 UTF-8 설정 + dotenv 로드를 처리함
from social_common import (
    REPO_ROOT, POSTS_DIR, INDEX_PATH, PUBLISHABLE_TYPES,
    load_index, read_mdx_frontmatter,
    get_publishable_candidates, find_post_by_slug, sort_by_published_at,
)

import os
import sys
import json
import argparse
from pathlib import Path

import requests

SITE_BASE_URL = os.environ.get("SITE_BASE_URL", "https://www.terryum.ai")
SUBSTACK_COOKIE = os.environ.get("SUBSTACK_COOKIE", "")
SUBSTACK_EN_URL = os.environ.get("NEXT_PUBLIC_SUBSTACK_EN_URL", "")
SUBSTACK_KO_URL = os.environ.get("NEXT_PUBLIC_SUBSTACK_KO_URL", "")

PUBLISHED_CACHE = REPO_ROOT / ".substack-published.json"


# ─── Cache ───────────────────────────────────────────────────────────────────

def load_published_cache() -> dict:
    """{ slug: {"en": bool, "ko": bool} } 구조 반환."""
    if PUBLISHED_CACHE.exists():
        with open(PUBLISHED_CACHE, encoding="utf-8") as f:
            data = json.load(f)
        # 구버전 호환 (list → dict 변환)
        if isinstance(data.get("published"), list):
            return {s: {"en": True, "ko": True} for s in data["published"]}
        return data.get("published", {})
    return {}


def save_published_cache(published: dict):
    data = {"published": published}
    with open(PUBLISHED_CACHE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def find_target_post(posts: list, target_slug: "str | None", already_published: dict) -> "dict | None":
    candidates = get_publishable_candidates(posts)
    if not candidates:
        return None
    if target_slug:
        post = find_post_by_slug(candidates, target_slug)
        if not post:
            print(f"Error: slug '{target_slug}' not found in publishable posts.", file=sys.stderr)
        return post
    unpublished = [p for p in candidates if p["slug"] not in already_published]
    if not unpublished:
        print("모든 publishable 포스트가 이미 발행되었습니다.")
        return None
    return sort_by_published_at(unpublished)[0]


def find_cover_image(post: dict) -> "Path | None":
    """포스트의 커버 이미지 경로 반환. 없으면 None."""
    post_dir = POSTS_DIR / post["content_type"] / post["slug"]
    for ext in ["webp", "jpg", "jpeg", "png"]:
        p = post_dir / f"cover.{ext}"
        if p.exists():
            return p
    return None


# ─── Body builders ──────────────────────────────────────────────────────────

def to_prosemirror(
    paragraphs: list[str],
    link: str,
    cta: str,
    image_url: "str | None" = None,
) -> str:
    """텍스트 문단 목록 → Substack draft_body (ProseMirror JSON 문자열).

    주의: button 노드를 사용하면 Substack이 네이티브 구독 위젯을 제거한다.
    CTA는 링크 텍스트 문단으로 처리해야 구독 위젯이 유지된다.
    """
    content = []

    # 커버 이미지 (본문 최상단 — 타임라인 썸네일로 자동 사용)
    if image_url:
        content.append({
            "type": "image",
            "attrs": {
                "src": image_url,
                "alt": None,
                "title": None,
                "fullscreen": False,
                "imageSize": "normal",
                "height": None,
                "width": None,
                "resizeWidth": None,
                "bytes": None,
                "href": None,
                "captionVisible": False,
                "caption": None,
                "belowTheFold": False,
                "isProcessing": False,
                "align": "center",
                "exposeToMetadata": True,
            },
        })
        # 이미지 뒤 빈 줄
        content.append({"type": "paragraph", "content": []})

    # 본문 문단
    for p in paragraphs:
        if p:
            content.append({"type": "paragraph", "content": [{"type": "text", "text": p}]})

    # CTA 앞 빈 줄 2개
    content.append({"type": "paragraph", "content": []})
    content.append({"type": "paragraph", "content": []})

    # 전체 글 읽기 CTA — 링크 텍스트 문단 (button 노드 사용 시 구독 위젯 사라짐)
    content.append({
        "type": "paragraph",
        "attrs": {"textAlign": "center"},
        "content": [{
            "type": "text",
            "text": f"{cta} →",
            "marks": [{
                "type": "link",
                "attrs": {
                    "href": link,
                    "target": "_blank",
                    "rel": "noopener noreferrer nofollow",
                    "class": None,
                },
            }],
        }],
    })
    # CTA 뒤 빈 줄 2개 (구독 위젯과 간격 확보)
    content.append({"type": "paragraph", "content": []})
    content.append({"type": "paragraph", "content": []})

    return json.dumps({"type": "doc", "content": content})


def build_en_post(post: dict, fm: dict) -> tuple[str, str, list[str], str]:
    """(title, subtitle, paragraphs, link)"""
    title = fm.get("title") or post.get("title_en", post["slug"])
    summary = fm.get("summary", "")
    card_summary = fm.get("card_summary", "")
    # 부제: frontmatter subtitle 우선, 없으면 card_summary, 없으면 summary 앞 80자
    subtitle = (fm.get("subtitle") or card_summary or summary[:80]).strip()
    paragraphs = [p for p in [summary, card_summary] if p]
    link = f"{SITE_BASE_URL}/en/posts/{post['slug']}"
    return title, subtitle, paragraphs, link


def build_ko_post(post: dict, fm: dict) -> tuple[str, str, list[str], str]:
    """(title, subtitle, paragraphs, link)"""
    title = fm.get("title") or post.get("title_ko", post["slug"])
    summary = fm.get("summary", "")
    card_summary = fm.get("card_summary", "")
    # 부제: frontmatter subtitle 우선, 없으면 card_summary, 없으면 summary 앞 80자
    subtitle = (fm.get("subtitle") or card_summary or summary[:80]).strip()
    paragraphs = [p for p in [summary, card_summary] if p]
    link = f"{SITE_BASE_URL}/ko/posts/{post['slug']}"
    return title, subtitle, paragraphs, link


def copy_cover_to_public(post: dict, cover_path: Path) -> "str | None":
    """커버 이미지를 public/posts/{slug}/ 에 복사하고 공개 URL 반환."""
    slug = post["slug"]
    dest_dir = REPO_ROOT / "public" / "posts" / slug
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / cover_path.name
    import shutil
    shutil.copy2(cover_path, dest)
    url = f"{SITE_BASE_URL}/posts/{slug}/{cover_path.name}"
    print(f"  ✓ 커버 이미지 public 복사 완료: /posts/{slug}/{cover_path.name}")
    return url


# ─── Substack API ───────────────────────────────────────────────────────────

def get_subdomain(url: str) -> str:
    url = url.rstrip("/")
    host = url.replace("https://", "").replace("http://", "")
    return host.split(".")[0]


class SubstackClient:
    BASE = "https://substack.com"

    def __init__(self, cookie: str):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": "https://substack.com",
        })
        # substack.sid를 .substack.com 전체 도메인에 설정
        self.session.cookies.set("substack.sid", cookie, domain=".substack.com")
        # 인증 확인 + user_id 저장 (draft_bylines에 필요)
        resp = self.session.get(f"{self.BASE}/api/v1/user/profile/self", timeout=15)
        if resp.status_code != 200:
            raise RuntimeError(f"쿠키 인증 실패 ({resp.status_code}) — 쿠키가 만료됐거나 잘못됐습니다.")
        profile = resp.json()
        self.user_id = profile.get("id")
        name = profile.get("name", "unknown")
        print(f"  ✓ 인증 성공 (user: {name}, id: {self.user_id})")

    def create_and_publish(
        self,
        subdomain: str,
        title: str,
        subtitle: str,
        paragraphs: list[str],
        link: str,
        cta: str,
        image_url: "str | None",
        note_intro: "str | None",
    ) -> bool:
        pub_base = f"https://{subdomain}.substack.com"

        # 0) publication 방문 → 서브도메인 쿠키/CSRF 획득
        self.session.get(f"{pub_base}/publish/posts", timeout=15)
        csrf = (
            self.session.cookies.get("csrf-token", domain=f"{subdomain}.substack.com")
            or self.session.cookies.get("csrf-token")
            or self.session.headers.get("X-CSRFToken", "")
        )
        if csrf:
            self.session.headers["X-CSRFToken"] = csrf

        # 1) ProseMirror 본문 빌드 (button 노드 없음 → 구독 위젯 자동 추가됨)
        body = to_prosemirror(paragraphs, link, cta, image_url)

        # 3) 드래프트 생성
        draft_resp = self.session.post(
            f"{pub_base}/api/v1/drafts",
            json={
                "draft_title": title,
                "draft_subtitle": subtitle,
                "draft_body": body,
                "draft_bylines": [{"id": self.user_id, "is_guest": False}],
                "draft_podcast_url": "",
                "draft_podcast_duration": None,
                "draft_video_upload_id": None,
                "draft_podcast_upload_id": None,
                "draft_podcast_preview_upload_id": None,
                "audience": "everyone",
                "section_chosen": False,
            },
            timeout=15,
        )
        if draft_resp.status_code not in (200, 201):
            raise RuntimeError(f"드래프트 생성 실패 ({draft_resp.status_code}): {draft_resp.text[:200]}")

        draft_id = draft_resp.json()["id"]
        print(f"  ✓ 드래프트 생성됨 (id={draft_id})")

        # 4) 발행 (note_intro → 타임라인 Note 1줄 소개)
        publish_payload: dict = {"send_email": True, "share_automatically": True}
        if note_intro:
            publish_payload["note_body"] = note_intro  # 지원 여부는 Substack API에 따라 다름
        pub_resp = self.session.post(
            f"{pub_base}/api/v1/drafts/{draft_id}/publish",
            json=publish_payload,
            timeout=15,
        )
        if pub_resp.status_code not in (200, 201):
            raise RuntimeError(f"발행 실패 ({pub_resp.status_code}): {pub_resp.text[:200]}")

        print(f"  ✓ 발행 완료: {pub_base}/p/{draft_id}")
        return True


def publish_post(
    client: "SubstackClient | None",
    subdomain: str,
    title: str,
    subtitle: str,
    paragraphs: list[str],
    link: str,
    cta: str,
    image_url: "str | None",
    note_intro: "str | None",
    dry_run: bool,
) -> bool:
    if dry_run:
        body_preview = to_prosemirror(paragraphs, link, cta, image_url)
        print(f"\n[DRY RUN] subdomain={subdomain}.substack.com")
        print(f"  Title    : {title}")
        print(f"  Subtitle : {subtitle}")
        print(f"  Note     : {note_intro}")
        print(f"  Image    : {image_url}")
        print(f"  Body     : {body_preview}\n")
        return True
    try:
        return client.create_and_publish(
            subdomain, title, subtitle, paragraphs, link,
            cta, image_url, note_intro,
        )
    except Exception as e:
        print(f"  ✗ 실패 ({subdomain}): {e}", file=sys.stderr)
        return False


# ─── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Substack 티저 자동 포스팅")
    parser.add_argument("--dry-run", action="store_true", help="실제 발행 없이 출력만")
    parser.add_argument("--slug", help="특정 포스트 slug 지정 (기본: 최신 미발행)")
    args = parser.parse_args()

    if not args.dry_run:
        if not SUBSTACK_COOKIE:
            print("Error: .env.local에 SUBSTACK_COOKIE를 설정하세요.", file=sys.stderr)
            print("  Chrome -> F12 -> Application -> Cookies -> substack.com -> substack.sid", file=sys.stderr)
            sys.exit(1)

    if not SUBSTACK_EN_URL and not SUBSTACK_KO_URL:
        print("Error: NEXT_PUBLIC_SUBSTACK_EN_URL 또는 NEXT_PUBLIC_SUBSTACK_KO_URL이 필요합니다.", file=sys.stderr)
        sys.exit(1)

    index = load_index()
    posts = index.get("posts", [])
    already_published = load_published_cache()

    post = find_target_post(posts, args.slug, already_published)
    if not post:
        sys.exit(0)

    slug = post["slug"]
    content_type = post["content_type"]
    print(f"\n대상 포스트: [{content_type}] {slug}")

    # frontmatter를 1회만 읽어 각 builder에 전달
    fm_en = read_mdx_frontmatter(slug, content_type, "en")
    fm_ko = read_mdx_frontmatter(slug, content_type, "ko")

    en_title, en_subtitle, en_paragraphs, en_link = build_en_post(post, fm_en)
    ko_title, ko_subtitle, ko_paragraphs, ko_link = build_ko_post(post, fm_ko)
    cover_path = find_cover_image(post)

    # 커버 이미지를 public/posts/에 복사 → 공개 URL로 Substack 이미지 노드에 삽입
    image_url: "str | None" = None
    if cover_path:
        print(f"  커버 이미지: {cover_path.name}")
        if not args.dry_run:
            image_url = copy_cover_to_public(post, cover_path)
        else:
            image_url = f"{SITE_BASE_URL}/posts/{slug}/{cover_path.name}"
    else:
        print("  커버 이미지 없음")

    # 타임라인 1줄 소개 (EN/KO 각각)
    en_note_intro = f"New post: {en_title}" + (f" — {en_subtitle}" if en_subtitle else "")
    ko_note_intro = f"새 글: {ko_title}" + (f" — {ko_subtitle}" if ko_subtitle else "")

    client = None
    if not args.dry_run:
        client = SubstackClient(SUBSTACK_COOKIE)

    lang_cache = already_published.get(slug, {})
    en_ok = ko_ok = False

    if SUBSTACK_EN_URL:
        subdomain = get_subdomain(SUBSTACK_EN_URL)
        print(f"\n[EN] {subdomain}.substack.com")
        if lang_cache.get("en") and not args.dry_run:
            print(f"  ℹ️ 이미 발행됨 — 건너뜀 (재발행하려면 캐시에서 수동 삭제)")
            en_ok = True
        else:
            en_ok = publish_post(
                client, subdomain,
                en_title, en_subtitle, en_paragraphs, en_link,
                cta="Read the full article",
                image_url=image_url,
                note_intro=en_note_intro,
                dry_run=args.dry_run,
            )
    else:
        print("NEXT_PUBLIC_SUBSTACK_EN_URL 없음 — EN 발행 건너뜀")

    if SUBSTACK_KO_URL:
        subdomain = get_subdomain(SUBSTACK_KO_URL)
        print(f"\n[KO] {subdomain}.substack.com")
        if lang_cache.get("ko") and not args.dry_run:
            print(f"  ℹ️ 이미 발행됨 — 건너뜀 (재발행하려면 캐시에서 수동 삭제)")
            ko_ok = True
        else:
            ko_ok = publish_post(
                client, subdomain,
                ko_title, ko_subtitle, ko_paragraphs, ko_link,
                cta="전체 글 읽기",
                image_url=image_url,
                note_intro=ko_note_intro,
                dry_run=args.dry_run,
            )
    else:
        print("NEXT_PUBLIC_SUBSTACK_KO_URL 없음 — KO 발행 건너뜀")

    if not args.dry_run and (en_ok or ko_ok):
        already_published[slug] = {
            "en": lang_cache.get("en", False) or en_ok,
            "ko": lang_cache.get("ko", False) or ko_ok,
        }
        save_published_cache(already_published)
        print(f"\n캐시 저장: {slug} (en={already_published[slug]['en']}, ko={already_published[slug]['ko']})")


if __name__ == "__main__":
    main()
