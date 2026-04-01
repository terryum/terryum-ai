#!/usr/bin/env python3
"""
프로젝트 소셜미디어 공유 스크립트.

projects/gallery/projects.json에서 프로젝트를 찾아
Facebook Page, Threads, LinkedIn, X(Twitter), Bluesky에 공유한다.

사용법:
    python scripts/publish-project-social.py --slug=<slug> [--dry-run] [--platform=facebook,threads,linkedin,x,bluesky]
"""
import importlib.util
import os
import sys
import json
import argparse
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

SITE_BASE_URL = os.environ.get("SITE_BASE_URL", "https://terry.artlab.ai")
PROJECTS_PATH = REPO_ROOT / "projects" / "gallery" / "projects.json"

ALL_PLATFORMS = ["facebook", "threads", "linkedin", "x", "bluesky"]


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


def build_ko_message(project, url):
    title = project["title"]["ko"]
    desc = project["description"]["ko"]
    tags = build_hashtags(project.get("tech_stack", []))
    lines = [title, "", desc, "", f"자세히 보기 \U0001F449 {url}"]
    if tags:
        lines.append(tags)
    return "\n".join(lines)


def build_en_message(project, url):
    title = project["title"]["en"]
    desc = project["description"]["en"]
    tags = build_hashtags(project.get("tech_stack", []))
    lines = [title, "", desc, "", f"Check it out \u2192 {url}"]
    if tags:
        lines.append(tags)
    return "\n".join(lines)


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

    # URL 결정
    if project.get("embed_url"):
        ko_url = f"{SITE_BASE_URL}/ko/projects/{args.slug}"
        en_url = f"{SITE_BASE_URL}/en/projects/{args.slug}"
    else:
        ko_url = en_url = project["links"][0]["url"] if project["links"] else SITE_BASE_URL

    ko_text = build_ko_message(project, ko_url)
    en_text = build_en_message(project, en_url)

    print(f"대상 프로젝트: {args.slug} ({project['title']['en']})")
    print(f"대상 플랫폼: {', '.join(platforms)}")
    print()

    results = {}

    for platform in platforms:
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
            ok = ps.publish_facebook(ko_text, ko_url, args.dry_run)
        elif platform == "threads":
            ok = ps.publish_threads(ko_text, ko_url, args.dry_run)
        elif platform == "linkedin":
            ok = ps.publish_linkedin(en_text, en_url, args.dry_run)
        elif platform == "x":
            ok = ps.publish_x(en_text, args.dry_run)
        elif platform == "bluesky":
            ok = ps.publish_bluesky(en_text, en_url, args.dry_run)
        else:
            ok = False

        results[platform] = ok
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
