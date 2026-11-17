# Licence: star data

The data in this folder is not code. The GNU General Public License version 3 that covers the rest of this
repository does not cover it.

`hyg-mag5.json` is derived from the HYG database, version 4.1, by David Nash (astronexus), which is licensed
under the Creative Commons Attribution-ShareAlike 4.0 International licence. This derived data is shared under
the same licence; the full text is in `LICENSE` in this folder.

| File | What | Source |
| --- | --- | --- |
| `hyg-mag5.json` | Every star of the HYG database to visual magnitude 5 (1,637 stars, the Sun left out): right ascension in hours, declination in degrees, magnitude and B−V colour index (0.65 where the database has none), rounded to 4, 3, 2 and 2 decimals | HYG database v4.1, `hyg/CURRENT/hygdata_v41.csv` (SHA-256 d9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd), from https://github.com/astronexus/HYG-Database, now kept at https://codeberg.org/astronexus/hyg |

Changes made: rows beyond magnitude 5 and every column but these four removed, values rounded, rows ordered by
magnitude. The site draws the interstellar mode's turning sky from this data; the credit and the licence travel
inside the file itself (its `source` and `licence` fields), so they go wherever the file is served.
