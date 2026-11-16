# Built-in font choices

The settings font grid offers Archivo (the default, `../timer-sans.woff2`) and the twelve fonts in this
folder (plan, Loading and performance > Fonts; owner changes, item 7). Each font's folder holds its
license file, copied unchanged from its source, the full font, downloaded only when the font is chosen,
and `<id>.name.woff2`, a preview holding only the letters of the font's name (and an ellipsis) at weight 400, loaded when
the appearance category first opens.

**Lexend is not offered.** It has no tabular figures: its digits range from 500 to 620 units wide and it
has no `tnum` feature, so the time would shift as digits change. The plan drops such a font.

## Sources

| Font | Designer | Source | License |
| --- | --- | --- | --- |
| Barlow Semi Condensed | Jeremy Tribby | Google Fonts | OFL 1.1 |
| Saira | Omnibus-Type | Google Fonts | OFL 1.1 |
| Inter | Rasmus Andersson | Google Fonts | OFL 1.1 |
| Space Grotesk | Florian Karsten | Google Fonts | OFL 1.1 |
| Sora | Jonathan Barnbrook, Julián Moncada | Google Fonts | OFL 1.1 |
| Manrope | Mikhail Sharanda | Google Fonts | OFL 1.1 |
| Outfit | Smartsheet Inc, Rodrigo Fuenzalida | Google Fonts | OFL 1.1 |
| IBM Plex Sans | IBM Corp. (Mike Abbink, Bold Monday) | IBM, npm `@ibm/plex-sans` 1.1.0 | OFL 1.1, Reserved Font Name "Plex" |
| JetBrains Mono | JetBrains, Philipp Nurullin, Konstantin Bulenkov | Google Fonts | OFL 1.1 |
| IBM Plex Mono | IBM Corp. (Mike Abbink, Bold Monday) | IBM, npm `@ibm/plex-mono` 2.5.0 | OFL 1.1, Reserved Font Name "Plex" |
| Roboto Mono | Christian Robertson | Google Fonts | OFL 1.1 |
| DM Mono | Colophon Foundry | Google Fonts | OFL 1.1 |

- **Google Fonts:** the `google/fonts` repository at commit `29b4ec6df2522a8aee279414b78a07910b065874`
  (the same commit as the default font), `ofl/<family>/`: the upright variable font where there is one
  (`Saira[wdth,wght].ttf`, `Inter[opsz,wght].ttf`, `SpaceGrotesk[wght].ttf`, `Sora[wght].ttf`,
  `Manrope[wght].ttf`, `Outfit[wght].ttf`, `JetBrainsMono[wght].ttf`, `RobotoMono[wght].ttf`), otherwise
  the Light, Regular and Medium static files, and `OFL.txt`. Downloaded 2026-11-16.
- **IBM Plex:** `fonts/split/woff2/IBMPlex{Sans,Mono}-{Light,Regular,Medium}-Latin1.woff2` and
  `LICENSE.txt` from the npm packages above (integrity
  `sha512-WPgvO6Yfj2w5YbhyAr1tv95RUz4LRJlqN+CmYvBglabXteufP1D1E9BABMde+ZIKdRbFJDoKF5eQzfhpnbgZcQ==` and
  `sha512-STBJIPxPomOYPmBMO7z5TKPJUotAF9u3gAUumTqVgwgrAO+K4FRNh0MlhsoJjKhJKsMbBJR10/bk4inkj/wc1w==`).
  IBM's `LICENSE.txt` is identical to the `OFL.txt` Google Fonts ships for Plex.

Every source's SHA-256 is pinned in `packages/web/scripts/font/build_choices.py`, which refuses any
other input.

## What was changed

- **IBM Plex Sans and IBM Plex Mono: nothing.** Their license reserves the name "Plex", which no
  modified version may use, so the full fonts are IBM's own Latin-1 web files, byte for byte. They lack
  the thin space, the narrow no-break space and the prime, which fall back to the default font.
- **The other ten:** cut down like the default font: the weight axis kept from 300 to 500 (or the
  Light, Regular and Medium files), other axes pinned at their defaults (Saira's width at 100) except
  Inter's optical size, which is kept so the large time uses Inter's display design; Basic Latin,
  Latin-1 Supplement and the default font's punctuation list; the features browsers apply by default
  plus `tnum`.
- **Names:** following the owner's choice for Archivo (a modified version does not keep the original
  name), every name a modified file presents is replaced: "Timer Alt 01" to "Timer Alt 12" for the
  full fonts and "Timer Alt 01 Preview" to "Timer Alt 12 Preview" for the name previews, numbered in the
  grid's order. The copyright, trademark, designer, vendor and license records are kept, and the
  description record names the original font. The settings grid labels each choice with its original
  family name, in lowercase, as a reference to the font it is based on.
- **Name previews:** a static instance at weight 400 (other axes at their defaults), holding only the
  characters of the lowercase name and the ellipsis (a long name is cut short with the font's own "…"),
  and no hinting, since they are drawn at 12 px only. These are
  modified versions of every font, Plex included, and are renamed like the rest.
- **Checks:** every full font has digits of one width with tabular figures applied, at weights 300, 400
  and 500 and at both ends of any other axis kept, or the build fails.

## Files

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `barlow-semi-condensed/barlow-semi-condensed-300.woff2` | 19036 | `b6a8345494fdf156075de3ba9dd5d9e8bde815a6156b8312553a2ff1f07e181e` |
| `barlow-semi-condensed/barlow-semi-condensed-400.woff2` | 19140 | `79218aa1dfc5dce467a2f98cade5dc2b4ed066dad28eda220ed45192c05a94b1` |
| `barlow-semi-condensed/barlow-semi-condensed-500.woff2` | 19152 | `ac9650997e6ec344b564ab39071a628ca88f80c638a0b3bef366cddc89165e2d` |
| `barlow-semi-condensed/barlow-semi-condensed.name.woff2` | 2164 | `43bd2d09b656e5b91b53445db0fad2a692f51ba098bf7d348b18e938a82061e0` |
| `barlow-semi-condensed/OFL.txt` | 4377 | `186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f` |
| `saira/saira.woff2` | 18524 | `49adfd64f568f1f4c79493e3f1bd5227e125178f7d6e686f3afdafc4c85a3cdf` |
| `saira/saira.name.woff2` | 1456 | `ea4db30bac3ae897963c02aa9b88d4321902dcdb31bc20b8f357ae8ab103af96` |
| `saira/OFL.txt` | 4386 | `f2665d4718b452b3818a877191355ac884a6b9b419d35408fe7ee487e9e8f30f` |
| `inter/inter.woff2` | 42756 | `dd172ac55660c99e47c012389177e528c796f7e43035ba309190e32e19fe2739` |
| `inter/inter.name.woff2` | 1484 | `414ffb84115d8fbb8d6ffab68a4aef26d67f0771ff19f0afb0e4079c3e891db3` |
| `inter/OFL.txt` | 4377 | `5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57` |
| `space-grotesk/space-grotesk.woff2` | 17848 | `d6c16c63205276e499390429fba8d797f47ad3dd519ed7a0ace9cd7b1e67d3cb` |
| `space-grotesk/space-grotesk.name.woff2` | 1928 | `50ee91b46a0145f4cbfb1a0367fc1c99d54362e24cbf7a44f918f64fbdf2186d` |
| `space-grotesk/OFL.txt` | 4495 | `564ce565c371c5e5bbf286006565a7c9aa55a9f56e7ca58d56e05d649dd61a72` |
| `sora/sora.woff2` | 25264 | `e509bc75003ebec6fca3985fea0873016b793d4f201df3c416897c965d5560af` |
| `sora/sora.name.woff2` | 1332 | `f68c4b9f61aa92bc2ee678964e0612b24bdd42af94b972f03f27363842f79d26` |
| `sora/OFL.txt` | 4385 | `ba0b9729c9428ba79a0459ab8ec575791b51509dbec213e383d0316d37fec299` |
| `manrope/manrope.woff2` | 19668 | `3eb0f1bebab556765b89c43c95f77136a9ab1f01c552100d15dafef647700ac4` |
| `manrope/manrope.name.woff2` | 1600 | `580338e725fdbee0fb8b8d1bf59a8b1fd8693353cb312ec548425f4e086f10c8` |
| `manrope/OFL.txt` | 4387 | `58172e0c0fac2cda8a37b348164bb55e44b0e69051e557e92b1d3f6910141f7b` |
| `outfit/outfit.woff2` | 20568 | `aa7ab4f507b0fb763eff3e56762495c9736db7724969b7cb1b0f6fab63f72ffd` |
| `outfit/outfit.name.woff2` | 1556 | `56408c66be4b8162b061c9860a124172aa820bd49b0fbcf6a6ab1d7b3b07cb15` |
| `outfit/OFL.txt` | 4389 | `c676351bf8576b9aba743cd5eaa8c0e7ee0d51f805d720447b4df4ddb6a2e416` |
| `ibm-plex-sans/ibm-plex-sans-300.woff2` | 22240 | `a21e7db1965d4c7af07213226fb11ccd2f61a87a0045ce1fed7cd22918431144` |
| `ibm-plex-sans/ibm-plex-sans-400.woff2` | 20984 | `b5ad7bd39f996144915f0ad9849a90183b27d8c28ad97ed98af5b1bebc51f6b1` |
| `ibm-plex-sans/ibm-plex-sans-500.woff2` | 21960 | `b5610af04d0d4b5a14a621d96d974b993e945a065db1a8861918f69ef9321934` |
| `ibm-plex-sans/ibm-plex-sans.name.woff2` | 1784 | `5b8b0e06075549faf06ae974987d091595b39d11f2fb0a266943c569291e1d3c` |
| `ibm-plex-sans/OFL.txt` | 4456 | `7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da` |
| `jetbrains-mono/jetbrains-mono.woff2` | 16172 | `a79dbbd63ed7a0ff3d45f7e6f9831337837b0fd8ed05fc2652ec17c74581025f` |
| `jetbrains-mono/jetbrains-mono.name.woff2` | 1736 | `0529e7b43acd419f3f3d2cc01ccf6e0b8ae332256caee88e5ee57b553912ca4b` |
| `jetbrains-mono/OFL.txt` | 4399 | `b2fe5e8987594e9ffd1d2ca52a2f5d73eb8335243893c5d6254b5ad69269591d` |
| `ibm-plex-mono/ibm-plex-mono-300.woff2` | 17504 | `ec38551173e6a194f32916ffc0712cc106aa1456edbbb8867fb8e8e6324d4db4` |
| `ibm-plex-mono/ibm-plex-mono-400.woff2` | 17544 | `e8993d946649b9d01abb1ed06d574b19d8ea3e66b5c3948602db335c44c18e56` |
| `ibm-plex-mono/ibm-plex-mono-500.woff2` | 17868 | `41201b658a328b9d00368215c2f1102770f80b15952ab82631e4006255e6365d` |
| `ibm-plex-mono/ibm-plex-mono.name.woff2` | 1448 | `13642ceedf2cead332c120ffed5351f15b02f29bb2725828820cd7efb0d25282` |
| `ibm-plex-mono/OFL.txt` | 4456 | `7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da` |
| `roboto-mono/roboto-mono.woff2` | 28320 | `d9ceaea08b8b834b4cc31b01641e82cc00c262578a77db44df923de819e6fc7e` |
| `roboto-mono/roboto-mono.name.woff2` | 1500 | `6cff61ac61c945d8722687f2838878c8aa04cc2a49451811acb52e04bb000dd7` |
| `roboto-mono/OFL.txt` | 4395 | `50ab8dd54680d3473f649c9db86fece88434d097c7834475c1c72d2f8c429215` |
| `dm-mono/dm-mono-300.woff2` | 13496 | `629643401faf34833fadb43d18b5b00250f3742ded206c22f41403932b4d25a1` |
| `dm-mono/dm-mono-400.woff2` | 13508 | `1b1bbc8f6857e90154eb720c59711635064148eaeb64d36dd7a53b440ac6ab33` |
| `dm-mono/dm-mono-500.woff2` | 13644 | `deaa76e72ce3ad78583cd0e54971be7926f2625572683d358331a142722bad53` |
| `dm-mono/dm-mono.name.woff2` | 1104 | `0143b6e9174e5ddbe9ef879c06d73a92f2f3e223ab0e35500b4a2ab99dab719f` |
| `dm-mono/OFL.txt` | 4484 | `2bada5ea45c3c63b7f1ea1f88ce9672c9e4f0c42b2c3b7378949084fe55a3066` |

## Rebuilding

The build is deterministic: the same sources give the same bytes.

```bash
mkdir -p font-sources && cd font-sources
C=29b4ec6df2522a8aee279414b78a07910b065874
R=https://raw.githubusercontent.com/google/fonts/$C/ofl
for f in barlowsemicondensed/BarlowSemiCondensed-Light.ttf barlowsemicondensed/BarlowSemiCondensed-Regular.ttf barlowsemicondensed/BarlowSemiCondensed-Medium.ttf dmmono/DMMono-Light.ttf dmmono/DMMono-Regular.ttf dmmono/DMMono-Medium.ttf; do curl -fLO "$R/$f"; done
for f in 'saira/Saira%5Bwdth,wght%5D.ttf' 'inter/Inter%5Bopsz,wght%5D.ttf' 'spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf' 'sora/Sora%5Bwght%5D.ttf' 'manrope/Manrope%5Bwght%5D.ttf' 'outfit/Outfit%5Bwght%5D.ttf' 'jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf' 'robotomono/RobotoMono%5Bwght%5D.ttf'; do curl -fL -o "$(basename "$f" | sed 's/%5B/[/; s/%5D/]/')" "$R/$f"; done
for d in barlowsemicondensed saira inter spacegrotesk sora manrope outfit jetbrainsmono robotomono dmmono; do curl -fL -o "$d-OFL.txt" "$R/$d/OFL.txt"; done
npm pack @ibm/plex-sans@1.1.0 @ibm/plex-mono@2.5.0
mkdir sans mono && tar -xzf ibm-plex-sans-1.1.0.tgz -C sans && tar -xzf ibm-plex-mono-2.5.0.tgz -C mono
cp sans/package/fonts/split/woff2/IBMPlexSans-{Light,Regular,Medium}-Latin1.woff2 mono/package/fonts/split/woff2/IBMPlexMono-{Light,Regular,Medium}-Latin1.woff2 .
cp sans/package/LICENSE.txt plex-sans-LICENSE.txt && cp mono/package/LICENSE.txt plex-mono-LICENSE.txt
cd ..
```

```bash
python3 -m venv .fontenv && .fontenv/bin/pip install -r packages/web/scripts/font/requirements.txt
```

```bash
.fontenv/bin/python -I packages/web/scripts/font/build_choices.py --sources font-sources --out packages/web/src/assets/fonts/choices
```
