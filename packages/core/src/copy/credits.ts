/**
 * The credits page's copy (owner, round 2.11: "a small credits page linked from the settings footer, listing every
 * third-party work the site uses and its license"). The page is static, built with the site (packages/web/build/
 * credits.ts). The brand module's rules apply (brand.ts): lowercase, as the rest of the site. Names of works,
 * people and licences keep their own capitals.
 *
 * Every third-party work the site serves is listed: the default typeface (Archivo, modified and renamed), the twelve
 * font choices, the icons, and the star data the interstellar sky is drawn from. Each licence file ships beside the
 * work in the repository (packages/web/src/assets/fonts, packages/web/src/icons, packages/web/src/art/stars).
 */

export interface CreditedWork {
  /** The work's name, as its authors give it. */
  readonly name: string;
  /** What the site uses it for. */
  readonly use: string;
  /** Its authors, as its licence names them. */
  readonly by: string;
  /** Its licence, by its usual name. */
  readonly licence: string;
  /** The licence's text, at its publisher's address. */
  readonly licenceUrl: string;
  /** Changes the site made, if any. */
  readonly changed?: string;
}

const OFL = { licence: 'SIL Open Font License 1.1', licenceUrl: 'https://openfontlicense.org/open-font-license-official-text/' } as const;

/** One of the font choices, each used as its authors made it, cut to the characters the site shows. */
const choice = (name: string, by: string, licence = OFL.licence): CreditedWork => ({
  name,
  use: 'a font choice in settings',
  by,
  licence,
  licenceUrl: OFL.licenceUrl,
  changed: 'cut down to the characters the site shows and its weights',
});

export const CREDITS_COPY = {
  title: 'credits',
  intro: 'elapsed is built with these works by others, each used under its licence. thank you.',
  /** The column names of each work's lines. */
  labels: { use: 'used for', by: 'by', licence: 'licence', changed: 'changes' },
  back: 'back to the timer',
  works: [
    {
      name: 'Archivo',
      use: 'the default typeface, renamed Timer Sans',
      by: 'The Archivo Project Authors (Omnibus-Type)',
      ...OFL,
      changed: 'renamed, its width set, its weights and characters cut down to what the site shows',
    },
    choice('Barlow Semi Condensed', 'The Barlow Project Authors (Jeremy Tribby)'),
    choice('Saira', 'The Saira Project Authors (Omnibus-Type)'),
    choice('Inter', 'The Inter Project Authors (Rasmus Andersson)'),
    choice('Space Grotesk', 'The Space Grotesk Project Authors (Florian Karsten)'),
    choice('Sora', 'The Sora Project Authors (Jonathan Barnbrook, Julián Moncada)'),
    choice('Manrope', 'The Manrope Project Authors (Mikhail Sharanda)'),
    choice('Outfit', 'The Outfit Project Authors (Smartsheet Inc, Rodrigo Fuenzalida)'),
    choice('IBM Plex Sans', 'IBM Corp. (Mike Abbink, Bold Monday), with Reserved Font Name "Plex"'),
    choice('JetBrains Mono', 'The JetBrains Mono Project Authors (JetBrains, Philipp Nurullin, Konstantin Bulenkov)'),
    choice('IBM Plex Mono', 'IBM Corp. (Mike Abbink, Bold Monday), with Reserved Font Name "Plex"'),
    choice('Roboto Mono', 'The Roboto Mono Project Authors (Christian Robertson)'),
    choice('DM Mono', 'The DM Mono Project Authors (Colophon Foundry)'),
    {
      name: 'Tabler Icons',
      use: 'the icons',
      by: 'Paweł Kuna',
      licence: 'MIT License',
      licenceUrl: 'https://opensource.org/license/mit',
    },
    {
      name: 'HYG database, version 4.1',
      use: 'the stars of the interstellar sky',
      by: 'David Nash (astronexus)',
      licence: 'Creative Commons Attribution-ShareAlike 4.0 International',
      licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      changed: 'the stars to magnitude 5 kept, drawn as images of the sky, shared under the same licence',
    },
  ] satisfies readonly CreditedWork[],
} as const;
