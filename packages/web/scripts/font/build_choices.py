"""Build the built-in font choices and their name previews.

Run once by a developer, not by CI or the site build; the output is committed.
See packages/web/src/assets/fonts/choices/README.md for provenance and the exact steps.

    python3 -I build_choices.py --sources path/to/sources --out packages/web/src/assets/fonts/choices

For each font (plan, Loading and performance > Fonts; owner changes, item 7):

- The full font, downloaded only when the font is chosen. Google Fonts families
  are cut down like the default font: weights 300 to 500 (the time and the
  interface text), Basic Latin, Latin-1 and a short punctuation list, the
  features browsers apply by default plus tabular figures, and every name the
  font presents replaced (decision 161). IBM Plex reserves the name "Plex", so
  both Plex fonts are IBM's own Latin-1 web files, copied unchanged.
- A name preview: a tiny subset holding only the letters of the font's name
  (and the ellipsis that cuts a long name short) at weight 400, for the
  settings font grid. It is renamed too.
- The font's license file, copied unchanged.

Every source is checked against its pinned SHA-256, every result is checked for
tabular figures at weights 300, 400 and 500, and the same sources always give
the same bytes.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import os
import shutil
import sys
from dataclasses import dataclass, field

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

# Same character set and features as the default font (build_font.py).
UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+2009,U+2013-2014,U+2018-2019,U+201C-201D,"
    "U+2022,U+2026,U+202F,U+2032-2033,U+2212"
)
LAYOUT_FEATURES = ["ccmp", "locl", "rvrn", "liga", "kern", "mark", "mkmk", "tnum"]
PREVIEW_FEATURES = ["ccmp", "locl", "rvrn", "liga", "kern", "mark", "mkmk"]
WEIGHTS = (300, 400, 500)
PREVIEW_WEIGHT = 400


@dataclass(frozen=True)
class Source:
    file: str
    sha256: str


@dataclass(frozen=True)
class Choice:
    id: str
    label: str
    # The family every modified file is renamed to (decision 161).
    renamed: str
    license_file: str
    license_sha256: str
    credit: str
    # One variable source, or one static source per weight in WEIGHTS order.
    sources: tuple[Source, ...]
    # Axes other than weight are pinned at these values.
    pinned: dict[str, float] = field(default_factory=dict)
    # Copied unchanged (the copyright holder's own web files); no trimming or renaming.
    unchanged: bool = False


CHOICES: tuple[Choice, ...] = (
    Choice(
        "barlow-semi-condensed", "barlow semi condensed", "Timer Alt 01",
        "barlowsemicondensed-OFL.txt", "186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f",
        "Barlow Semi Condensed by Jeremy Tribby",
        (
            Source("BarlowSemiCondensed-Light.ttf", "cc4a1ad3d68ec017a79b098228e76c722ed92e5e791978467c76437186f22a03"),
            Source("BarlowSemiCondensed-Regular.ttf", "e8c7242f612b13d026e18a94b63b0fd079e91a3faf009d1b6981dbb5f16d1153"),
            Source("BarlowSemiCondensed-Medium.ttf", "4998b693a190b76f2b11315844345a8546c1e2e6a320905507a9eed04edf8b48"),
        ),
    ),
    Choice(
        "saira", "saira", "Timer Alt 02",
        "saira-OFL.txt", "f2665d4718b452b3818a877191355ac884a6b9b419d35408fe7ee487e9e8f30f",
        "Saira by Omnibus-Type",
        (Source("Saira[wdth,wght].ttf", "9d050fc5a01c85f74c4257c207d50b55d1e40c37308c642f974a2c5003231dde"),),
        pinned={"wdth": 100},
    ),
    Choice(
        "inter", "inter", "Timer Alt 03",
        "inter-OFL.txt", "5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57",
        "Inter by Rasmus Andersson",
        # The optical size axis is kept, so the large time uses Inter's display cut as designed.
        (Source("Inter[opsz,wght].ttf", "29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031"),),
    ),
    Choice(
        "space-grotesk", "space grotesk", "Timer Alt 04",
        "spacegrotesk-OFL.txt", "564ce565c371c5e5bbf286006565a7c9aa55a9f56e7ca58d56e05d649dd61a72",
        "Space Grotesk by Florian Karsten",
        (Source("SpaceGrotesk[wght].ttf", "acad6de1fc93436f5c0f1f4137751ef04f1aea3063e7036535970ffcfbd79f72"),),
    ),
    Choice(
        "sora", "sora", "Timer Alt 05",
        "sora-OFL.txt", "ba0b9729c9428ba79a0459ab8ec575791b51509dbec213e383d0316d37fec299",
        "Sora by Jonathan Barnbrook and Julián Moncada",
        (Source("Sora[wght].ttf", "84ff7096ae3ec6c8be47d906d1a0ba4de7f2ce78c615275c77301964a316e16c"),),
    ),
    Choice(
        "manrope", "manrope", "Timer Alt 06",
        "manrope-OFL.txt", "58172e0c0fac2cda8a37b348164bb55e44b0e69051e557e92b1d3f6910141f7b",
        "Manrope by Mikhail Sharanda",
        (Source("Manrope[wght].ttf", "3ae11c49db0455a3cc33e37d380f20fdb8c7f8b41dc07625c177e3d87a9d6ae6"),),
    ),
    Choice(
        "outfit", "outfit", "Timer Alt 07",
        "outfit-OFL.txt", "c676351bf8576b9aba743cd5eaa8c0e7ee0d51f805d720447b4df4ddb6a2e416",
        "Outfit by Smartsheet Inc and Rodrigo Fuenzalida",
        (Source("Outfit[wght].ttf", "fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade"),),
    ),
    Choice(
        "ibm-plex-sans", "ibm plex sans", "Timer Alt 08",
        "plex-sans-LICENSE.txt", "7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da",
        "IBM Plex Sans by IBM Corp. (Mike Abbink, Bold Monday)",
        (
            Source("IBMPlexSans-Light-Latin1.woff2", "a21e7db1965d4c7af07213226fb11ccd2f61a87a0045ce1fed7cd22918431144"),
            Source("IBMPlexSans-Regular-Latin1.woff2", "b5ad7bd39f996144915f0ad9849a90183b27d8c28ad97ed98af5b1bebc51f6b1"),
            Source("IBMPlexSans-Medium-Latin1.woff2", "b5610af04d0d4b5a14a621d96d974b993e945a065db1a8861918f69ef9321934"),
        ),
        unchanged=True,
    ),
    Choice(
        "jetbrains-mono", "jetbrains mono", "Timer Alt 09",
        "jetbrainsmono-OFL.txt", "b2fe5e8987594e9ffd1d2ca52a2f5d73eb8335243893c5d6254b5ad69269591d",
        "JetBrains Mono by JetBrains, Philipp Nurullin and Konstantin Bulenkov",
        (Source("JetBrainsMono[wght].ttf", "48715a42ec242c21e9f02692891e147d022299a52e48d5e413e1a942193ffeda"),),
    ),
    Choice(
        "ibm-plex-mono", "ibm plex mono", "Timer Alt 10",
        "plex-mono-LICENSE.txt", "7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da",
        "IBM Plex Mono by IBM Corp. (Mike Abbink, Bold Monday)",
        (
            Source("IBMPlexMono-Light-Latin1.woff2", "ec38551173e6a194f32916ffc0712cc106aa1456edbbb8867fb8e8e6324d4db4"),
            Source("IBMPlexMono-Regular-Latin1.woff2", "e8993d946649b9d01abb1ed06d574b19d8ea3e66b5c3948602db335c44c18e56"),
            Source("IBMPlexMono-Medium-Latin1.woff2", "41201b658a328b9d00368215c2f1102770f80b15952ab82631e4006255e6365d"),
        ),
        unchanged=True,
    ),
    Choice(
        "roboto-mono", "roboto mono", "Timer Alt 11",
        "robotomono-OFL.txt", "50ab8dd54680d3473f649c9db86fece88434d097c7834475c1c72d2f8c429215",
        "Roboto Mono by Christian Robertson",
        (Source("RobotoMono[wght].ttf", "66a80e79d17e4c7cabd162e2916578a4cc08fd19eef6e2a643305eae9c567b2b"),),
    ),
    Choice(
        "dm-mono", "dm mono", "Timer Alt 12",
        "dmmono-OFL.txt", "2bada5ea45c3c63b7f1ea1f88ce9672c9e4f0c42b2c3b7378949084fe55a3066",
        "DM Mono by Colophon Foundry",
        (
            Source("DMMono-Light.ttf", "c7b3645dc8d28237317b4d017bc47b9ff09a7660758122dacb694a5a82552c24"),
            Source("DMMono-Regular.ttf", "55b4c98f123daebb3ed27947ba47b2af00554fc6284d639a540bcef5e6258ad2"),
            Source("DMMono-Medium.ttf", "fd327daf461db87b44a87def475d251bf03b997f7c07d9680592d75dbbfaad0b"),
        ),
    ),
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_checked(directory: str, name: str, expected: str) -> bytes:
    with open(os.path.join(directory, name), "rb") as handle:
        data = handle.read()
    actual = sha256_bytes(data)
    if actual != expected:
        raise SystemExit(f"{name}: SHA-256 {actual} does not match the pinned {expected}")
    return data


def load(data: bytes) -> TTFont:
    return TTFont(io.BytesIO(data), recalcTimestamp=False, lazy=False)


def tabular_widths(font: TTFont) -> set[int]:
    """Advance widths of 0 to 9 with tabular figures applied (the tnum feature, if the font has one)."""
    cmap = font.getBestCmap()
    digits = [cmap[0x30 + i] for i in range(10)]
    substitutions: dict[str, str] = {}
    if "GSUB" in font and font["GSUB"].table.FeatureList is not None:
        table = font["GSUB"].table
        for record in table.FeatureList.FeatureRecord:
            if record.FeatureTag != "tnum":
                continue
            for index in record.Feature.LookupListIndex:
                lookup = table.LookupList.Lookup[index]
                for sub in lookup.SubTable:
                    if lookup.LookupType == 7:
                        sub = sub.ExtSubTable
                    substitutions.update(getattr(sub, "mapping", None) or {})
    metrics = font["hmtx"]
    return {metrics[substitutions.get(glyph, glyph)][0] for glyph in digits}


def require_tabular(font: TTFont, what: str) -> None:
    widths = tabular_widths(font)
    if len(widths) != 1:
        raise SystemExit(f"{what}: digits are not tabular ({sorted(widths)}); the plan drops such a font")


def check_variable(font: TTFont, choice: Choice) -> None:
    """Tabular figures at every weight in use, and at both ends of any other axis kept."""
    others = [(axis.axisTag, axis.minValue, axis.maxValue) for axis in font["fvar"].axes if axis.axisTag != "wght"]
    corners: list[dict[str, float]] = [{}]
    for tag, low, high in others:
        corners = [{**corner, tag: value} for corner in corners for value in (low, high)]
    for weight in WEIGHTS:
        for corner in corners:
            instance = instantiateVariableFont(load(save_ttf(font)), {"wght": weight, **corner})
            require_tabular(instance, f"{choice.id} at weight {weight} {corner}")


def save_ttf(font: TTFont) -> bytes:
    buffer = io.BytesIO()
    font.save(buffer)
    return buffer.getvalue()


def rename(font: TTFont, family: str) -> None:
    """Every name the font presents becomes `family`; copyright, trademark, designer and license records stay."""
    postscript = family.replace(" ", "")
    table = font["name"]
    version = (table.getDebugName(5) or "").split(";")[0].replace("Version ", "")
    for name_id in (16, 17, 21, 22):
        table.removeNames(nameID=name_id)
    names = {
        1: family,
        2: "Regular",
        3: f"{version};{postscript}",
        4: family,
        6: postscript,
        25: postscript,
    }
    for name_id, value in names.items():
        table.removeNames(nameID=name_id)
        table.setName(value, name_id, 3, 1, 0x409)
    if "fvar" in font:
        for instance in font["fvar"].instances:
            if instance.postscriptNameID not in (None, 0xFFFF):
                table.removeNames(nameID=instance.postscriptNameID)
                instance.postscriptNameID = 0xFFFF
    if "STAT" in font and font["STAT"].table.ElidedFallbackNameID is not None:
        table.removeNames(nameID=font["STAT"].table.ElidedFallbackNameID)
        font["STAT"].table.ElidedFallbackNameID = 2


# Name records that present the font; the others (copyright, trademark, designer, URLs, license) are kept.
PRESENTING_NAME_IDS = {1, 2, 3, 4, 5, 6, 16, 17, 18, 20, 21, 22, 25}


def require_renamed(data: bytes, choice: Choice, original: str) -> None:
    table = load(data)["name"]
    leftovers = [
        (record.nameID, record.toUnicode())
        for record in table.names
        if record.nameID in PRESENTING_NAME_IDS and original.lower() in record.toUnicode().lower()
    ]
    if leftovers:
        raise SystemExit(f"{choice.id}: names still present after renaming: {leftovers}")


def describe(font: TTFont, choice: Choice, what: str) -> None:
    font["name"].removeNames(nameID=10)
    font["name"].setName(f"{choice.renamed} is a modified version of {choice.credit}: {what}.", 10, 3, 1, 0x409)


def subset_to(font: TTFont, unicodes: list[int], features: list[str], hinting: bool = True) -> bytes:
    options = subset.Options()
    # Previews are drawn at one small size, where hinting adds bytes and nothing visible.
    options.hinting = hinting
    options.layout_features = features
    options.name_IDs = ["*"]
    options.name_languages = [0x409]
    options.flavor = "woff2"
    options.notdef_outline = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    buffer = io.BytesIO()
    subset.save_font(font, buffer, options)
    return buffer.getvalue()


def keep_timestamp(font: TTFont, source: TTFont) -> None:
    font.recalcTimestamp = False
    font["head"].modified = source["head"].modified


def full_fonts(choice: Choice, sources: list[bytes]) -> dict[str, bytes]:
    if choice.unchanged:
        for weight, data in zip(WEIGHTS, sources):
            require_tabular(load(data), f"{choice.id} {weight}")
        return {f"{choice.id}-{weight}.woff2": data for weight, data in zip(WEIGHTS, sources)}
    unicodes = subset.parse_unicodes(UNICODES)
    if len(sources) == 1:
        source = load(sources[0])
        limits: dict[str, object] = {"wght": (WEIGHTS[0], WEIGHTS[-1])}
        limits.update(choice.pinned)
        # A save and reload settles the instanced tables before subsetting (some glyphs have no variations).
        font = load(save_ttf(instantiateVariableFont(source, limits)))
        check_variable(font, choice)
        rename(font, choice.renamed)
        describe(font, choice, "weights 300 to 500, cut down to Latin characters")
        keep_timestamp(font, load(sources[0]))
        return {f"{choice.id}.woff2": subset_to(font, unicodes, LAYOUT_FEATURES)}
    files: dict[str, bytes] = {}
    for weight, data in zip(WEIGHTS, sources):
        font = load(data)
        require_tabular(font, f"{choice.id} {weight}")
        rename(font, choice.renamed)
        describe(font, choice, f"weight {weight}, cut down to Latin characters")
        keep_timestamp(font, load(data))
        files[f"{choice.id}-{weight}.woff2"] = subset_to(font, unicodes, LAYOUT_FEATURES)
    return files


def preview(choice: Choice, sources: list[bytes]) -> bytes:
    """Only the letters of the font's name, at weight 400."""
    if len(sources) == 1:
        source = load(sources[0])
        # A static instance: weight 400, every other axis at its default unless pinned.
        limits: dict[str, object] = {axis.axisTag: axis.defaultValue for axis in source["fvar"].axes}
        limits.update(choice.pinned)
        limits["wght"] = PREVIEW_WEIGHT
        font = load(save_ttf(instantiateVariableFont(source, limits)))
        original = load(sources[0])
    else:
        font = load(sources[WEIGHTS.index(PREVIEW_WEIGHT)])
        original = load(sources[WEIGHTS.index(PREVIEW_WEIGHT)])
    family = f"{choice.renamed} Preview"
    rename(font, family)
    font["name"].removeNames(nameID=10)
    font["name"].setName(
        f"{family} is a modified version of {choice.credit}: weight {PREVIEW_WEIGHT}, only the letters of its name and an ellipsis.",
        10, 3, 1, 0x409,
    )
    keep_timestamp(font, original)
    # The ellipsis too: a name too long for its tile is cut with the font's own "…".
    letters = sorted({ord(character) for character in choice.label} | {0x2026})
    return subset_to(font, letters, PREVIEW_FEATURES, hinting=False)


def build(sources_dir: str, out: str) -> None:
    for choice in CHOICES:
        sources = [read_checked(sources_dir, source.file, source.sha256) for source in choice.sources]
        license_text = read_checked(sources_dir, choice.license_file, choice.license_sha256)
        target = os.path.join(out, choice.id)
        if os.path.isdir(target):
            shutil.rmtree(target)
        os.makedirs(target)
        files = full_fonts(choice, sources)
        files[f"{choice.id}.name.woff2"] = preview(choice, sources)
        original = load(sources[0])["name"].getDebugName(16) or load(sources[0])["name"].getDebugName(1) or ""
        family = original.split(" Light")[0].split(" Thin")[0].split(" ExtraLight")[0]
        for name, data in files.items():
            if name.endswith(".name.woff2") or not choice.unchanged:
                require_renamed(data, choice, family)
        files["OFL.txt"] = license_text
        for name, data in files.items():
            with open(os.path.join(target, name), "wb") as handle:
                handle.write(data)
            print(f"{choice.id}/{name}\t{len(data)}\t{sha256_bytes(data)}")


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args(argv)
    build(args.sources, args.out)


if __name__ == "__main__":
    main(sys.argv[1:])
