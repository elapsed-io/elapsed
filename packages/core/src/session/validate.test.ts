import { describe, expect, it } from 'vitest';
import { createSession, endSession, pauseSession, resumeSession } from './commands.ts';
import { ID, MINUTE, T0 } from './fixtures.ts';
import { SessionValidationError, migrateSession, parseSession } from './validate.ts';

function valid(): Record<string, unknown> {
  let session = createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' });
  session = pauseSession(session, T0 + 10 * MINUTE);
  session = resumeSession(session, T0 + 12 * MINUTE);
  session = endSession(session, 'user', T0 + 30 * MINUTE);
  return JSON.parse(JSON.stringify(session)) as Record<string, unknown>;
}

const edit = (change: (s: Record<string, unknown>) => void): unknown => {
  const s = valid();
  change(s);
  return s;
};

describe('parseSession', () => {
  it('accepts a stored session and returns a new frozen copy', () => {
    const input = valid();
    const parsed = parseSession(input);
    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
    expect(Object.isFrozen(parsed.segments[0])).toBe(true);
  });

  it('accepts an open session with a running last segment', () => {
    const open = JSON.parse(JSON.stringify(createSession({ id: ID, mode: 'ring', at: T0, timeZone: 'UTC' }))) as unknown;
    expect(parseSession(open).segments).toEqual([{ start: T0, end: null }]);
  });

  const invalid: [string, unknown][] = [
    ['null', null],
    ['an array', []],
    ['a string', 'session'],
    ['a class instance', new (class Imposter {
      readonly schema = 1;
    })()],
    ['another schema', edit((s) => (s['schema'] = 2))],
    ['a missing field', edit((s) => delete s['gaps'])],
    ['an extra field', edit((s) => (s['task'] = 'essay'))],
    ['a __proto__ field', JSON.parse(`{"__proto__":{"x":1},${JSON.stringify(valid()).slice(1)}`)],
    ['an uppercase id', edit((s) => (s['id'] = ID.toUpperCase()))],
    ['a non-UUID id', edit((s) => (s['id'] = '../../etc/passwd'))],
    ['no segments', edit((s) => (s['segments'] = []))],
    ['segments as an object', edit((s) => (s['segments'] = {}))],
    ['a negative time', edit((s) => (s['segments'] = [{ start: -1, end: 5 }]))],
    ['a fractional time', edit((s) => (s['segments'] = [{ start: 1.5, end: 5 }]))],
    ['a string time', edit((s) => (s['segments'] = [{ start: '1', end: 5 }]))],
    ['an unsafe integer', edit((s) => (s['segments'] = [{ start: 2 ** 53, end: null }]))],
    ['a segment ending before it starts', edit((s) => (s['segments'] = [{ start: 10, end: 5 }]))],
    ['overlapping segments', edit((s) => (s['segments'] = [{ start: 0, end: 10 }, { start: 5, end: 20 }]))],
    ['a running segment before the last', edit((s) => (s['segments'] = [{ start: 0, end: null }, { start: 5, end: 20 }]))],
    ['a segment with an extra field', edit((s) => (s['segments'] = [{ start: T0, end: T0 + 1, note: 'x' }]))],
    ['too many segments', edit((s) => (s['segments'] = Array.from({ length: 10_001 }, (_, i) => ({ start: i, end: i }))))],
    ['ended with a running segment', edit((s) => (s['segments'] = [{ start: T0, end: null }]))],
    ['an unknown end reason', edit((s) => (s['endReason'] = 'bored'))],
    ['no modes', edit((s) => (s['modes'] = []))],
    ['a bad mode id', edit((s) => (s['modes'] = [{ mode: 'Ring<b>', start: T0 }]))],
    ['a first mode after the start', edit((s) => (s['modes'] = [{ mode: 'digits', start: T0 + 1 }]))],
    ['modes out of order', edit((s) => (s['modes'] = [{ mode: 'digits', start: T0 }, { mode: 'ring', start: T0 - 1 }]))],
    ['a gap before the session', edit((s) => (s['gaps'] = [{ start: T0 - 10, end: T0 }]))],
    ['a reversed gap', edit((s) => (s['gaps'] = [{ start: T0 + 10, end: T0 + 5 }]))],
    ['overlapping gaps', edit((s) => (s['gaps'] = [{ start: T0, end: T0 + 10 }, { start: T0 + 5, end: T0 + 20 }]))],
    ['a malformed local day', edit((s) => (s['localDay'] = '2026-11-6'))],
    ['an impossible local day', edit((s) => (s['localDay'] = '2026-02-30'))],
  ];

  it.each(invalid)('rejects %s', (_label, value) => {
    expect(() => parseSession(value)).toThrow(SessionValidationError);
  });

  it('rejects accessor fields without running them', () => {
    const input = valid();
    let ran = false;
    Object.defineProperty(input, 'id', {
      enumerable: true,
      get: () => {
        ran = true;
        return ID;
      },
    });
    expect(() => parseSession(input)).toThrow(SessionValidationError);
    expect(ran).toBe(false);
  });

  it('names the problem', () => {
    try {
      parseSession(edit((s) => (s['segments'] = [{ start: 10, end: 5 }])));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(SessionValidationError);
      expect((error as SessionValidationError).path).toBe('segments[0]');
    }
  });
});

describe('migrateSession', () => {
  it('reads schema 1', () => {
    expect(migrateSession(valid()).id).toBe(ID);
  });

  it.each([undefined, null, {}, { schema: 0 }, { schema: 2 }, { schema: '1' }, { schema: 'constructor' }])(
    'rejects unsupported data %j',
    (value) => {
      expect(() => migrateSession(value)).toThrow(SessionValidationError);
    },
  );
});
