#!/usr/bin/env python3
"""
Substack 자동 티저 포스팅 스크립트.

posts/index.json에서 가장 최근 essays|tech 포스트를 찾아
EN/KO Substack Publication에 티저 + 홈페이지 링크를 포스팅한다.

사용법:
    python scripts/publish-substack.py [--dry-run] [--slug=<slug>]

환경변수 (.env.local 또는 시스템 env):
    SUBSTACK_EMAIL                  Substack 계정 이메일
    SUBSTACK_PASSWORD               Substack 계정 비밀번호
    NEXT_PUBLIC_SUBSTACK_EN_URL     영어 Substack URL (예: https://terry-en.substack.com)
    NEXT_PUBLIC_SUBSTACK_KO_URL     한국어 Substack URL (예: https://terry-ko.substack.com)
    SITE_BASE_URL                   홈페이지 베이스 URL (기본: https://onthemanifold.com)
"""
import os
import sys
import json
import re
import argparse
from pathlib import Path

# .env.local 자동 로드 (python-dotenv)
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env.local"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[env] .env.local 로드됨")
except ImportError:
    pass  # dotenv 없어도 시스템 env로 동작

import requests

SITE_BASE_URL = os.environ.get("SITE_BASE_URL", "https://onthemanifold.com")
SUBSTACK_EMAIL = os.environ.get("SUBSTACK_EMAIL", "")
SUBSTACK_PASSWORD = os.environ.get("SUBSTACK_PASSWORD", "")
SUBSTACK_EN_URL = os.environ.get("NEXT_PUBLIC_SUBSTACK_EN_URL", "")
SUBSTACK_KO_URL = os.environ.get("NEXT_PUBLIC_SUBSTACK_KO_URL", "")

REPO_ROOT = Path(__file__).parent.parent
INDEX_PATH = REPO_ROOT / "posts" / "index.json"
POSTS_DIR = REPO_ROOT / "posts"
PUBLISHED_CACHE = REPO_ROOT / ".substack-published.json"

PUBLISHABLE_TYPES = {"essays", "tech"}


# ─── MDX Frontmatter ────────────────────────────────────────────────────────

def read_mdx_frontmatter(slug: str, content_type: str, locale: str) -> dict:
    """MDX 파일의 frontmatter를 파싱해 dict 반환."""
    mdx_path = POSTS_DIR / content_type / slug / f"{locale}.mdx"
    if not mdx_path.exists():
        return {}
    text = mdx_path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    result = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            result[key.strip()] = val.strip().strip('"')
    return result


# ─── Index ──────────────────────────────────────────────────────────────────

def load_index() -> dict:
    with open(INDEX_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_published_cache() -> set:
    if PUBLISHED_CACHE.exists():
        with open(PUBLISHED_CACHE, encoding="utf-8") as f:
            data = json.load(f)
        return set(data.get("published", []))
    return set()


def save_published_cache(published: set):
    data = {"published": sorted(published)}
    with open(PUBLISHED_CACHE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def find_target_post(posts: list, target_slug: str | None, already_published: set) -> dict | None:
    candidates = [p for p in posts if p.get("content_type") in PUBLISHABLE_TYPES]
    if not candidates:
        return None
    if target_slug:
        for p in candidates:
            if p["slug"] == target_slug:
                return p
        print(f"Error: slug '{target_slug}' not found in publishable posts.", file=sys.stderr)
        return None
    unpublished = [p for p in candidates if p["slug"] not in already_published]
    if not unpublished:
        print("모든 publishable 포스트가 이미 발행되었습니다.")
        return None
    unpublished.sort(key=lambda p: p.get("published_at", ""), reverse=True)
    return unpublished[0]


# ─── Body builders ──────────────────────────────────────────────────────────

def resolve_en(post: dict) -> tuple[str, str]:
    """(title, summary) — MDX frontmatter 우선, index.json fallback"""
    fm = read_mdx_frontmatter(post["slug"], post["content_type"], "en")
    title = fm.get("title") or post.get("title_en", post["slug"])
    summary = fm.get("summary") or fm.get("card_summary", "")
    if not summary:
        ai = post.get("ai_summary") or {}
        summary = ai.get("one_liner", "")
    return title, summary


def resolve_ko(post: dict) -> tuple[str, str]:
    """(title, summary) — MDX frontmatter 우선, index.json fallback"""
    fm = read_mdx_frontmatter(post["slug"], post["content_type"], "ko")
    title = fm.get("title") or post.get("title_ko", post["slug"])
    summary = fm.get("summary") or fm.get("card_summary", "")
    if not summary:
        ai = post.get("ai_summary") or {}
        summary = ai.get("one_liner", "")
    return title, summary


def build_en_post(post: dict) -> tuple[str, str]:
    title, summary = resolve_en(post)
    link = f"{SITE_BASE_URL}/en/{post['content_type']}/{post['slug']}"
    body = f"{summary}\n\nRead the full article →\n{link}" if summary else f"Read the full article →\n{link}"
    return title, body


def build_ko_post(post: dict) -> tuple[str, str]:
    title, summary = resolve_ko(post)
    link = f"{SITE_BASE_URL}/ko/{post['content_type']}/{post['slug']}"
    body = f"{summary}\n\n전체 글 읽기 →\n{link}" if summary else f"전체 글 읽기 →\n{link}"
    return title, body


# ─── Substack API ───────────────────────────────────────────────────────────

def get_subdomain(url: str) -> str:
    url = url.rstrip("/")
    host = url.replace("https://", "").replace("http://", "")
    return host.split(".")[0]


class SubstackClient:
    BASE = "https://substack.com"

    def __init__(self, email: str, password: str):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "Mozilla/5.0"})
        self._login(email, password)

    def _login(self, email: str, password: str):
        resp = self.session.post(
            f"{self.BASE}/api/v1/email-login",
            json={"email": email, "password": password, "captcha_response": None},
            timeout=15,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Substack 로그인 실패 ({resp.status_code}): {resp.text[:200]}")
        print("  ✓ Substack 로그인 성공")

    def create_and_publish(self, subdomain: str, title: str, body: str) -> bool:
        pub_base = f"https://{subdomain}.substack.com"

        # 1) 드래프트 생성
        draft_resp = self.session.post(
            f"{pub_base}/api/v1/drafts",
            json={
                "draft_title": title,
                "draft_subtitle": "",
                "draft_body": json.dumps([{"type": "paragraph", "content": [{"type": "text", "text": body}]}]),
                "draft_podcast_url": "",
                "draft_podcast_duration": None,
                "draft_video_upload_id": None,
                "draft_podcast_upload_id": None,
                "draft_podcast_preview_upload_id": None,
                "draft_cover_image": None,
                "audience": "everyone",
                "section_chosen": False,
            },
            timeout=15,
        )
        if draft_resp.status_code not in (200, 201):
            raise RuntimeError(f"드래프트 생성 실패 ({draft_resp.status_code}): {draft_resp.text[:200]}")

        draft_id = draft_resp.json()["id"]
        print(f"  ✓ 드래프트 생성됨 (id={draft_id})")

        # 2) 발행
        pub_resp = self.session.post(
            f"{pub_base}/api/v1/drafts/{draft_id}/publish",
            json={"send_email": True, "share_automatically": False},
            timeout=15,
        )
        if pub_resp.status_code not in (200, 201):
            raise RuntimeError(f"발행 실패 ({pub_resp.status_code}): {pub_resp.text[:200]}")

        print(f"  ✓ 발행 완료: {pub_base}/p/{draft_id}")
        return True


def publish_post(client: "SubstackClient | None", subdomain: str, title: str, body: str, dry_run: bool) -> bool:
    if dry_run:
        print(f"\n[DRY RUN] subdomain={subdomain}.substack.com")
        print(f"  Title : {title}")
        print(f"  Body  :\n{body}\n")
        return True
    try:
        return client.create_and_publish(subdomain, title, body)
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
        missing = [v for v, k in [
            ("SUBSTACK_EMAIL", SUBSTACK_EMAIL),
            ("SUBSTACK_PASSWORD", SUBSTACK_PASSWORD),
        ] if not k]
        if missing:
            print(f"Error: 환경변수 미설정: {', '.join(missing)}", file=sys.stderr)
            print("  .env.local에 SUBSTACK_EMAIL / SUBSTACK_PASSWORD를 추가하세요.", file=sys.stderr)
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

    print(f"\n대상 포스트: [{post['content_type']}] {post['slug']}")

    en_title, en_body = build_en_post(post)
    ko_title, ko_body = build_ko_post(post)

    client = None
    if not args.dry_run:
        client = SubstackClient(SUBSTACK_EMAIL, SUBSTACK_PASSWORD)

    en_ok = ko_ok = False

    if SUBSTACK_EN_URL:
        print(f"\n[EN] {get_subdomain(SUBSTACK_EN_URL)}.substack.com")
        en_ok = publish_post(client, get_subdomain(SUBSTACK_EN_URL), en_title, en_body, args.dry_run)
    else:
        print("NEXT_PUBLIC_SUBSTACK_EN_URL 없음 — EN 발행 건너뜀")

    if SUBSTACK_KO_URL:
        print(f"\n[KO] {get_subdomain(SUBSTACK_KO_URL)}.substack.com")
        ko_ok = publish_post(client, get_subdomain(SUBSTACK_KO_URL), ko_title, ko_body, args.dry_run)
    else:
        print("NEXT_PUBLIC_SUBSTACK_KO_URL 없음 — KO 발행 건너뜀")

    if not args.dry_run and (en_ok or ko_ok):
        already_published.add(post["slug"])
        save_published_cache(already_published)
        print(f"\n캐시 저장: {post['slug']}")


if __name__ == "__main__":
    main()
