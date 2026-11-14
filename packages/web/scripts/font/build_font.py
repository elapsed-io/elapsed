"""Build the self-hosted default font from the official Archivo release.

Run once by a developer, not by CI or the site build; the output is committed.
See packages/web/src/assets/fonts/README.md for provenance and the exact steps.

    python3 -I build_font.py --source path/to/Archivo[wdth,wght].ttf --out timer-sans.woff2

The script refuses any source whose SHA-256 differs from the pinned release, so
the committed font can always be rebuilt byte for byte from the same input.
"""

from __future__ import annotations

import argparse
import hashlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

# google/fonts commit 29b4ec6df2522a8aee279414b78a07910b065874, ofl/archivo/Archivo[wdth,wght].ttf
# (Archivo 2.001, built from Omnibus-Type/Archivo commit b5d63988ce19d044d3e10362de730af00526b672).
SOURCE_SHA256 = "0e094a7d3c7c4c25cf1310c4b30014f1dae9332220b1c2c88f4fa996f0b05053"

# Width 92 on the wdth axis (plan, Design system > Type). Weight 300 is the time,
# 400 to 500 the interface text, so the weight axis is kept from 300 to 500.
AXIS_LIMITS = {"wdth": 92, "wght": (300, 400, 500)}

# Basic Latin, Latin-1 Supplement and the punctuation the interface uses:
# thin space, en and em dash, curly quotes, bullet, ellipsis, narrow no-break
# space (Intl time formats such as "2:02 pm"), primes and the minus sign.
UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+2009,U+2013-2014,U+2018-2019,U+201C-201D,"
    "U+2022,U+2026,U+202F,U+2032-2033,U+2212"
)

# Every feature browsers apply by default, plus tabular figures for
# the time (font-variant-numeric: tabular-nums).
LAYOUT_FEATURES = ["ccmp", "locl", "rvrn", "liga", "kern", "mark", "mkmk", "tnum"]

# The plan: "a modified version cannot keep the Archivo name". The trimmed font
# is a modified version, so every name it presents is replaced. The copyright,
# trademark notice, designer, vendor and license records are kept unchanged.
FAMILY = "Timer Sans"
POSTSCRIPT_FAMILY = "TimerSans"
NAMES = {
    1: FAMILY,
    2: "Regular",
    3: f"2.001;{POSTSCRIPT_FAMILY}-Regular",
    4: FAMILY,
    6: f"{POSTSCRIPT_FAMILY}-Regular",
    10: (
        f"{FAMILY} is a modified version of Archivo by Omnibus-Type, "
        "instanced at width 92 and weights 300 to 500 and cut down to Latin characters."
    ),
    25: POSTSCRIPT_FAMILY,
}
DROPPED_NAME_IDS = (16, 17)


def sha256(path: str) -> str:
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def rename(font: TTFont) -> None:
    table = font["name"]
    for name_id in DROPPED_NAME_IDS:
        table.removeNames(nameID=name_id)
    for name_id, value in NAMES.items():
        table.removeNames(nameID=name_id)
        table.setName(value, name_id, 3, 1, 0x409)
    # Named instances carry PostScript names such as "Archivo-Light".
    if "fvar" in font:
        for instance in font["fvar"].instances:
            ps_id = instance.postscriptNameID
            if ps_id in (None, 0xFFFF):
                continue
            style = table.getDebugName(instance.subfamilyNameID) or "Regular"
            table.removeNames(nameID=ps_id)
            table.setName(f"{POSTSCRIPT_FAMILY}-{style.replace(' ', '')}", ps_id, 3, 1, 0x409)
    leftovers = [
        (record.nameID, record.toUnicode())
        for record in table.names
        if "Archivo" in record.toUnicode() and record.nameID not in (0, 7, 10)
    ]
    if leftovers:
        raise SystemExit(f"names still present after renaming: {leftovers}")


def build(source: str, out: str) -> None:
    actual = sha256(source)
    if actual != SOURCE_SHA256:
        raise SystemExit(f"source SHA-256 {actual} does not match the pinned {SOURCE_SHA256}")

    source_font = TTFont(source, recalcTimestamp=False)
    modified = source_font["head"].modified
    font = instantiateVariableFont(source_font, AXIS_LIMITS)
    rename(font)
    # Keep the source's timestamp so rebuilding produces identical bytes.
    font.recalcTimestamp = False
    font["head"].modified = modified

    options = subset.Options()
    options.layout_features = LAYOUT_FEATURES
    options.name_IDs = ["*"]
    options.name_languages = [0x409]
    options.flavor = "woff2"
    options.notdef_outline = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
    subsetter.subset(font)
    subset.save_font(font, out, options)
    print(f"wrote {out} ({len(open(out, 'rb').read())} bytes, sha256 {sha256(out)})")


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args(argv)
    build(args.source, args.out)


if __name__ == "__main__":
    main(sys.argv[1:])
