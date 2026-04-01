#!/usr/bin/env python3
"""
프로젝트 소셜미디어 + Substack 공유 스크립트.

projects/gallery/projects.json에서 프로젝트를 찾아
Facebook Page, Threads, LinkedIn, X(Twitter), Bluesky, Substack에 공유한다.

사용법:
    python scripts/publish-project-social.py --slug=<slug> [--dry-run] [--platform=facebook,threads,linkedin,x,bluesky,substack]
"""
import importlib.util
import os
import sys
import json
import argparse
from datetime import date
from pathlib import Path

# ─── Manual env loading ──────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = REPO_ROOT / ".env.local"

if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().split("#")[0].strip()
        os.environ.setdefault(key, val)

# ─── Import publish functions from publish-social.py (hyphenated filename) ───
spec = importlib.util.spec_from_file_location(
    "publish_social", REPO_ROOT / "scripts" / "publish-social.py"
)
ps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ps)

# Import Substack functions
spec_sub = importlib.util.spec_from_file_location(
    "publish_substack", REPO_ROOT / "scripts" / "publish-substack.py"
)
psub = importlib.util.module_from_spec(spec_sub)
spec_sub.loader.exec_module(psub)

SITE_BASE_URL = os.environ.get("SITE_BASE_URL", "https://terry.artlab.ai")
FACEBOOK_BASE_URL = os.environ.get("FACEBOOK_BASE_URL", "https://terry-artlab.vercel.app")
PROJECTS_PATH = REPO_ROOT / "projects" / "gallery" / "projects.json"

ALL_PLATFORMS = ["facebook", "threads", "linkedin", "x", "bluesky", "substack"]


def load_projects():
    return json.loads(PROJECTS_PATH.read_text())["projects"]


def find_project(slug):
    for p in load_projects():
        if p["slug"] == slug:
            return p
    return None


def build_hashtags(tech_stack):
    tags = []
    for t in tech_stack:
        tag = t.replace(" ", "_").replace("-", "_")
        tag = "".join(c for c in tag if c.isalnum() or c == "_")
        if tag:
            tags.append(f"#{tag}")
    return " ".join(tags[:5])


def build_facebook_text(project):
    """Facebook: 짧고 컴팩트하게. 빈 줄 없이. CTA 없음 (link 파라미터로 URL 전달)."""
    desc = project["description"]["ko"]
    return desc


def build_threads_text(project):
    """Threads: 설명 + Read more ↓ (link_attachment로 URL 전달)."""
    desc = project["description"]["ko"]
    return f"{desc}\n\nRead more \u2193"


def build_linkedin_text(project):
    """LinkedIn: 짧고 컴팩트하게. 빈 줄 없이. CTA 없음 (ARTICLE 카드로 URL 전달)."""
    desc = project["description"]["en"]
    return desc


def build_x_text(project, url):
    """X: 설명 + Read more ↓ + URL (인라인). 280자 제한."""
    desc = project["description"]["en"]
    return f"{desc}\n\nRead more \u2193\n{url}"


def build_bluesky_text(project):
    """Bluesky: 설명 + Read more ↓ (external embed로 URL 전달). 300 grapheme."""
    desc = project["description"]["en"]
    return f"{desc}\n\nRead more \u2193"


def main():
    parser = argparse.ArgumentParser(description="프로젝트 소셜미디어 공유")
    parser.add_argument("--slug", required=True, help="프로젝트 slug")
    parser.add_argument("--dry-run", action="store_true", help="실제 발행 없이 출력만")
    parser.add_argument(
        "--platform",
        default=",".join(ALL_PLATFORMS),
        help="플랫폼 (기본: 전체)",
    )
    args = parser.parse_args()

    platforms = [p.strip() for p in args.platform.split(",") if p.strip() in ALL_PLATFORMS]
    if not platforms:
        print(f"Error: 유효한 플랫폼이 없습니다.", file=sys.stderr)
        sys.exit(1)

    project = find_project(args.slug)
    if not project:
        print(f"Error: 프로젝트를 찾을 수 없습니다: {args.slug}", file=sys.stderr)
        sys.exit(1)

    slug = args.slug
    fallback_url = project["links"][0]["url"] if project["links"] else SITE_BASE_URL

    # Platform-specific URLs (로캘 포함 — 리다이렉트 없이 OG 크롤러가 직접 접근)
    if project.get("embed_url"):
        fb_url = f"{FACEBOOK_BASE_URL}/ko/projects/{slug}"
        threads_url = f"{FACEBOOK_BASE_URL}/ko/projects/{slug}?utm_source=threads&utm_medium=social"
        linkedin_url = f"{SITE_BASE_URL}/en/projects/{slug}"
        import time
        cache_bust = str(int(time.time()))
        x_url = f"{SITE_BASE_URL}/en/projects/{slug}?v={cache_bust}"
        bluesky_url = f"{SITE_BASE_URL}/en/projects/{slug}"
        substack_en_url = f"{SITE_BASE_URL}/en/projects/{slug}"
        substack_ko_url = f"{SITE_BASE_URL}/ko/projects/{slug}"
    else:
        fb_url = threads_url = linkedin_url = x_url = bluesky_url = fallback_url
        substack_en_url = substack_ko_url = fallback_url

    # Platform-specific messages (post-share 스타일)
    fb_text = build_facebook_text(project)
    threads_text = build_threads_text(project)
    linkedin_text = build_linkedin_text(project)
    x_text = build_x_text(project, x_url)
    bluesky_text = build_bluesky_text(project)

    print(f"대상 프로젝트: {slug} ({project['title']['en']})")
    print(f"대상 플랫폼: {', '.join(platforms)}")
    print()

    # Cover image URL for Substack
    cover_url = f"{SITE_BASE_URL}{project['cover_image']}" if project.get("cover_image") else None

    results = {}
    social_platforms = [p for p in platforms if p != "substack"]
    do_substack = "substack" in platforms

    for platform in social_platforms:
        print(f"[{platform.upper()}]")

        # Token expiry check
        if platform == "threads":
            if not ps.check_token_expiry("threads", "THREADS_TOKEN_CREATED"):
                results[platform] = False
                continue
        elif platform == "linkedin":
            if not ps.check_token_expiry("linkedin", "LINKEDIN_TOKEN_CREATED"):
                results[platform] = False
                continue

        if platform == "facebook":
            ok = ps.publish_facebook(fb_text, fb_url, args.dry_run)
        elif platform == "threads":
            ok = ps.publish_threads(threads_text, threads_url, args.dry_run)
        elif platform == "linkedin":
            ok = ps.publish_linkedin(linkedin_text, linkedin_url, args.dry_run)
        elif platform == "x":
            ok = ps.publish_x(x_text, args.dry_run)
        elif platform == "bluesky":
            ok = ps.publish_bluesky(bluesky_text, bluesky_url, args.dry_run)
        else:
            ok = False

        results[platform] = ok
        print()

    # Substack publishing
    if do_substack:
        en_title = project["title"]["en"]
        en_desc = project["description"]["en"]
        ko_title = project["title"]["ko"]
        ko_desc = project["description"]["ko"]

        substack_cookie = os.environ.get("SUBSTACK_COOKIE", "")
        en_sub_url = os.environ.get("NEXT_PUBLIC_SUBSTACK_EN_URL", "")
        ko_sub_url = os.environ.get("NEXT_PUBLIC_SUBSTACK_KO_URL", "")

        client = None
        if not args.dry_run:
            if not substack_cookie:
                print("[SUBSTACK] Error: SUBSTACK_COOKIE not set", file=sys.stderr)
                results["substack(en)"] = False
                results["substack(ko)"] = False
            else:
                try:
                    client = psub.SubstackClient(substack_cookie)
                except Exception as e:
                    print(f"[SUBSTACK] 인증 실패: {e}", file=sys.stderr)
                    results["substack(en)"] = False
                    results["substack(ko)"] = False

        if "substack(en)" not in results and en_sub_url:
            subdomain = psub.get_subdomain(en_sub_url)
            print(f"[SUBSTACK EN]")
            ok = psub.publish_post(
                client, subdomain,
                title=en_title,
                subtitle=en_desc[:80],
                paragraphs=[en_desc],
                link=substack_en_url,
                cta="Check it out",
                image_url=cover_url,
                note_intro=en_desc[:100],
                dry_run=args.dry_run,
            )
            results["substack(en)"] = ok
            print()

        if "substack(ko)" not in results and ko_sub_url:
            subdomain = psub.get_subdomain(ko_sub_url)
            print(f"[SUBSTACK KO]")
            ok = psub.publish_post(
                client, subdomain,
                title=ko_title,
                subtitle=ko_desc[:80],
                paragraphs=[ko_desc],
                link=substack_ko_url,
                cta="자세히 보기",
                image_url=cover_url,
                note_intro=ko_desc[:100],
                dry_run=args.dry_run,
            )
            results["substack(ko)"] = ok
            print()

    # Summary
    print(f"\n─── /project-share 결과 ─────────────────────────────")
    print(f"프로젝트: {args.slug}")
    print()
    for p, ok in results.items():
        status = "✓" if ok else "✗"
        print(f"  {status} {p}")
    print("──────────────────────────────────────────────────────")


if __name__ == "__main__":
    main()
