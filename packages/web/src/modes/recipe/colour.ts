/**
 * A recipe's colours as CSS: a hex value as it is, a theme token as the theme's custom property, so a recipe
 * follows the theme and custom CSS without naming either. Recipes hold nothing else (the schema refuses url(),
 * expressions and names), and this maps only the tokens it knows.
 */

const TOKENS: Readonly<Record<string, string>> = {
  'theme.bg': 'var(--color-background)',
  'theme.text': 'var(--color-foreground)',
  'theme.accent': 'var(--color-accent)',
  'theme.muted': 'var(--color-muted)',
  'theme.faint': 'var(--color-faint)',
  'theme.track': 'var(--color-track)',
  'theme.gray': 'var(--color-muted)',
  'theme.end': 'var(--color-end)',
  'theme.pr': 'var(--color-accent)',
  'contrast.text': 'var(--color-foreground)',
  'contrast.muted': 'var(--color-muted)',
};

const HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;

export function colourCss(colour: string | undefined, fallback: string): string {
  if (colour === undefined) return fallback;
  if (HEX.test(colour)) return colour;
  return TOKENS[colour] ?? fallback;
}
