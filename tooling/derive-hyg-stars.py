"""Derives packages/web/src/art/stars/hyg-mag5.json from the HYG database (CC BY-SA 4.0).

Usage: python3 -I tooling/derive-hyg-stars.py path/to/hygdata_v41.csv

Keeps every star to visual magnitude 5 (the Sun left out) with four fields: right ascension in hours,
declination in degrees, magnitude and B-V colour index (0.65 where the database has none), rounded to 4, 3, 2
and 2 decimals, ordered by magnitude. The output carries its source and licence; see the folder's LICENSE.md.
"""

import csv
import json
import sys
from pathlib import Path

MAGNITUDE_LIMIT = 5.0
DEFAULT_COLOUR_INDEX = 0.65
OUT = Path(__file__).resolve().parent.parent / 'packages/web/src/art/stars/hyg-mag5.json'


def main(source: str) -> None:
    stars = []
    with open(source, newline='', encoding='utf-8') as file:
        for row in csv.DictReader(file):
            if row['proper'] == 'Sol':
                continue
            try:
                magnitude = float(row['mag'])
            except ValueError:
                continue
            if magnitude > MAGNITUDE_LIMIT:
                continue
            colour = float(row['ci']) if row['ci'] else DEFAULT_COLOUR_INDEX
            stars.append([round(float(row['ra']), 4), round(float(row['dec']), 3), round(magnitude, 2), round(colour, 2)])
    stars.sort(key=lambda star: (star[2], star[0]))
    data = {
        'source': 'HYG database v4.1 (astronexus), stars to visual magnitude 5, excluding the Sun',
        'licence': 'CC BY-SA 4.0',
        'fields': ['ra hours', 'dec degrees', 'magnitude', 'colour index B-V'],
        'stars': stars,
    }
    OUT.write_text(json.dumps(data, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{len(stars)} stars written to {OUT}')


if __name__ == '__main__':
    main(sys.argv[1])
