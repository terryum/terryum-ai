#!/usr/bin/env python3
"""
Figure 이미지의 투명 배경(RGBA/LA)을 흰색 배경으로 변환.
다크모드에서 텍스트가 잘 보이도록 하기 위함.

사용법:
    python scripts/flatten-transparent-figures.py <dir>      # 디렉토리 내 모든 PNG
    python scripts/flatten-transparent-figures.py <file.png> # 단일 파일

변환 조건:
    - RGBA 또는 LA 모드 이미지만 변환
    - 실제로 투명 픽셀이 있는 경우만 변환 (완전 불투명이면 스킵)
    - 원본 파일 덮어쓰기 (in-place)
"""
import sys
from pathlib import Path
from PIL import Image


def has_transparency(img: Image.Image) -> bool:
    """실제 투명 픽셀이 있는지 확인."""
    if img.mode == "RGBA":
        alpha = img.split()[3]
        return alpha.getextrema()[0] < 255
    if img.mode == "LA":
        alpha = img.split()[1]
        return alpha.getextrema()[0] < 255
    return False


def flatten_to_white(img: Image.Image) -> Image.Image:
    """투명 배경을 흰색으로 합성."""
    white = Image.new("RGB", img.size, (255, 255, 255))
    if img.mode == "RGBA":
        white.paste(img, mask=img.split()[3])
    elif img.mode == "LA":
        white.paste(img.convert("RGBA"), mask=img.convert("RGBA").split()[3])
    else:
        white.paste(img)
    return white


def process_file(path: Path) -> bool:
    """단일 파일 처리. 변환 시 True 반환."""
    if path.suffix.lower() not in (".png", ".webp"):
        return False
    try:
        img = Image.open(path)
        if img.mode not in ("RGBA", "LA"):
            return False
        if not has_transparency(img):
            print(f"  [skip] {path.name} - no transparent pixels")
            return False

        result = flatten_to_white(img)
        result.save(path, optimize=True)
        print(f"  [ok]   {path.name} {img.size} RGBA -> RGB (white bg)")
        return True
    except Exception as e:
        print(f"  [err]  {path.name}: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/flatten-transparent-figures.py <dir_or_file>")
        sys.exit(1)

    target = Path(sys.argv[1])

    if target.is_file():
        paths = [target]
    elif target.is_dir():
        paths = sorted(target.glob("fig-*.png")) + sorted(target.glob("fig-*.webp"))
        if not paths:
            # fig- prefix 없이도 처리
            paths = sorted(target.glob("*.png")) + sorted(target.glob("*.webp"))
    else:
        print(f"[ERROR] 경로를 찾을 수 없음: {target}")
        sys.exit(1)

    converted = 0
    for p in paths:
        if process_file(p):
            converted += 1

    print(f"\nDone: {converted}/{len(paths)} files converted to white background")


if __name__ == "__main__":
    main()
