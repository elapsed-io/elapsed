# Default font: Timer Sans (modified Archivo)

`timer-sans.woff2` is a modified version of **Archivo** by Omnibus-Type, licensed under the
SIL Open Font License 1.1 (`OFL.txt` in this folder, copied unchanged from the source).

## Why the name differs

The plan states that a modified version cannot keep the Archivo name, and the font's name table
says "Archivo is a trademark of Omnibus-Type". Archivo's `OFL.txt` declares no Reserved Font Name,
so the license alone would allow keeping it, but the owner chose to rename (2026-11-14). Every name
the font presents is now "Timer Sans"; the copyright, trademark notice, designer, vendor and license
records are kept, and the description record credits Archivo.

## Source

| | |
| --- | --- |
| Official distribution | Google Fonts, `google/fonts` repository, commit `29b4ec6df2522a8aee279414b78a07910b065874`, file `ofl/archivo/Archivo[wdth,wght].ttf` |
| Upstream (designer's repository) | `Omnibus-Type/Archivo`, commit `b5d63988ce19d044d3e10362de730af00526b672`, file `fonts/variable/Archivo[wdth,wght].ttf` (the commit Google Fonts builds from; the two binaries differ only in the `head` table's timestamps) |
| Version | Archivo 2.001 |
| Source SHA-256 | `0e094a7d3c7c4c25cf1310c4b30014f1dae9332220b1c2c88f4fa996f0b05053` (Google Fonts file) |
| License SHA-256 | `108b4e57c9c796d3d38d0428ca7ee39de47ad93187302718d9b2d8864b9b716b` (identical in both repositories) |
| Downloaded | 2026-11-14 |

## What was changed

- Width axis pinned at 92 (plan, Design system > Type).
- Weight axis kept from 300 to 500: 300 for the time, 400 to 500 for interface text.
- Characters cut down to Basic Latin, Latin-1 Supplement and a short list of punctuation
  (thin space, en and em dashes, curly quotes, bullet, ellipsis, narrow no-break space, primes, minus).
  Anything else falls back to the system font.
- OpenType features kept: the ones browsers apply by default (`ccmp`, `locl`, `rvrn`, `liga`, `kern`,
  `mark`, `mkmk`) plus `tnum` for the time's tabular figures.
- Names changed to "Timer Sans" as described above.

Result: 23,792 bytes, SHA-256 `ef61ef716351ac21c5a5fa07f9929f972908ffe21b651edafb037be774c6b1f4`.

## Rebuilding

The build is deterministic: the same source gives the same bytes.

```bash
curl -fL -o Archivo.ttf "https://raw.githubusercontent.com/google/fonts/29b4ec6df2522a8aee279414b78a07910b065874/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf"
python3 -m venv .fontenv && .fontenv/bin/pip install -r packages/web/scripts/font/requirements.txt
.fontenv/bin/python -I packages/web/scripts/font/build_font.py --source Archivo.ttf --out packages/web/src/assets/fonts/timer-sans.woff2
```

The script refuses a source whose SHA-256 differs from the one above.
