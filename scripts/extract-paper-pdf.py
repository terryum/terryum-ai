#!/usr/bin/env python3
"""
PDF에서 Figure 이미지 + 캡션을 자동 추출하는 스크립트.
arXiv HTML이 없을 때 단 1회 실행으로 처리.

사용법:
    python scripts/extract-paper-pdf.py <pdf_path> <output_dir> [--max-pages=38]

출력:
    <output_dir>/fig-N.{ext}  — 추출된 figure 이미지
    <output_dir>/extraction_report.json  — 추출 결과 + suggested_cover
"""
import sys
import re
import json
import argparse
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Extract figures from arXiv PDF")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("output_dir", help="Directory to save extracted images")
    parser.add_argument("--max-pages", type=int, default=38, help="Max pages to process (default: 38, to skip appendix)")
    return parser.parse_args()


def extract_captions(pdf_path: str, max_pages: int) -> dict[int, str]:
    """pypdf로 텍스트 추출 후 Figure N: / Figure N | 패턴으로 캡션 사전 구성."""
    captions: dict[int, str] = {}
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        full_text = ""
        for i in range(min(max_pages, len(reader.pages))):
            full_text += reader.pages[i].extract_text() or ""

        # "Figure N:" 또는 "Figure N |" 패턴 (대소문자 무관)
        pattern = re.compile(
            r'(?:Figure|Fig\.?)\s+(\d+)[:\|]\s*(.+?)(?=(?:Figure|Fig\.?)\s+\d+[:\|]|Table\s+\d+[:\|]|\Z)',
            re.IGNORECASE | re.DOTALL
        )
        for m in pattern.finditer(full_text):
            fig_num = int(m.group(1))
            caption = re.sub(r'\s+', ' ', m.group(2)).strip()
            if fig_num not in captions:
                captions[fig_num] = caption
    except ImportError:
        print("[WARN] pypdf not installed. Caption extraction skipped.", file=sys.stderr)
    except Exception as e:
        print(f"[WARN] Caption extraction failed: {e}", file=sys.stderr)

    return captions


def flatten_transparent(filepath: Path) -> bool:
    """RGBA/LA 이미지의 투명 배경을 흰색으로 변환. 변환 시 True 반환."""
    try:
        from PIL import Image
        img = Image.open(filepath)
        if img.mode not in ("RGBA", "LA"):
            return False
        alpha = img.split()[-1]
        if alpha.getextrema()[0] >= 255:
            return False  # 완전 불투명, 스킵
        white = Image.new("RGB", img.size, (255, 255, 255))
        white.paste(img, mask=img.convert("RGBA").split()[3])
        white.save(filepath, optimize=True)
        return True
    except Exception as e:
        print(f"[WARN] flatten_transparent({filepath.name}): {e}", file=sys.stderr)
        return False


def extract_images(pdf_path: str, output_dir: Path, max_pages: int) -> list[dict]:
    """pymupdf(fitz)로 이미지 추출. 200×200 이하는 아이콘으로 간주 스킵."""
    try:
        import fitz
    except ImportError:
        print("[ERROR] pymupdf not installed. Run: pip install pymupdf", file=sys.stderr)
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    images = []  # {page, xref, width, height, file}

    for page_num in range(min(max_pages, len(doc))):
        page = doc[page_num]
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            img_dict = doc.extract_image(xref)
            width = img_dict.get("width", 0)
            height = img_dict.get("height", 0)

            # 너무 작은 이미지 (아이콘, 장식) 스킵
            if width < 200 or height < 200:
                continue

            ext = img_dict.get("ext", "png")
            img_bytes = img_dict.get("image", b"")
            if not img_bytes:
                continue

            images.append({
                "page": page_num + 1,
                "xref": xref,
                "width": width,
                "height": height,
                "ext": ext,
                "bytes": img_bytes,
            })

    doc.close()

    # 중복 xref 제거 (동일 이미지가 여러 페이지에 참조될 수 있음)
    seen_xrefs = set()
    unique_images = []
    for img in images:
        if img["xref"] not in seen_xrefs:
            seen_xrefs.add(img["xref"])
            unique_images.append(img)

    # 페이지 순으로 정렬 후 파일 저장
    unique_images.sort(key=lambda x: (x["page"], x["xref"]))
    result = []
    for idx, img in enumerate(unique_images, start=1):
        filename = f"raw_p{img['page']}_{idx}.{img['ext']}"
        filepath = output_dir / filename
        filepath.write_bytes(img["bytes"])

        # 투명 배경(RGBA) → 흰색 배경으로 변환
        if img["ext"] == "png" and flatten_transparent(filepath):
            print(f"      [flatten] {filename}: RGBA → RGB (흰배경)")

        result.append({
            "file": filename,
            "page": img["page"],
            "width": img["width"],
            "height": img["height"],
            "ext": img["ext"],
        })

    return result


def map_figures_to_captions(raw_images: list[dict], captions: dict[int, str]) -> list[dict]:
    """
    페이지 순서 기반으로 Figure 번호 추정 + 캡션 매핑.
    추출된 이미지를 순서대로 Figure 1, 2, 3... 으로 가정.
    캡션이 있으면 매핑, 없으면 빈 문자열.
    """
    figures = []
    for seq_num, img in enumerate(raw_images, start=1):
        caption = captions.get(seq_num, "")
        figures.append({
            "seq_num": seq_num,
            "file": img["file"],
            "page": img["page"],
            "width": img["width"],
            "height": img["height"],
            "ext": img.get("ext", img["file"].rsplit(".", 1)[-1]),
            "caption": caption,
        })
    return figures


COVER_KEYWORDS = re.compile(
    r'overview|framework|pipeline|method|architecture|system|workflow|diagram',
    re.IGNORECASE
)


def pick_cover_candidate(figures: list[dict]) -> dict | None:
    """커버 후보 자동 랭킹: 캡션에 overview/framework/... 포함 우선, 없으면 가장 큰 이미지."""
    if not figures:
        return None

    # 캡션 키워드 매칭 우선
    keyword_matches = [f for f in figures if COVER_KEYWORDS.search(f.get("caption", ""))]
    if keyword_matches:
        # 키워드 매칭 중 가장 큰 이미지
        return max(keyword_matches, key=lambda f: f["width"] * f["height"])

    # 없으면 전체 중 가장 큰 이미지
    return max(figures, key=lambda f: f["width"] * f["height"])


def rename_to_fig(figures: list[dict], output_dir: Path) -> list[dict]:
    """raw_pN_M.ext → fig-N.ext 으로 rename."""
    renamed = []
    for fig in figures:
        old_path = output_dir / fig["file"]
        new_name = f"fig-{fig['seq_num']}.{fig['ext']}"
        new_path = output_dir / new_name
        if old_path.exists():
            old_path.rename(new_path)
        renamed.append({**fig, "file": new_name})
    return renamed


def main():
    args = parse_args()
    pdf_path = args.pdf_path
    output_dir = Path(args.output_dir)
    max_pages = args.max_pages

    print(f"[1/4] Extracting captions from {pdf_path} (max {max_pages} pages)...")
    captions = extract_captions(pdf_path, max_pages)
    print(f"      Found {len(captions)} captions: {list(captions.keys())}")

    print(f"[2/4] Extracting images...")
    raw_images = extract_images(pdf_path, output_dir, max_pages)
    print(f"      Extracted {len(raw_images)} images")

    print(f"[3/4] Mapping figures to captions...")
    figures = map_figures_to_captions(raw_images, captions)
    figures = rename_to_fig(figures, output_dir)

    cover = pick_cover_candidate(figures)
    cover_file = cover["file"] if cover else None
    if cover:
        cover["is_cover_candidate"] = True

    for fig in figures:
        if "is_cover_candidate" not in fig:
            fig["is_cover_candidate"] = False

    report = {
        "figures": figures,
        "suggested_cover": cover_file,
        "total_extracted": len(figures),
        "captions_found": len(captions),
    }

    report_path = output_dir / "extraction_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[4/4] Done. Report saved to {report_path}")
    print(f"      suggested_cover: {cover_file}")
    if cover:
        print(f"      cover caption: {cover.get('caption', '')[:80]}")
    print(f"\nExtraction report:\n{json.dumps(report, ensure_ascii=False, indent=2)}")


if __name__ == "__main__":
    main()
