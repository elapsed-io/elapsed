"""Build the soon page's font: the site's default font cut down to the letters it shows.

Run once by a developer; the output is committed. The source is the site's own
trimmed font (packages/web/src/assets/fonts/timer-sans.woff2, a modified Archivo
renamed "Timer Sans", OFL 1.1), so the soon page draws exactly what the timer draws.

    python3 -I build_font.py --source ../web/src/assets/fonts/timer-sans.woff2 --out public/soon.woff2
"""

from __future__ import annotations

import argparse
import hashlib
import io
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

# The committed default font (packages/web/src/assets/fonts/README.md).
SOURCE_SHA256 = "ef61ef716351ac21c5a5fa07f9929f972908ffe21b651edafb037be774c6b1f4"
# "elapsed" and "soon"; the weight axis is kept (300 for "soon", 400 for "elapsed").
TEXT = "elapsedsoon"


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args(argv)
    with open(args.source, "rb") as handle:
        data = handle.read()
    actual = hashlib.sha256(data).hexdigest()
    if actual != SOURCE_SHA256:
        raise SystemExit(f"source SHA-256 {actual} does not match the pinned {SOURCE_SHA256}")
    font = TTFont(io.BytesIO(data), recalcTimestamp=False, lazy=False)
    options = subset.Options()
    options.layout_features = ["ccmp", "locl", "rvrn", "liga", "kern", "mark", "mkmk"]
    options.name_IDs = ["*"]
    options.name_languages = [0x409]
    options.flavor = "woff2"
    options.notdef_outline = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=TEXT)
    subsetter.subset(font)
    buffer = io.BytesIO()
    subset.save_font(font, buffer, options)
    out = buffer.getvalue()
    with open(args.out, "wb") as handle:
        handle.write(out)
    print(f"wrote {args.out} ({len(out)} bytes, sha256 {hashlib.sha256(out).hexdigest()})")


if __name__ == "__main__":
    main(sys.argv[1:])
