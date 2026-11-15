/**
 * Validation for sessions read back from storage, synced from another device
 * or uploaded to the server (plan, Principles > Safe: "data read back from
 * storage" is input). The result is always a new frozen object built field by
 * field; the input object is never returned or trusted.
 *
 * migrateSession is the entry point for stored data: it reads the schema
 * number and runs the matching migration (invariant 10). Schema 1 is current.
 */

import { CONFIG } from '../config.ts';
import { SESSION_ID_PATTERN, SESSION_SCHEMA, freezeSession, isEndReason, isModeId, isTime } from './session.ts';
import type { EndReason, Gap, ModeSpan, Segment, Session } from './session.ts';

export class SessionValidationError extends Error {
  override readonly name = 'SessionValidationError';
  readonly path: string;

  constructor(path: string, problem: string) {
    super(`${path}: ${problem}`);
    this.path = path;
  }
}

type Fields = Readonly<Record<string, unknown>>;

function plainObject(value: unknown, path: string, keys: readonly string[]): Fields {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new SessionValidationError(path, 'expected an object');
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new SessionValidationError(path, 'expected a plain object');
  }
  const own = Reflect.ownKeys(value);
  for (const key of own) {
    if (typeof key !== 'string' || !keys.includes(key)) {
      throw new SessionValidationError(path, `unexpected field ${String(key)}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new SessionValidationError(`${path}.${key}`, 'expected a data field');
    }
  }
  for (const key of keys) {
    if (!own.includes(key)) throw new SessionValidationError(path, `missing field ${key}`);
  }
  return value as Fields;
}

function list(value: unknown, path: string, max: number): readonly unknown[] {
  if (!Array.isArray(value)) throw new SessionValidationError(path, 'expected a list');
  if (value.length > max) throw new SessionValidationError(path, `more than ${String(max)} entries`);
  return value;
}

function time(value: unknown, path: string): number {
  if (!isTime(value)) throw new SessionValidationError(path, 'expected a whole, non-negative number of milliseconds');
  return value;
}

function parseSegments(value: unknown): Segment[] {
  const items = list(value, 'segments', CONFIG.session.limits.maxSegments);
  if (items.length === 0) throw new SessionValidationError('segments', 'a session has at least one segment');
  const segments: Segment[] = [];
  let previousEnd = 0;
  items.forEach((item, index) => {
    const path = `segments[${String(index)}]`;
    const fields = plainObject(item, path, ['start', 'end']);
    const start = time(fields['start'], `${path}.start`);
    const end = fields['end'] === null ? null : time(fields['end'], `${path}.end`);
    if (start < previousEnd) throw new SessionValidationError(path, 'starts before the previous segment ends');
    if (end !== null && end < start) throw new SessionValidationError(path, 'ends before it starts');
    if (end === null && index !== items.length - 1) throw new SessionValidationError(path, 'only the last segment can be running');
    segments.push({ start, end });
    previousEnd = end ?? start;
  });
  return segments;
}

function parseGaps(value: unknown, sessionStart: number): Gap[] {
  const items = list(value, 'gaps', CONFIG.session.limits.maxGaps);
  const gaps: Gap[] = [];
  let previousEnd = sessionStart;
  items.forEach((item, index) => {
    const path = `gaps[${String(index)}]`;
    const fields = plainObject(item, path, ['start', 'end']);
    const start = time(fields['start'], `${path}.start`);
    const end = time(fields['end'], `${path}.end`);
    if (start < previousEnd) throw new SessionValidationError(path, 'overlaps an earlier gap or precedes the session');
    if (end < start) throw new SessionValidationError(path, 'ends before it starts');
    gaps.push({ start, end });
    previousEnd = end;
  });
  return gaps;
}

function parseModes(value: unknown, sessionStart: number): ModeSpan[] {
  const items = list(value, 'modes', CONFIG.session.limits.maxModeSpans);
  if (items.length === 0) throw new SessionValidationError('modes', 'a session has at least one mode');
  const modes: ModeSpan[] = [];
  let previousStart = sessionStart;
  items.forEach((item, index) => {
    const path = `modes[${String(index)}]`;
    const fields = plainObject(item, path, ['mode', 'start']);
    const mode = fields['mode'];
    if (!isModeId(mode)) throw new SessionValidationError(`${path}.mode`, 'expected a display mode id');
    const start = time(fields['start'], `${path}.start`);
    if (index === 0 && start !== sessionStart) throw new SessionValidationError(path, 'the first mode starts with the session');
    if (start < previousStart) throw new SessionValidationError(path, 'starts before the previous mode');
    modes.push({ mode, start });
    previousStart = start;
  });
  return modes;
}

function parseLocalDay(value: unknown): string {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (match === null) throw new SessionValidationError('localDay', 'expected YYYY-MM-DD');
  const [, year = '', month = '', day = ''] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid =
    date.getUTCFullYear() === Number(year) && date.getUTCMonth() + 1 === Number(month) && date.getUTCDate() === Number(day);
  if (!valid) throw new SessionValidationError('localDay', 'not a calendar date');
  return match[0];
}

const SESSION_FIELDS = ['schema', 'id', 'segments', 'gaps', 'modes', 'endReason', 'localDay'] as const;

/** Validates a schema-1 session. Throws SessionValidationError naming the first problem found. */
export function parseSession(value: unknown): Session {
  const fields = plainObject(value, 'session', SESSION_FIELDS);
  if (fields['schema'] !== SESSION_SCHEMA) throw new SessionValidationError('schema', `expected ${String(SESSION_SCHEMA)}`);
  const id = fields['id'];
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) throw new SessionValidationError('id', 'expected a lowercase UUID');
  const segments = parseSegments(fields['segments']);
  const sessionStart = segments[0]?.start ?? 0;
  const gaps = parseGaps(fields['gaps'], sessionStart);
  const modes = parseModes(fields['modes'], sessionStart);
  const rawReason = fields['endReason'];
  if (rawReason !== null && !isEndReason(rawReason)) throw new SessionValidationError('endReason', 'not an end reason');
  const endReason: EndReason | null = rawReason;
  if (endReason !== null && segments.at(-1)?.end === null) {
    throw new SessionValidationError('endReason', 'an ended session cannot have a running segment');
  }
  const localDay = parseLocalDay(fields['localDay']);
  return freezeSession({ schema: SESSION_SCHEMA, id, segments, gaps, modes, endReason, localDay });
}

/** Migrations from each stored schema to the current one. */
const MIGRATIONS: Readonly<Record<number, (value: unknown) => Session>> = {
  1: parseSession,
};

/** Reads a stored session of any supported schema and returns a valid current one. */
export function migrateSession(value: unknown): Session {
  const schema =
    value !== null && typeof value === 'object' && Object.hasOwn(value, 'schema')
      ? (value as Fields)['schema']
      : undefined;
  const migrate = typeof schema === 'number' && Object.hasOwn(MIGRATIONS, schema) ? MIGRATIONS[schema] : undefined;
  if (migrate === undefined) throw new SessionValidationError('schema', `unsupported schema ${String(schema)}`);
  return migrate(value);
}
