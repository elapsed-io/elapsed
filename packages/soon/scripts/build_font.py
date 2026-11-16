"""Build the soon and legal pages' fonts: the site's default font cut down to the characters each shows.

Run by a developer after a page's text changes; the output is committed. The
source is the site's own trimmed font (packages/web/src/assets/fonts/timer-sans.woff2,
a modified Archivo renamed "Timer Sans", OFL 1.1), so these pages draw exactly
what the timer draws. The weight axis is kept (300 to 500).

- soon.woff2: the characters of index.html ("elapsed", "soon", "privacy", "terms").
- legal.woff2: the characters of privacy.html and terms.html.

    python3 -I scripts/build_font.py --source ../web/src/assets/fonts/timer-sans.woff2 --public public
"""

from __future__ import annotations

import argparse
import hashlib
import html
import io
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

# The committed default font (packages/web/src/assets/fonts/README.md).
SOURCE_SHA256 = "ef61ef716351ac21c5a5fa07f9929f972908ffe21b651edafb037be774c6b1f4"
# Each font and the pages whose text it must draw.
FONTS = {"soon.woff2": ["index.html"], "legal.woff2": ["privacy.html", "terms.html"]}


def page_text(path: str) -> str:
    """The characters a page shows: its body's text, without markup, as the browser decodes it."""
    with open(path, encoding="utf-8") as handle:
        page = handle.read()
    body = page[page.index("<body>") : page.index("</body>")]
    text = html.unescape(re.sub(r"<[^>]+>", "", body))
    return "".join(sorted({character for character in text if not character.isspace()})) + " "


def cut(data: bytes, text: str) -> bytes:
    font = TTFont(io.BytesIO(data), recalcTimestamp=False, lazy=False)
    options = subset.Options()
    options.layout_features = ["ccmp", "locl", "rvrn", "liga", "kern", "mark", "mkmk"]
    options.name_IDs = ["*"]
    options.name_languages = [0x409]
    options.flavor = "woff2"
    options.notdef_outline = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    buffer = io.BytesIO()
    subset.save_font(font, buffer, options)
    return buffer.getvalue()


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--public", required=True)
    args = parser.parse_args(argv)
    with open(args.source, "rb") as handle:
        data = handle.read()
    actual = hashlib.sha256(data).hexdigest()
    if actual != SOURCE_SHA256:
        raise SystemExit(f"source SHA-256 {actual} does not match the pinned {SOURCE_SHA256}")
    for name, pages in FONTS.items():
        text = "".join(page_text(os.path.join(args.public, page)) for page in pages)
        out = cut(data, text)
        path = os.path.join(args.public, name)
        with open(path, "wb") as handle:
            handle.write(out)
        print(f"wrote {path} ({len(out)} bytes, sha256 {hashlib.sha256(out).hexdigest()}): {''.join(sorted(set(text.strip())))}")


if __name__ == "__main__":
    main(sys.argv[1:])
