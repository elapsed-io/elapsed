/**
 * The custom CSS rules (plan, Custom CSS safety; owner changes, item 11),
 * kept as data in `core` so the site now and, from Release 5, the server
 * check CSS the same way, each with its own parser.
 *
 * The site parses with the browser's CSS parser and walks the rules: only
 * style rules and the at-rules in `keptAtRules` survive (so @import,
 * @font-face and @namespace never do), and every declaration must pass
 * `checkDeclaration`, which refuses anything that could load a resource other
 * than a small data: image. `isCleanCss` reads the text itself with
 * `scanCss`, a small tokenizer, so text the parser silently skips (an @import
 * in a constructed stylesheet, an invalid declaration) is never kept either.
 * The CSP blocks remote loads even if a check were missed.
 */

import { CONFIG } from './config.ts';
import { utf8Bytes } from './utf8.ts';

export const CUSTOM_CSS_RULES = {
  /** Larger input is refused, not cut (UTF-8 bytes). */
  maxBytes: CONFIG.device.customCssMaxBytes,
  /** At-rules kept, with their contents checked. Every other at-rule is removed with its contents. */
  keptAtRules: ['media', 'supports', 'container', 'layer', 'keyframes', 'scope', 'starting-style'],
  /** Functions that can load a resource or run code; never kept. `url()` is allowed only for a small data: image. */
  blockedFunctions: ['src', 'image', 'image-set', '-webkit-image-set', 'cross-fade', '-webkit-cross-fade', 'element', '-moz-element', 'expression'],
  dataImage: {
    mediaTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'],
    /** Decoded size. */
    maxBytes: CONFIG.device.customCssDataImageMaxBytes,
  },
  /** Properties that once ran code in some browser; never kept. */
  blockedProperties: ['behavior', '-moz-binding'],
} as const;

export function isKeptAtRule(name: string): boolean {
  return (CUSTOM_CSS_RULES.keptAtRules as readonly string[]).includes(name.toLowerCase());
}

function isBlockedFunction(name: string): boolean {
  return (CUSTOM_CSS_RULES.blockedFunctions as readonly string[]).includes(name.toLowerCase());
}

/** The decoded size of a data: URL's payload, or null if it is not a data URL of an allowed image type. */
export function dataImageBytes(url: string): number | null {
  const match = /^data:([a-z]+\/[a-z0-9.+-]+)((?:;[a-z0-9-]+=[^;,]*)*)(;base64)?,(.*)$/is.exec(url.trim());
  if (match === null) return null;
  const [, type = '', , base64, payload = ''] = match;
  if (!(CUSTOM_CSS_RULES.dataImage.mediaTypes as readonly string[]).includes(type.toLowerCase())) return null;
  if (base64 !== undefined) {
    const clean = payload.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return null;
    return Math.floor((clean.length * 3) / 4) - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0);
  }
  try {
    return utf8Bytes(decodeURIComponent(payload));
  } catch {
    return null;
  }
}

/** Whether `url()` may keep this address: only a small data: image. */
export function isAllowedUrl(url: string): boolean {
  const size = dataImageBytes(url);
  return size !== null && size <= CUSTOM_CSS_RULES.dataImage.maxBytes;
}

// ---- Scanning ---------------------------------------------------------------

/** What a piece of CSS text names, as the CSS tokenizer reads it: escapes undone, comments and strings skipped. */
export interface CssScan {
  /** At-keywords, lowercased (`@\69mport` is "import"). */
  readonly atRules: readonly string[];
  /** Function names, lowercased. */
  readonly functions: readonly string[];
  /** The address in each `url()`; a malformed one is kept as read, so it never passes. */
  readonly urls: readonly string[];
}

const NEWLINE = /[\n]/;
const WHITESPACE = /[ \t\n]/;
const HEX_DIGIT = /[0-9a-fA-F]/;
const DIGIT = /[0-9]/;

function isNameStart(character: string): boolean {
  return /[A-Za-z_]/.test(character) || character.charCodeAt(0) >= 0x80;
}

function isNameCharacter(character: string): boolean {
  return /[A-Za-z0-9_-]/.test(character) || character.charCodeAt(0) >= 0x80;
}

function isValidEscape(text: string, index: number): boolean {
  return text[index] === '\\' && index + 1 < text.length && !NEWLINE.test(text[index + 1] ?? '');
}

/** Reads an escape whose backslash is at `index - 1`. */
function readEscape(text: string, index: number): [string, number] {
  let end = index;
  while (end < text.length && end - index < 6 && HEX_DIGIT.test(text[end] ?? '')) end += 1;
  if (end > index) {
    const code = Number.parseInt(text.slice(index, end), 16);
    if (WHITESPACE.test(text[end] ?? '')) end += 1;
    const valid = code !== 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
    return [valid ? String.fromCodePoint(code) : '�', end];
  }
  const code = text.codePointAt(index) ?? 0xfffd;
  const character = String.fromCodePoint(code);
  return [character, index + character.length];
}

function startsName(text: string, index: number): boolean {
  const character = text[index] ?? '';
  if (character === '-') {
    const next = text[index + 1] ?? '';
    return next === '-' || (next !== '' && isNameStart(next)) || isValidEscape(text, index + 1);
  }
  if (character !== '' && isNameStart(character)) return true;
  return isValidEscape(text, index);
}

function readName(text: string, index: number): [string, number] {
  let name = '';
  let at = index;
  while (at < text.length) {
    const character = text[at] ?? '';
    if (isNameCharacter(character)) {
      name += character;
      at += 1;
    } else if (isValidEscape(text, at)) {
      const [decoded, next] = readEscape(text, at + 1);
      name += decoded;
      at = next;
    } else {
      break;
    }
  }
  return [name, at];
}

/** Reads a string whose opening quote is at `index`. An unescaped newline ends it (a bad string). */
function readString(text: string, index: number): [string, number] {
  const quote = text[index];
  let value = '';
  let at = index + 1;
  while (at < text.length) {
    const character = text[at] ?? '';
    if (character === quote) return [value, at + 1];
    if (NEWLINE.test(character)) return [value, at];
    if (character === '\\') {
      if (at + 1 >= text.length) {
        at += 1;
      } else if (NEWLINE.test(text[at + 1] ?? '')) {
        at += 2;
      } else {
        const [decoded, next] = readEscape(text, at + 1);
        value += decoded;
        at = next;
      }
      continue;
    }
    value += character;
    at += 1;
  }
  return [value, at];
}

/** Reads an unquoted url's contents after `url(`, to its closing parenthesis. */
function readUrl(text: string, index: number): [string, number] {
  let value = '';
  let at = index;
  while (at < text.length) {
    const character = text[at] ?? '';
    if (character === ')') return [value, at + 1];
    if (character === '\\' && isValidEscape(text, at)) {
      const [decoded, next] = readEscape(text, at + 1);
      value += decoded;
      at = next;
      continue;
    }
    // Whitespace may only come before the closing parenthesis; anything else makes a bad url, read to its end.
    value += character;
    at += 1;
  }
  return [value, at];
}

function readNumber(text: string, index: number): number {
  let at = index;
  if (text[at] === '+' || text[at] === '-') at += 1;
  while (DIGIT.test(text[at] ?? '')) at += 1;
  if (text[at] === '.' && DIGIT.test(text[at + 1] ?? '')) {
    at += 1;
    while (DIGIT.test(text[at] ?? '')) at += 1;
  }
  const exponent = text[at] === 'e' || text[at] === 'E';
  const sign = text[at + 1] === '+' || text[at + 1] === '-';
  if (exponent && DIGIT.test(text[at + (sign ? 2 : 1)] ?? '')) {
    at += sign ? 2 : 1;
    while (DIGIT.test(text[at] ?? '')) at += 1;
  }
  return at;
}

function startsNumber(text: string, index: number): boolean {
  const character = text[index] ?? '';
  const next = text[index + 1] ?? '';
  if (DIGIT.test(character)) return true;
  if (character === '.') return DIGIT.test(next);
  if (character === '+' || character === '-') return DIGIT.test(next) || (next === '.' && DIGIT.test(text[index + 2] ?? ''));
  return false;
}

/** Reads CSS text as the CSS tokenizer would, collecting at-rules, functions and url() addresses. */
export function scanCss(source: string): CssScan {
  // The tokenizer's preprocessing: one kind of newline, no NUL.
  const text = source.replace(/\r\n?|\f/g, '\n').replace(/\0/g, '�');
  const atRules: string[] = [];
  const functions: string[] = [];
  const urls: string[] = [];
  let at = 0;
  while (at < text.length) {
    const character = text[at] ?? '';
    if (character === '/' && text[at + 1] === '*') {
      const end = text.indexOf('*/', at + 2);
      at = end < 0 ? text.length : end + 2;
    } else if (character === '"' || character === "'") {
      at = readString(text, at)[1];
    } else if (character === '@' && startsName(text, at + 1)) {
      const [name, next] = readName(text, at + 1);
      atRules.push(name.toLowerCase());
      at = next;
    } else if (character === '#') {
      // A hash token (#fff, #id) is never a function.
      at = readName(text, at + 1)[1];
    } else if (startsNumber(text, at)) {
      at = readNumber(text, at);
      if (startsName(text, at)) at = readName(text, at)[1];
    } else if (startsName(text, at)) {
      const [name, next] = readName(text, at);
      at = next;
      if (text[at] !== '(') continue;
      const lower = name.toLowerCase();
      functions.push(lower);
      at += 1;
      if (lower !== 'url') continue;
      while (WHITESPACE.test(text[at] ?? '')) at += 1;
      if (text[at] === '"' || text[at] === "'") {
        const [value, end] = readString(text, at);
        urls.push(value);
        at = end;
      } else {
        const [value, end] = readUrl(text, at);
        urls.push(value.trim());
        at = end;
      }
    } else {
      at += 1;
    }
  }
  return { atRules, functions, urls };
}

/** Whether scanned CSS names only kept at-rules, no blocked function, and only allowed url() addresses. */
export function isCleanScan(scan: CssScan, atRulesAllowed = true): boolean {
  return (
    scan.atRules.every((name) => atRulesAllowed && isKeptAtRule(name)) &&
    !scan.functions.some(isBlockedFunction) &&
    scan.urls.every(isAllowedUrl)
  );
}

/** Whether CSS text, read as text, holds nothing the rules remove. */
export function isCleanCss(text: string): boolean {
  return isCleanScan(scanCss(text));
}

export interface CssDeclaration {
  readonly property: string;
  /** The value, with any `!important`. */
  readonly value: string;
  /** The declaration as written, without its semicolon. */
  readonly text: string;
}

/**
 * Splits a declaration block's text (such as a browser's `style.cssText`) into
 * declarations, at semicolons outside strings, comments and brackets. A
 * browser writes a shorthand whole when it can, so a shorthand is checked,
 * and kept or dropped, as one.
 */
export function splitDeclarations(block: string): CssDeclaration[] {
  const pieces: string[] = [];
  let current = '';
  let depth = 0;
  let at = 0;
  while (at < block.length) {
    const character = block[at] ?? '';
    if (character === '/' && block[at + 1] === '*') {
      const end = block.indexOf('*/', at + 2);
      const stop = end < 0 ? block.length : end + 2;
      current += block.slice(at, stop);
      at = stop;
      continue;
    }
    if (character === '"' || character === "'") {
      const stop = readString(block, at)[1];
      current += block.slice(at, stop);
      at = stop;
      continue;
    }
    if (character === '\\') {
      current += block.slice(at, at + 2);
      at += 2;
      continue;
    }
    if (character === '(' || character === '[' || character === '{') depth += 1;
    else if ((character === ')' || character === ']' || character === '}') && depth > 0) depth -= 1;
    if (character === ';' && depth === 0) {
      pieces.push(current);
      current = '';
    } else {
      current += character;
    }
    at += 1;
  }
  pieces.push(current);
  return pieces
    .map((piece) => piece.trim())
    .filter((piece) => piece !== '')
    .map((text) => {
      const colon = text.indexOf(':');
      return colon < 0 ? { property: text, value: '', text } : { property: text.slice(0, colon).trim(), value: text.slice(colon + 1).trim(), text };
    });
}

/** Whether a declaration may stay. `value` is as the browser's parser serialised it. */
export function checkDeclaration(property: string, value: string): 'keep' | 'drop' {
  const [name] = readName(property.trim(), 0);
  if ((CUSTOM_CSS_RULES.blockedProperties as readonly string[]).includes(name.toLowerCase())) return 'drop';
  // An at-keyword has no place in a value (only a custom property could hold one).
  return isCleanScan(scanCss(value), false) ? 'keep' : 'drop';
}

/** Whether CSS text is within the size limit. */
export function fitsCustomCss(text: string): boolean {
  return utf8Bytes(text) <= CUSTOM_CSS_RULES.maxBytes;
}
