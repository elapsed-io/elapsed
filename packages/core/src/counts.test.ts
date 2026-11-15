import { describe, expect, it } from 'vitest';
import { COUNT_EVENTS, countBody, parseCountBody } from './counts.ts';

describe('count bodies', () => {
  it('round-trip every event', () => {
    for (const event of COUNT_EVENTS) expect(parseCountBody(countBody(event))).toBe(event);
  });

  it('accept nothing else', () => {
    for (const body of [
      '',
      'visit',
      'null',
      '[]',
      '{"event":"visits"}',
      '{"event":"visit","id":"x"}',
      '{"Event":"visit"}',
      '{"event":["visit"]}',
      '{"__proto__":{"event":"visit"}}',
      '"{\\"event\\":\\"visit\\"}"',
    ]) {
      expect(parseCountBody(body), body).toBeNull();
    }
  });
});
